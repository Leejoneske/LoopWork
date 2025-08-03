-- Fix security warnings by setting search_path for functions
CREATE OR REPLACE FUNCTION public.is_admin(user_email text DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.admin_users au
    JOIN auth.users u ON u.email = au.email
    WHERE u.id = auth.uid()
    AND (user_email IS NULL OR au.email = user_email)
  );
$$;

CREATE OR REPLACE FUNCTION public.get_current_user_email()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT email FROM auth.users WHERE id = auth.uid();
$$;