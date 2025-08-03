
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Clock, DollarSign, Users } from "lucide-react";
import { SurveyCompletionHandler } from "./SurveyCompletionHandler";

interface Survey {
  id: string;
  title: string;
  description: string;
  reward_amount: number;
  estimated_time: number;
  status: string;
  current_completions: number;
  max_completions: number;
  external_survey_id: string;
}

interface EnhancedSurveyCardProps {
  survey: Survey;
  onSurveyStart?: () => void;
}

export const EnhancedSurveyCard = ({ survey, onSurveyStart }: EnhancedSurveyCardProps) => {
  const [isStarted, setIsStarted] = useState(false);

  const handleStartSurvey = () => {
    setIsStarted(true);
    onSurveyStart?.();
    
    const surveyUrl = survey.external_survey_id.startsWith('http') 
      ? survey.external_survey_id 
      : `https://${survey.external_survey_id}`;
    
    window.open(surveyUrl, '_blank');
  };

  const handleCompletion = () => {
    setIsStarted(false);
    onSurveyStart?.(); // Refresh the survey list
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg leading-tight">{survey.title}</CardTitle>
          <Badge variant={survey.status === "available" ? "default" : "secondary"}>
            {survey.status}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col">
        <p className="text-sm text-muted-foreground mb-4 flex-1">
          {survey.description || "Complete this survey to earn rewards."}
        </p>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1">
              <DollarSign className="h-4 w-4 text-green-600" />
              <span className="font-medium">KES {survey.reward_amount}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4 text-blue-600" />
              <span>{survey.estimated_time} min</span>
            </div>
          </div>
          
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>
              {survey.current_completions}/{survey.max_completions || "∞"} completed
            </span>
          </div>
          
          <div className="space-y-2">
            <Button 
              onClick={handleStartSurvey} 
              className="w-full"
              disabled={survey.status !== "available"}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Start Survey
            </Button>
            
            {isStarted && (
              <SurveyCompletionHandler
                surveyId={survey.id}
                rewardAmount={survey.reward_amount}
                onCompletion={handleCompletion}
              />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
