
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SurveyCompletionHandlerProps {
  surveyId: string;
  rewardAmount: number;
  onCompletion?: () => void;
}

export const SurveyCompletionHandler = ({ 
  surveyId, 
  rewardAmount, 
  onCompletion 
}: SurveyCompletionHandlerProps) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const handleSurveyCompletion = async () => {
    if (!user) return;

    try {
      console.log('Processing survey completion:', { surveyId, rewardAmount, userId: user.id });
      
      // Record survey completion
      const { data: completion, error: completionError } = await supabase
        .from('user_surveys')
        .insert({
          user_id: user.id,
          survey_id: surveyId,
          status: 'completed',
          reward_earned: rewardAmount,
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString()
        })
        .select()
        .single();

      if (completionError) {
        console.error('Error recording completion:', completionError);
        throw completionError;
      }

      console.log('Survey completion recorded:', completion);

      // Update wallet
      const { data: wallet, error: walletError } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (walletError) {
        console.error('Error fetching wallet:', walletError);
        throw walletError;
      }

      const { error: updateError } = await supabase
        .from('wallets')
        .update({
          balance: Number(wallet.balance) + Number(rewardAmount),
          total_earned: Number(wallet.total_earned) + Number(rewardAmount),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Error updating wallet:', updateError);
        throw updateError;
      }

      console.log('Wallet updated successfully');

      // Update survey completion count - first get current count
      const { data: currentSurvey, error: surveyFetchError } = await supabase
        .from('surveys')
        .select('current_completions')
        .eq('id', surveyId)
        .single();

      if (surveyFetchError) {
        console.error('Error fetching survey:', surveyFetchError);
        // Don't throw here, wallet update is more important
      } else {
        const { error: surveyUpdateError } = await supabase
          .from('surveys')
          .update({
            current_completions: (currentSurvey.current_completions || 0) + 1
          })
          .eq('id', surveyId);

        if (surveyUpdateError) {
          console.error('Error updating survey count:', surveyUpdateError);
          // Don't throw here, wallet update is more important
        }
      }

      toast({
        title: "Survey Completed!",
        description: `You earned KES ${rewardAmount}! Check your wallet.`,
      });

      onCompletion?.();
    } catch (error: any) {
      console.error('Survey completion error:', error);
      toast({
        title: "Error processing completion",
        description: error.message || "Failed to process survey completion",
        variant: "destructive",
      });
    }
  };

  // Listen for survey completion messages from iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Handle completion messages from external survey providers
      if (event.data && event.data.type === 'survey_complete') {
        console.log('Survey completion message received:', event.data);
        handleSurveyCompletion();
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [surveyId, rewardAmount, user]);

  // For manual completion (button click)
  const handleManualCompletion = () => {
    if (confirm('Mark this survey as completed? This will credit your account.')) {
      handleSurveyCompletion();
    }
  };

  return (
    <div className="mt-4 p-4 border rounded-lg bg-muted/50">
      <p className="text-sm text-muted-foreground mb-2">
        Survey completion tracking is active for this survey.
      </p>
      <button
        onClick={handleManualCompletion}
        className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90"
      >
        Mark as Completed
      </button>
    </div>
  );
};
