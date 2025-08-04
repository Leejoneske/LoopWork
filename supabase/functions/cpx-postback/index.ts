
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('CPX Postback received:', req.method, req.url);

    // Parse URL parameters
    const url = new URL(req.url);
    const params = url.searchParams;

    const userId = params.get('user_id');
    const amountLocal = parseFloat(params.get('amount_local') || '0');
    const amountUsd = parseFloat(params.get('amount_usd') || '0');
    const status = parseInt(params.get('status') || '0');
    const transId = params.get('trans_id');
    const offerId = params.get('offer_id');
    const hash = params.get('hash');
    const ipClick = params.get('ip_click');

    console.log('Parsed params:', {
      userId,
      amountLocal,
      amountUsd,
      status,
      transId,
      offerId,
      hash,
      ipClick
    });

    // ✅ FIX: Required parameters
    if (!userId || !transId || !offerId) {
      console.error('Missing required parameters:', { userId, transId, offerId });
      return new Response('Missing required parameters', { 
        status: 400,
        headers: corsHeaders 
      });
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Handle different status codes
    // Status 1 = completion, Status 2 = cancellation/reversal
    if (status === 1) {
      // Survey completed - process reward
      console.log('Processing survey completion for user:', userId);

      // ✅ FIX: Ensure column `external_survey_id` exists in your DB
      const { data: existingCompletion } = await supabase
        .from('user_surveys')
        .select('id')
        .eq('user_id', userId)
        .like('external_survey_id', `%${transId}%`)
        .maybeSingle();

      if (existingCompletion) {
        console.log('Transaction already processed:', transId);
        return new Response('1', {
          status: 200,
          headers: corsHeaders
        });
      }

      // Create or find CPX survey record
      let surveyId = null;
      const { data: existingSurvey } = await supabase
        .from('surveys')
        .select('id')
        .eq('external_survey_id', `CPX-${offerId}`)
        .maybeSingle();

      if (existingSurvey) {
        surveyId = existingSurvey.id;
      } else {
        const { data: newSurvey, error: surveyError } = await supabase
          .from('surveys')
          .insert({
            title: `CPX Survey ${offerId}`,
            description: `External survey from CPX Research (Offer ID: ${offerId})`,
            external_survey_id: `CPX-${offerId}`,
            reward_amount: amountLocal,
            estimated_time: 10,
            status: 'available'
          })
          .select()
          .single();

        if (surveyError) {
          console.error('Error creating survey:', surveyError);
          throw surveyError;
        }
        surveyId = newSurvey.id;
      }

      const { error: completionError } = await supabase
        .from('user_surveys')
        .insert({
          user_id: userId,
          survey_id: surveyId,
          status: 'completed',
          reward_earned: amountLocal,
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          external_survey_id: `CPX-${transId}`  // ✅ This fixes the 400 issue
        });

      if (completionError) {
        console.error('Error recording completion:', completionError);
        throw completionError;
      }

      const { data: wallet, error: walletError } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (walletError) {
        console.error('Error fetching wallet:', walletError);
        throw walletError;
      }

      const newBalance = Number(wallet.balance) + Number(amountLocal);
      const newTotalEarned = Number(wallet.total_earned) + Number(amountLocal);

      const { error: updateError } = await supabase
        .from('wallets')
        .update({
          balance: newBalance,
          total_earned: newTotalEarned,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (updateError) {
        console.error('Error updating wallet:', updateError);
        throw updateError;
      }

      await supabase.rpc('create_notification', {
        p_user_id: userId,
        p_title: 'CPX Survey Completed! 🎉',
        p_message: `Congratulations! You completed a CPX Research survey and earned KES ${amountLocal}.`,
        p_type: 'survey',
        p_data: JSON.stringify({ 
          survey_id: surveyId, 
          reward: amountLocal,
          transaction_id: transId,
          offer_id: offerId
        })
      });

      console.log('Successfully processed CPX completion for user:', userId, 'Amount:', amountLocal);

    } else if (status === 2) {
      // Survey cancelled/reversed - handle reversal if needed
      console.log('Processing survey cancellation for user:', userId, 'Transaction:', transId);
      
      const { data: completion } = await supabase
        .from('user_surveys')
        .select('*')
        .eq('user_id', userId)
        .like('external_survey_id', `%${transId}%`)
        .eq('status', 'completed')
        .maybeSingle();

      if (completion) {
        await supabase
          .from('user_surveys')
          .update({ status: 'cancelled' })
          .eq('id', completion.id);

        const { data: wallet } = await supabase
          .from('wallets')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (wallet) {
          const newBalance = Math.max(0, Number(wallet.balance) - Number(completion.reward_earned));
          const newTotalEarned = Math.max(0, Number(wallet.total_earned) - Number(completion.reward_earned));

          await supabase
            .from('wallets')
            .update({
              balance: newBalance,
              total_earned: newTotalEarned,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', userId);
        }

        await supabase.rpc('create_notification', {
          p_user_id: userId,
          p_title: 'Survey Cancelled ❌',
          p_message: `A CPX Research survey completion was cancelled. KES ${completion.reward_earned} has been deducted from your balance.`,
          p_type: 'survey',
          p_data: JSON.stringify({ 
            transaction_id: transId,
            offer_id: offerId,
            reversed_amount: completion.reward_earned
          })
        });

        console.log('Successfully reversed CPX completion for user:', userId, 'Amount:', completion.reward_earned);
      }
    }

    return new Response('1', {
      status: 200,
      headers: corsHeaders
    });

  } catch (error) {
    console.error('Error processing CPX postback:', error);
    
    return new Response('0', {
      status: 500,
      headers: corsHeaders
    });
  }
});
