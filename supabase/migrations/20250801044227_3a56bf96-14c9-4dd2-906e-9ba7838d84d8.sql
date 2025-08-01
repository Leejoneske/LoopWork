
-- Enable Row Level Security on surveys table
ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;

-- Enable Row Level Security on survey_providers table  
ALTER TABLE public.survey_providers ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for surveys - allow all authenticated users to view available surveys
CREATE POLICY "Authenticated users can view available surveys" 
  ON public.surveys 
  FOR SELECT 
  TO authenticated
  USING (status = 'available');

-- Create RLS policy for survey_providers - allow all authenticated users to view active providers
CREATE POLICY "Authenticated users can view active providers" 
  ON public.survey_providers 
  FOR SELECT 
  TO authenticated
  USING (is_active = true);

-- Fix the handle_new_user function security issue with immutable search path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name'
  );
  
  INSERT INTO public.wallets (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$;
