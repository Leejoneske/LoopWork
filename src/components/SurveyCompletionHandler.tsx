
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNotifications } from "@/hooks/useNotifications";

interface SurveyCompletionHandlerProps {
  surveyId: string;
  surveyTitle?: string;
  rewardAmount: number;
  onCompletion?: () => void;
  showManualButton?: boolean; // Only show for internal surveys
}

export const SurveyCompletionHandler = ({ 
  surveyId, 
  surveyTitle = "Survey",
  rewardAmount, 
  onCompletion,
  showManualButton = false
}: SurveyCompletionHandlerProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { notifySurveyCompletion } = useNotifications();

  const handleSurveyCompletion = async () => {
    if (!user) return;

    try {
      console.log('Processing survey completion:', { surveyId, rewardAmount, userId: user.id });
      
      // Check if already completed to prevent duplicates
      const { data: existingCompletion } = await supabase
        .from('user_surveys')
        .select('id')
        .eq('user_id', user.id)
        .eq('survey_id', surveyId)
        .eq('status', 'completed')
        .maybeSingle();

      if (existingCompletion) {
        toast({
          title: "Already completed",
          description: "You have already completed this survey.",
          variant: "destructive",
        });
        return;
      }

      // Record survey completion with proper user_id
      const { data: completion, error: completionError } = await supabase
        .from('user_surveys')
        .insert({
          user_id: user.id, // Ensure user_id is set for RLS
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

      // Get current wallet balance
      const { data: wallet, error: walletError } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (walletError) {
        console.error('Error fetching wallet:', walletError);
        throw walletError;
      }

      // Update wallet with new balance
      const newBalance = Number(wallet.balance) + Number(rewardAmount);
      const newTotalEarned = Number(wallet.total_earned) + Number(rewardAmount);

      const { error: updateError } = await supabase
        .from('wallets')
        .update({
          balance: newBalance,
          total_earned: newTotalEarned,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Error updating wallet:', updateError);
        throw updateError;
      }

      console.log('Wallet updated successfully');

      // Update survey completion count
      const { data: currentSurvey, error: surveyFetchError } = await supabase
        .from('surveys')
        .select('current_completions')
        .eq('id', surveyId)
        .single();

      if (!surveyFetchError && currentSurvey) {
        await supabase
          .from('surveys')
          .update({
            current_completions: (currentSurvey.current_completions || 0) + 1
          })
          .eq('id', surveyId);
      }

      // Send notification
      await notifySurveyCompletion(surveyTitle, rewardAmount);

      toast({
        title: "Survey Completed! 🎉",
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

  // Listen for survey completion messages from iframe (for external surveys)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'survey_complete') {
        console.log('Survey completion message received:', event.data);
        handleSurveyCompletion();
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [surveyId, rewardAmount, user]);

  // For manual completion (internal surveys only)
  const handleManualCompletion = () => {
    if (confirm('Mark this survey as completed? This will credit your account.')) {
      handleSurveyCompletion();
    }
  };

  // Only show manual button for internal surveys (when showManualButton is true)
  if (!showManualButton) {
    return (
      <div className="mt-2 p-2 border rounded-lg bg-muted/20">
        <p className="text-xs text-muted-foreground text-center">
          Survey completion will be tracked automatically
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 p-4 border rounded-lg bg-muted/50">
      <p className="text-sm text-muted-foreground mb-2">
        Manual completion for internal testing
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
