-- Fix function search path security issue
CREATE OR REPLACE FUNCTION generate_referral_code() 
RETURNS TEXT AS $$
DECLARE
  code TEXT;
BEGIN
  code := upper(substring(gen_random_uuid()::text from 1 for 8));
  RETURN code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';