
import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Star, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { SurveyTaking } from "./SurveyTaking";

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
  const [showSurveyTaking, setShowSurveyTaking] = useState(false);

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
        description: "Survey is now loading...",
      });

      setShowSurveyTaking(true);
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

  const handleSurveyComplete = async () => {
    if (!user) return;
    
    try {
      // Update survey completion
      const { error: updateError } = await supabase
        .from("user_surveys")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          reward_earned: survey.reward_amount,
        })
        .eq("user_id", user.id)
        .eq("survey_id", survey.id);

      if (updateError) throw updateError;

      // Update wallet balance - directly update the wallets table instead of using RPC
      const { error: walletError } = await supabase
        .from("wallets")
        .update({
          balance: supabase.sql`balance + ${survey.reward_amount}`,
          total_earned: supabase.sql`total_earned + ${survey.reward_amount}`,
          updated_at: new Date().toISOString()
        })
        .eq("user_id", user.id);

      if (walletError) throw walletError;

      toast({
        title: "Congratulations!",
        description: `You earned KSh ${survey.reward_amount}!`,
      });

      setShowSurveyTaking(false);
    } catch (error: any) {
      toast({
        title: "Error completing survey",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const progress = survey.max_completions 
    ? Math.round((survey.current_completions / survey.max_completions) * 100)
    : 0;

  if (showSurveyTaking) {
    return (
      <SurveyTaking
        survey={survey}
        onComplete={handleSurveyComplete}
        onClose={() => setShowSurveyTaking(false)}
      />
    );
  }

  return (
    <Card className="hover:shadow-md transition-shadow h-full flex flex-col">
      <CardHeader className="flex-shrink-0">
        <div className="flex justify-between items-start gap-2">
          <CardTitle className="text-base sm:text-lg leading-tight">{survey.title}</CardTitle>
          <Badge variant="secondary" className="bg-success text-success-foreground font-semibold text-xs sm:text-sm whitespace-nowrap">
            KSh {survey.reward_amount}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4 flex-1 flex flex-col">
        <p className="text-sm text-muted-foreground line-clamp-3">{survey.description}</p>
        
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
            {survey.estimated_time} min
          </span>
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3 sm:h-4 sm:w-4" />
            {survey.current_completions}/{survey.max_completions || "∞"}
          </span>
          <span className="flex items-center gap-1">
            <Star className="h-3 w-3 sm:h-4 sm:w-4" />
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
        
        <div className="mt-auto">
          <Button 
            onClick={handleStartSurvey}
            disabled={loading || progress >= 100}
            className="w-full"
            size="sm"
          >
            {loading ? "Starting..." : progress >= 100 ? "Survey Full" : "Start Survey"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
