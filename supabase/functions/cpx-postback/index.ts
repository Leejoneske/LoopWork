
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
    console.log('=== CPX Postback Debug Started ===');
    console.log('Method:', req.method);
    console.log('URL:', req.url);

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

    console.log('=== Parsed Parameters ===');
    console.log('userId:', userId);
    console.log('amountLocal:', amountLocal);
    console.log('amountUsd:', amountUsd);
    console.log('status:', status);
    console.log('transId:', transId);
    console.log('offerId:', offerId);
    console.log('hash:', hash);
    console.log('ipClick:', ipClick);

    // Check required parameters
    if (!userId || !transId || !offerId) {
      console.log('=== MISSING REQUIRED PARAMS ===');
      console.log('Missing:', { userId: !userId, transId: !transId, offerId: !offerId });
      return new Response('Missing required parameters', { 
        status: 400,
        headers: corsHeaders 
      });
    }

    console.log('=== Initializing Supabase ===');
    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    console.log('Supabase client created');

    // Only process status 1 for now (completion)
    if (status === 1) {
      console.log('=== Processing Completion ===');

      // Step 1: Check if user exists
      console.log('Checking if user exists...');
      const { data: userCheck, error: userError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .maybeSingle();
      
      if (userError) {
        console.error('User check error:', userError);
        throw userError;
      }
      
      if (!userCheck) {
        console.log('User not found:', userId);
        return new Response('User not found', { 
          status: 404,
          headers: corsHeaders 
        });
      }
      console.log('User found:', userCheck.id);

      // Step 2: Check wallet exists
      console.log('Checking wallet...');
      const { data: wallet, error: walletError } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (walletError) {
        console.error('Wallet error:', walletError);
        throw walletError;
      }

      if (!wallet) {
        console.log('Wallet not found for user:', userId);
        return new Response('Wallet not found', { 
          status: 404,
          headers: corsHeaders 
        });
      }
      console.log('Wallet found. Current balance:', wallet.balance);

      // Step 3: Create/find survey (simplified)
      console.log('Creating/finding survey...');
      let surveyId = null;
      const { data: existingSurvey } = await supabase
        .from('surveys')
        .select('id')
        .eq('title', `CPX Survey ${offerId}`)
        .maybeSingle();

      if (existingSurvey) {
        surveyId = existingSurvey.id;
        console.log('Found existing survey:', surveyId);
      } else {
        const { data: newSurvey, error: surveyError } = await supabase
          .from('surveys')
          .insert({
            title: `CPX Survey ${offerId}`,
            description: `External survey from CPX Research (Offer ID: ${offerId})`,
            reward_amount: amountLocal,
            estimated_time: 10,
            status: 'available'
          })
          .select()
          .single();

        if (surveyError) {
          console.error('Survey creation error:', surveyError);
          throw surveyError;
        }
        surveyId = newSurvey.id;
        console.log('Created new survey:', surveyId);
      }

      // Step 4: Record completion (WITHOUT external_survey_id for now)
      console.log('Recording completion...');
      const { error: completionError } = await supabase
        .from('user_surveys')
        .insert({
          user_id: userId,
          survey_id: surveyId,
          status: 'completed',
          reward_earned: amountLocal,
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString()
          // Removed external_survey_id temporarily
        });

      if (completionError) {
        console.error('Completion recording error:', completionError);
        throw completionError;
      }
      console.log('Completion recorded successfully');

      // Step 5: Update wallet
      console.log('Updating wallet...');
      const newBalance = Number(wallet.balance) + Number(amountLocal);
      const newTotalEarned = Number(wallet.total_earned || 0) + Number(amountLocal);

      const { error: updateError } = await supabase
        .from('wallets')
        .update({
          balance: newBalance,
          total_earned: newTotalEarned,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (updateError) {
        console.error('Wallet update error:', updateError);
        throw updateError;
      }
      console.log('Wallet updated. New balance:', newBalance);

      console.log('=== SUCCESS ===');
      console.log('User:', userId, 'earned:', amountLocal);
    }

    return new Response('1', {
      status: 200,
      headers: corsHeaders
    });

  } catch (error) {
    console.error('=== ERROR CAUGHT ===');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    return new Response('0', {
      status: 500,
      headers: corsHeaders
    });
  }
});
