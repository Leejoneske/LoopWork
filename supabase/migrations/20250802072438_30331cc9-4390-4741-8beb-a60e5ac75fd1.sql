-- Create admin_users table for managing admin access
CREATE TABLE public.admin_users (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Enable RLS on admin_users
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Insert the initial admin user
INSERT INTO public.admin_users (email) VALUES ('johnwanderi202@gmail.com');

-- Create function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(user_email text DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.admin_users au
    JOIN auth.users u ON u.email = au.email
    WHERE u.id = auth.uid()
    AND (user_email IS NULL OR au.email = user_email)
  );
$$;

-- Create function to get current user email
CREATE OR REPLACE FUNCTION public.get_current_user_email()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT email FROM auth.users WHERE id = auth.uid();
$$;

-- RLS policies for admin_users table
CREATE POLICY "Admins can view admin users" 
ON public.admin_users 
FOR SELECT 
USING (public.is_admin());

CREATE POLICY "Admins can insert admin users" 
ON public.admin_users 
FOR INSERT 
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete admin users" 
ON public.admin_users 
FOR DELETE 
USING (public.is_admin());

-- Update surveys table RLS policies
DROP POLICY IF EXISTS "Authenticated users can view available surveys" ON public.surveys;

-- New surveys RLS policies
CREATE POLICY "Anyone can view available surveys" 
ON public.surveys 
FOR SELECT 
USING (status = 'available'::survey_status);

CREATE POLICY "Admins can insert surveys" 
ON public.surveys 
FOR INSERT 
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update surveys" 
ON public.surveys 
FOR UPDATE 
USING (public.is_admin());

CREATE POLICY "Admins can delete surveys" 
ON public.surveys 
FOR DELETE 
USING (public.is_admin());

-- Update survey_categories RLS policies
DROP POLICY IF EXISTS "Anyone can view survey categories" ON public.survey_categories;

CREATE POLICY "Anyone can view survey categories" 
ON public.survey_categories 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can insert survey categories" 
ON public.survey_categories 
FOR INSERT 
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update survey categories" 
ON public.survey_categories 
FOR UPDATE 
USING (public.is_admin());

CREATE POLICY "Admins can delete survey categories" 
ON public.survey_categories 
FOR DELETE 
USING (public.is_admin());