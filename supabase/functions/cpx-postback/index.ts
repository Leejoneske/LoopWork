
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// UUID validation helper
function isValidUUID(uuid: string): boolean {
  const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return regex.test(uuid);
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== CPX Postback Handler Started ===');
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
      return new Response(JSON.stringify({
        error: 'Missing required parameters',
        missing: {
          userId: !userId,
          transId: !transId,
          offerId: !offerId
        }
      }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Special handling for test user
    if (userId === 'test123') {
      console.log('=== TEST USER DETECTED ===');
      console.log('Bypassing database operations for test user');
      return new Response('1', {
        status: 200,
        headers: corsHeaders
      });
    }

    // Validate UUID format for production users
    if (!isValidUUID(userId)) {
      console.log('=== INVALID USER ID FORMAT ===');
      return new Response(JSON.stringify({
        error: 'Invalid user ID format',
        details: 'Expected UUID format',
        received: userId
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Validate environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('=== MISSING ENV VARS ===');
      throw new Error(JSON.stringify({
        error: 'Missing environment variables',
        supabaseUrl: !!supabaseUrl,
        supabaseKey: !!supabaseKey
      }));
    }

    console.log('=== Initializing Supabase Client ===');
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      },
      db: {
        schema: 'public'
      }
    });

    // Check for duplicate transaction
    console.log('=== Checking for duplicate transaction ===');
    const { data: existingTransaction, error: duplicateError } = await supabase
      .from('user_surveys')
      .select('id, user_id, survey_id, completed_at')
      .eq('user_id', userId)
      .eq('survey_id', transId)
      .maybeSingle();

    if (duplicateError) {
      console.error('Duplicate check error:', duplicateError);
      throw duplicateError;
    }

    if (existingTransaction) {
      console.log('=== DUPLICATE TRANSACTION FOUND ===');
      console.log('Existing transaction:', existingTransaction);
      return new Response('1', {
        status: 200,
        headers: corsHeaders
      });
    }

    // Only process status 1 (completion)
    if (status === 1) {
      console.log('=== PROCESSING COMPLETION ===');

      // Step 1: Verify user exists
      console.log('Verifying user exists...');
      const { data: user, error: userError } = await supabase
        .from('profiles')
        .select('id, created_at')
        .eq('id', userId)
        .maybeSingle();
      
      if (userError) {
        console.error('User verification error:', userError);
        throw userError;
      }
      
      if (!user) {
        console.log('=== USER NOT FOUND ===');
        return new Response(JSON.stringify({
          error: 'User not found',
          userId: userId
        }), { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      console.log('User verified:', user.id, 'created at:', user.created_at);

      // Step 2: Handle wallet
      console.log('=== PROCESSING WALLET ===');
      let walletBalance = 0;
      let walletTotalEarned = 0;

      // Get or create wallet
      const { data: wallet, error: walletError } = await supabase
        .from('wallets')
        .select('balance, total_earned')
        .eq('user_id', userId)
        .maybeSingle();

      if (walletError) {
        console.error('Wallet error:', walletError);
        throw walletError;
      }

      if (wallet) {
        walletBalance = parseFloat(wallet.balance) || 0;
        walletTotalEarned = parseFloat(wallet.total_earned) || 0;
        console.log('Existing wallet balance:', walletBalance);
      } else {
        console.log('Creating new wallet for user');
        const { error: createError } = await supabase
          .from('wallets')
          .insert({
            user_id: userId,
            balance: 0,
            total_earned: 0
          });
        
        if (createError) {
          console.error('Wallet creation error:', createError);
          throw createError;
        }
        console.log('New wallet created');
      }

      // Step 3: Create survey record if needed
      console.log('=== PROCESSING SURVEY RECORD ===');
      const surveyTitle = `CPX Survey ${offerId}`;
      let surveyId = transId; // Using transaction ID as survey ID

      // Step 4: Record completion and update wallet
      console.log('=== RECORDING COMPLETION ===');
      const completionData = {
        user_id: userId,
        survey_id: surveyId,
        status: 'completed',
        reward_earned: amountLocal,
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        external_reference: transId,
        offer_id: offerId,
        ip_address: ipClick
      };

      console.log('Completion data:', completionData);

      const { error: completionError } = await supabase
        .from('user_surveys')
        .insert(completionData);

      if (completionError) {
        console.error('Completion recording error:', completionError);
        throw completionError;
      }

      // Update wallet with proper decimal handling
      const newBalance = Math.round((walletBalance + amountLocal) * 100) / 100;
      const newTotalEarned = Math.round((walletTotalEarned + amountLocal) * 100) / 100;

      console.log('Updating wallet balance:', {
        oldBalance: walletBalance,
        amountAdded: amountLocal,
        newBalance: newBalance
      });

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

      console.log('=== TRANSACTION COMPLETED SUCCESSFULLY ===');
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
    console.error('Timestamp:', new Date().toISOString());
    console.error('Error:', error);
    
    const errorResponse = {
      error: error.message,
      type: error?.constructor?.name || 'UnknownError',
      stack: error.stack,
      timestamp: new Date().toISOString()
    };
    
    console.error('Error response:', errorResponse);
    
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
