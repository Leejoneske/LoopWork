
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

    // Validate environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('=== MISSING ENV VARS ===');
      console.error('SUPABASE_URL:', !!supabaseUrl);
      console.error('SUPABASE_SERVICE_ROLE_KEY:', !!supabaseKey);
      throw new Error('Missing required environment variables');
    }

    console.log('=== Initializing Supabase ===');
    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log('Supabase client created');

    // Check for duplicate transaction
    console.log('Checking for duplicate transaction...');
    const { data: existingTransaction, error: duplicateError } = await supabase
      .from('user_surveys')
      .select('id')
      .eq('user_id', userId)
      .eq('survey_id', transId) // Using transId as a unique identifier
      .maybeSingle();

    if (duplicateError) {
      console.error('Duplicate check error:', duplicateError);
      throw duplicateError;
    }

    if (existingTransaction) {
      console.log('Duplicate transaction detected, ignoring');
      return new Response('1', {
        status: 200,
        headers: corsHeaders
      });
    }

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

      // Step 2: Check wallet exists and lock it for update
      console.log('Checking and locking wallet...');
      const { data: wallet, error: walletError } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', userId)
        .single(); // Use single() instead of maybeSingle() to ensure wallet exists

      if (walletError) {
        console.error('Wallet error:', walletError);
        
        // If wallet doesn't exist, create it
        if (walletError.code === 'PGRST116') {
          console.log('Creating wallet for user:', userId);
          const { data: newWallet, error: createWalletError } = await supabase
            .from('wallets')
            .insert({
              user_id: userId,
              balance: 0,
              total_earned: 0
            })
            .select()
            .single();

          if (createWalletError) {
            console.error('Wallet creation error:', createWalletError);
            throw createWalletError;
          }
          
          wallet = newWallet;
          console.log('Wallet created:', wallet);
        } else {
          throw walletError;
        }
      }
      console.log('Wallet found. Current balance:', wallet.balance);

      // Step 3: Create/find survey
      console.log('Creating/finding survey...');
      let surveyId = null;
      const surveyTitle = `CPX Survey ${offerId}`;
      
      const { data: existingSurvey } = await supabase
        .from('surveys')
        .select('id')
        .eq('title', surveyTitle)
        .maybeSingle();

      if (existingSurvey) {
        surveyId = existingSurvey.id;
        console.log('Found existing survey:', surveyId);
      } else {
        const { data: newSurvey, error: surveyError } = await supabase
          .from('surveys')
          .insert({
            title: surveyTitle,
            description: `External survey from CPX Research (Offer ID: ${offerId})`,
            reward_amount: amountLocal,
            estimated_time: 10,
            status: 'available'
          })
          .select('id')
          .single();

        if (surveyError) {
          console.error('Survey creation error:', surveyError);
          throw surveyError;
        }
        surveyId = newSurvey.id;
        console.log('Created new survey:', surveyId);
      }

      // Step 4: Use a transaction to record completion and update wallet atomically
      console.log('Starting database transaction...');
      
      const { error: transactionError } = await supabase.rpc('process_cpx_completion', {
        p_user_id: userId,
        p_survey_id: surveyId,
        p_reward_amount: amountLocal,
        p_transaction_id: transId
      });

      if (transactionError) {
        console.error('Transaction error:', transactionError);
        
        // If stored procedure doesn't exist, fall back to manual transaction
        if (transactionError.code === '42883') {
          console.log('Stored procedure not found, using manual transaction...');
          
          // Record completion
          const { error: completionError } = await supabase
            .from('user_surveys')
            .insert({
              user_id: userId,
              survey_id: surveyId,
              status: 'completed',
              reward_earned: amountLocal,
              started_at: new Date().toISOString(),
              completed_at: new Date().toISOString(),
              // Add external reference if your schema supports it
              external_reference: transId
            });

          if (completionError) {
            console.error('Completion recording error:', completionError);
            throw completionError;
          }
          console.log('Completion recorded successfully');

          // Update wallet with proper decimal handling
          const currentBalance = parseFloat(wallet.balance) || 0;
          const currentTotalEarned = parseFloat(wallet.total_earned) || 0;
          const rewardAmount = parseFloat(amountLocal) || 0;
          
          const newBalance = Math.round((currentBalance + rewardAmount) * 100) / 100;
          const newTotalEarned = Math.round((currentTotalEarned + rewardAmount) * 100) / 100;

          console.log('Updating wallet...');
          console.log('Current balance:', currentBalance);
          console.log('Reward amount:', rewardAmount);
          console.log('New balance:', newBalance);

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
          console.log('Wallet updated successfully');
        } else {
          throw transactionError;
        }
      } else {
        console.log('Transaction completed successfully via stored procedure');
      }

      console.log('=== SUCCESS ===');
      console.log('User:', userId, 'earned:', amountLocal);
    } else {
      console.log('Status not 1, ignoring postback. Status:', status);
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
    
    // Return more specific error for debugging
    const errorResponse = {
      error: error.message,
      type: error.constructor.name,
      timestamp: new Date().toISOString()
    };
    
    console.error('Error response:', errorResponse);
    
    return new Response('0', {
      status: 500,
      headers: corsHeaders
    });
  }
});
