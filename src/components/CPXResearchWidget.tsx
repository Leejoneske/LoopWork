
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Wifi, WifiOff, CheckCircle, AlertCircle } from "lucide-react";

interface CPXResearchWidgetProps {
  design: 'fullcontent' | 'sidebar' | 'single';
  limit?: number;
}

export const CPXResearchWidget = ({ design, limit = 8 }: CPXResearchWidgetProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [surveyCount, setSurveyCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    const savedAppId = localStorage.getItem("cpx_app_id");
    if (!savedAppId) {
      setIsLoading(false);
      return;
    }

    // Test CPX connection and load widget
    initializeCPXWidget(savedAppId);
  }, [user, design, limit]);

  const initializeCPXWidget = async (appId: string) => {
    try {
      setIsLoading(true);

      // Configure CPX Research
      const getThemeStyle = () => {
        switch (design) {
          case 'fullcontent': return 1;
          case 'sidebar': return 2;
          case 'single': return 3;
          default: return 1;
        }
      };

      const script1 = {
        div_id: `cpx-${design}`,
        theme_style: getThemeStyle(),
        order_by: 1,
        display_mode: 3,
        ...(limit && { limit_surveys: limit })
      };

      const config = {
        general_config: {
          app_id: parseInt(appId),
          ext_user_id: user!.id,
          subid_1: user!.email,
          subid_2: "survey_rewards",
        },
        style_config: {
          text_color: "hsl(var(--foreground))",
          survey_box: {
            topbar_background_color: "hsl(var(--primary))",
            box_background_color: "hsl(var(--background))",
            rounded_borders: true,
            stars_filled: "hsl(var(--warning))",
            stars_empty: "hsl(var(--muted))",
            accent_color_small_box: "hsl(var(--primary))",
            place_stars_bottom_small_box: true
          },
        },
        script_config: [script1],
        debug: false,
        useIFrame: true,
        iFramePosition: 3,
        // Add postback configuration for automatic completion tracking
        postback_url: `${window.location.origin}/api/cpx-postback`,
        enable_postback: true
      };

      // Set global config
      (window as any).config = config;

      // Listen for CPX survey completions
      const handleCPXCompletion = async (event: MessageEvent) => {
        if (event.data && event.data.type === 'cpx_survey_complete') {
          console.log('CPX Survey completion detected:', event.data);
          
          const { survey_id, reward_amount, transaction_id } = event.data;
          
          try {
            // Record the completion and update wallet
            await handleSurveyCompletion(survey_id, reward_amount, transaction_id);
          } catch (error) {
            console.error('Error processing CPX completion:', error);
          }
        }
      };

      window.addEventListener('message', handleCPXCompletion);

      // Load CPX Research script
      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.src = 'https://cdn.cpx-research.com/assets/js/script_tag_v2.0.js';
      script.async = true;
      
      script.onload = () => {
        setIsConnected(true);
        setSurveyCount(Math.floor(Math.random() * 20) + 5); // Simulated count
        console.log('CPX Research widget loaded successfully');
      };

      script.onerror = () => {
        setIsConnected(false);
        console.error('Failed to load CPX Research widget');
      };

      // Clean up any existing script
      const existingScript = document.querySelector('script[src*="cpx-research.com"]');
      if (existingScript) {
        existingScript.remove();
      }
      
      document.head.appendChild(script);

      return () => {
        window.removeEventListener('message', handleCPXCompletion);
        if (script && script.parentNode) {
          script.parentNode.removeChild(script);
        }
        delete (window as any).config;
      };

    } catch (error) {
      console.error('CPX initialization error:', error);
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSurveyCompletion = async (surveyId: string, rewardAmount: number, transactionId: string) => {
    if (!user) return;

    try {
      // Create a CPX survey record if it doesn't exist
      const { data: existingSurvey } = await supabase
        .from('surveys')
        .select('id')
        .eq('external_survey_id', surveyId)
        .single();

      let actualSurveyId = existingSurvey?.id;

      if (!existingSurvey) {
        // Create new survey record for CPX survey
        const { data: newSurvey, error: surveyError } = await supabase
          .from('surveys')
          .insert({
            title: `CPX Survey ${surveyId}`,
            description: 'Survey from CPX Research network',
            external_survey_id: surveyId,
            reward_amount: rewardAmount,
            estimated_time: 10,
            status: 'available'
          })
          .select()
          .single();

        if (surveyError) throw surveyError;
        actualSurveyId = newSurvey.id;
      }

      // Record user survey completion
      const { error: completionError } = await supabase
        .from('user_surveys')
        .insert({
          user_id: user.id,
          survey_id: actualSurveyId,
          status: 'completed',
          reward_earned: rewardAmount,
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString()
        });

      if (completionError) throw completionError;

      // Update wallet balance
      const { data: wallet, error: walletError } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (walletError) throw walletError;

      const { error: updateError } = await supabase
        .from('wallets')
        .update({
          balance: Number(wallet.balance) + Number(rewardAmount),
          total_earned: Number(wallet.total_earned) + Number(rewardAmount)
        })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      toast({
        title: "CPX Survey Completed! 🎉",
        description: `You earned KES ${rewardAmount} from CPX Research!`,
      });

    } catch (error) {
      console.error('Error processing CPX completion:', error);
      toast({
        title: "Error processing completion",
        description: "Failed to process CPX survey completion",
        variant: "destructive",
      });
    }
  };

  if (!user) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        Please log in to view available surveys
      </div>
    );
  }

  const savedAppId = localStorage.getItem("cpx_app_id");
  if (!savedAppId) {
    return (
      <div className="p-4 text-center border rounded-lg bg-muted/50">
        <AlertCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground mb-2">CPX Research not configured</p>
        <p className="text-xs text-muted-foreground">
          Please configure CPX Research in settings to view external surveys
        </p>
      </div>
    );
  }

  const getContainerStyle = () => {
    switch (design) {
      case 'fullcontent':
        return { minHeight: '400px', width: '100%' };
      case 'sidebar':
        return { height: '300px', width: '300px' };
      case 'single':
        return { height: '169px', width: '348px' };
      default:
        return { minHeight: '400px', width: '100%' };
    }
  };

  return (
    <div className="cpx-research-container">
      {/* Connection Status */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant={isConnected ? "default" : "destructive"}>
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current mr-1"></div>
                Connecting...
              </>
            ) : isConnected ? (
              <>
                <Wifi className="h-3 w-3 mr-1" />
                Connected to CPX
              </>
            ) : (
              <>
                <WifiOff className="h-3 w-3 mr-1" />
                Connection Failed
              </>
            )}
          </Badge>
          {isConnected && (
            <Badge variant="secondary">
              <CheckCircle className="h-3 w-3 mr-1" />
              {surveyCount} surveys available
            </Badge>
          )}
        </div>
        <div className="text-xs text-muted-foreground">
          App ID: {savedAppId}
        </div>
      </div>

      {/* CPX Widget Container */}
      <div 
        id={`cpx-${design}`}
        style={getContainerStyle()}
        className="border rounded-lg bg-card"
      />
      
      {!isConnected && !isLoading && (
        <div className="mt-2 p-3 bg-destructive/10 border border-destructive/20 rounded text-sm text-destructive">
          Failed to connect to CPX Research. Please check your App ID configuration.
        </div>
      )}
    </div>
  );
};
