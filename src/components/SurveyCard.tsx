import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Star, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface Survey {
  id: string;
  title: string;
  description: string;
  reward_amount: number;
  estimated_time: number;
  status: string;
  current_completions: number;
  max_completions: number;
}

interface SurveyCardProps {
  survey: Survey;
  onSurveyStart?: () => void;
}

export const SurveyCard = ({ survey, onSurveyStart }: SurveyCardProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleStartSurvey = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Check if user already started this survey
      const { data: existingSurvey } = await supabase
        .from("user_surveys")
        .select("*")
        .eq("user_id", user.id)
        .eq("survey_id", survey.id)
        .single();

      if (existingSurvey) {
        toast({
          title: "Survey already started",
          description: "You have already started this survey.",
          variant: "destructive",
        });
        return;
      }

      // Create user survey record
      const { error } = await supabase
        .from("user_surveys")
        .insert({
          user_id: user.id,
          survey_id: survey.id,
          status: "available",
          started_at: new Date().toISOString(),
        });

      if (error) throw error;

      toast({
        title: "Survey started!",
        description: "Redirecting to survey...",
      });

      // Simulate external survey redirect
      setTimeout(() => {
        window.open(`https://survey-provider.com/survey/${survey.id}`, '_blank');
      }, 1000);

      onSurveyStart?.();
    } catch (error: any) {
      toast({
        title: "Error starting survey",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const progress = survey.max_completions 
    ? Math.round((survey.current_completions / survey.max_completions) * 100)
    : 0;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">{survey.title}</CardTitle>
          <Badge variant="secondary" className="bg-success text-success-foreground font-semibold">
            KSh {survey.reward_amount}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground">{survey.description}</p>
        
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {survey.estimated_time} min
          </span>
          <span className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            {survey.current_completions}/{survey.max_completions || "∞"} completed
          </span>
          <span className="flex items-center gap-1">
            <Star className="h-4 w-4" />
            High reward
          </span>
        </div>

        {survey.max_completions && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Progress</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
        
        <Button 
          onClick={handleStartSurvey}
          disabled={loading || progress >= 100}
          className="w-full"
        >
          {loading ? "Starting..." : progress >= 100 ? "Survey Full" : "Start Survey"}
        </Button>
      </CardContent>
    </Card>
  );
};