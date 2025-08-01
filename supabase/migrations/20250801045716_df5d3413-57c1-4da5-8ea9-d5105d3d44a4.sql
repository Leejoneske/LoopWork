-- Create survey categories table
CREATE TABLE public.survey_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add category to surveys table
ALTER TABLE public.surveys ADD COLUMN category_id UUID REFERENCES public.survey_categories(id);

-- Create referrals table
CREATE TABLE public.referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID NOT NULL,
  referred_id UUID NOT NULL,
  referral_code TEXT NOT NULL UNIQUE,
  reward_amount NUMERIC DEFAULT 5.00,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create achievements table
CREATE TABLE public.achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT,
  requirement_type TEXT NOT NULL, -- 'surveys_completed', 'earnings_reached', 'referrals_made'
  requirement_value INTEGER NOT NULL,
  reward_amount NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user achievements table
CREATE TABLE public.user_achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id),
  earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL, -- 'survey', 'reward', 'achievement', 'referral'
  read BOOLEAN DEFAULT false,
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add referral code to profiles
ALTER TABLE public.profiles ADD COLUMN referral_code TEXT UNIQUE;

-- Enable RLS on new tables
ALTER TABLE public.survey_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for survey_categories (public read)
CREATE POLICY "Anyone can view survey categories" 
ON public.survey_categories 
FOR SELECT 
USING (true);

-- RLS policies for referrals
CREATE POLICY "Users can view their own referrals" 
ON public.referrals 
FOR SELECT 
USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

CREATE POLICY "Users can create referrals" 
ON public.referrals 
FOR INSERT 
WITH CHECK (auth.uid() = referrer_id);

-- RLS policies for achievements (public read)
CREATE POLICY "Anyone can view achievements" 
ON public.achievements 
FOR SELECT 
USING (true);

-- RLS policies for user_achievements
CREATE POLICY "Users can view their own achievements" 
ON public.user_achievements 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can earn achievements" 
ON public.user_achievements 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- RLS policies for notifications
CREATE POLICY "Users can view their own notifications" 
ON public.notifications 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" 
ON public.notifications 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Insert default survey categories
INSERT INTO public.survey_categories (name, description, icon) VALUES
('Market Research', 'Consumer behavior and market trends', 'TrendingUp'),
('Product Feedback', 'Product reviews and improvement suggestions', 'Package'),
('Academic Research', 'University and academic studies', 'GraduationCap'),
('Health & Wellness', 'Health-related surveys and studies', 'Heart'),
('Technology', 'Tech products and digital services', 'Smartphone'),
('Entertainment', 'Movies, games, and entertainment content', 'PlayCircle');

-- Insert default achievements
INSERT INTO public.achievements (name, description, icon, requirement_type, requirement_value, reward_amount) VALUES
('First Survey', 'Complete your first survey', 'Award', 'surveys_completed', 1, 2.00),
('Survey Veteran', 'Complete 10 surveys', 'Star', 'surveys_completed', 10, 10.00),
('Survey Master', 'Complete 50 surveys', 'Crown', 'surveys_completed', 50, 25.00),
('First Earnings', 'Earn your first KES 100', 'DollarSign', 'earnings_reached', 100, 5.00),
('High Earner', 'Earn KES 1000', 'Banknote', 'earnings_reached', 1000, 20.00),
('Referral Starter', 'Refer your first friend', 'Users', 'referrals_made', 1, 10.00),
('Social Networker', 'Refer 5 friends', 'Network', 'referrals_made', 5, 50.00);

-- Function to generate referral code
CREATE OR REPLACE FUNCTION generate_referral_code() 
RETURNS TEXT AS $$
DECLARE
  code TEXT;
BEGIN
  code := upper(substring(gen_random_uuid()::text from 1 for 8));
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Update handle_new_user function to include referral code
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name, referral_code)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    generate_referral_code()
  );
  
  INSERT INTO public.wallets (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$;