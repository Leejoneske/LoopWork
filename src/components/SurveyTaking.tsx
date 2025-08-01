
import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Clock, CheckCircle } from "lucide-react";

interface SurveyTakingProps {
  survey: {
    id: string;
    title: string;
    estimated_time: number;
    reward_amount: number;
  };
  onComplete: () => void;
  onClose: () => void;
}

export const SurveyTaking = ({ survey, onComplete, onClose }: SurveyTakingProps) => {
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeElapsed(prev => {
        const newTime = prev + 1;
        const progressPercent = Math.min((newTime / (survey.estimated_time * 60)) * 100, 100);
        setProgress(progressPercent);
        
        // Auto-complete when estimated time is reached
        if (newTime >= survey.estimated_time * 60 && !isCompleted) {
          setIsCompleted(true);
        }
        
        return newTime;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [survey.estimated_time, isCompleted]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleComplete = () => {
    setIsCompleted(true);
    onComplete();
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-lg">{survey.title}</CardTitle>
                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {formatTime(timeElapsed)} / {survey.estimated_time}:00
                  </span>
                  <span className="text-success font-semibold">
                    KSh {survey.reward_amount} reward
                  </span>
                </div>
              </div>
              <Button variant="outline" onClick={onClose} size="sm">
                Close
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>

            {!isCompleted ? (
              <div className="text-center py-12">
                <div className="animate-pulse">
                  <div className="h-4 bg-muted rounded w-3/4 mx-auto mb-4"></div>
                  <div className="h-4 bg-muted rounded w-1/2 mx-auto mb-4"></div>
                  <div className="h-4 bg-muted rounded w-2/3 mx-auto"></div>
                </div>
                <p className="text-muted-foreground mt-6">
                  Survey in progress... This is a simulation of an external survey.
                </p>
                <Button 
                  onClick={handleComplete} 
                  className="mt-4"
                  disabled={progress < 90}
                >
                  {progress < 90 ? `Complete in ${Math.ceil((90 - progress) / 10)} seconds` : "Complete Survey"}
                </Button>
              </div>
            ) : (
              <div className="text-center py-12">
                <CheckCircle className="h-16 w-16 text-success mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-success mb-2">Survey Completed!</h3>
                <p className="text-muted-foreground mb-4">
                  Thank you for completing the survey. Your reward will be added to your wallet.
                </p>
                <div className="bg-success/10 border border-success/20 rounded-lg p-4 mb-4">
                  <p className="text-success font-semibold">
                    Reward Earned: KSh {survey.reward_amount}
                  </p>
                </div>
                <Button onClick={onClose}>
                  Return to Dashboard
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
