
-- Add johnwanderi202@gmail.com as primary admin that cannot be removed
INSERT INTO admin_users (email, created_by) 
VALUES ('johnwanderi202@gmail.com', NULL)
ON CONFLICT (email) DO NOTHING;

-- Add a primary_admin flag to admin_users table
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT FALSE;

-- Mark johnwanderi202@gmail.com as primary admin
UPDATE admin_users 
SET is_primary = TRUE 
WHERE email = 'johnwanderi202@gmail.com';

-- Create a function to automatically create notifications
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id UUID,
  p_title TEXT,
  p_message TEXT,
  p_type TEXT DEFAULT 'general',
  p_data JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO notifications (user_id, title, message, type, data)
  VALUES (p_user_id, p_title, p_message, p_type, p_data)
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$;

-- Create a function to send notifications to all users (for admin push)
CREATE OR REPLACE FUNCTION public.create_notification_for_all_users(
  p_title TEXT,
  p_message TEXT,
  p_type TEXT DEFAULT 'general',
  p_data JSONB DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  notification_count INTEGER := 0;
BEGIN
  -- Only allow admins to send notifications to all users
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can send notifications to all users';
  END IF;

  INSERT INTO notifications (user_id, title, message, type, data)
  SELECT 
    au.id,
    p_title,
    p_message,
    p_type,
    p_data
  FROM auth.users au
  WHERE au.email_confirmed_at IS NOT NULL;
  
  GET DIAGNOSTICS notification_count = ROW_COUNT;
  RETURN notification_count;
END;
$$;

-- Create trigger function for survey completion notifications
CREATE OR REPLACE FUNCTION public.notify_survey_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only create notification when status changes to completed
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    PERFORM public.create_notification(
      NEW.user_id,
      'Survey Completed! 🎉',
      'Congratulations! You have successfully completed a survey and earned ' || COALESCE(NEW.reward_earned::text, '0') || ' points.',
      'survey',
      jsonb_build_object('survey_id', NEW.survey_id, 'reward', NEW.reward_earned)
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for survey completion notifications
DROP TRIGGER IF EXISTS trigger_survey_completion_notification ON user_surveys;
CREATE TRIGGER trigger_survey_completion_notification
  AFTER UPDATE ON user_surveys
  FOR EACH ROW
  EXECUTE FUNCTION notify_survey_completion();

-- Create trigger function for wallet updates (rewards received)
CREATE OR REPLACE FUNCTION public.notify_wallet_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only notify when balance increases
  IF NEW.balance > OLD.balance THEN
    PERFORM public.create_notification(
      NEW.user_id,
      'Reward Received! 💰',
      'You have received ' || (NEW.balance - OLD.balance)::text || ' points. Your new balance is ' || NEW.balance::text || ' points.',
      'reward',
      jsonb_build_object('amount_added', NEW.balance - OLD.balance, 'new_balance', NEW.balance)
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for wallet updates
DROP TRIGGER IF EXISTS trigger_wallet_update_notification ON wallets;
CREATE TRIGGER trigger_wallet_update_notification
  AFTER UPDATE ON wallets
  FOR EACH ROW
  EXECUTE FUNCTION notify_wallet_update();

-- Create trigger function for new user welcome notifications
CREATE OR REPLACE FUNCTION public.notify_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Send welcome notification to new users
  PERFORM public.create_notification(
    NEW.id,
    'Welcome to SurveyApp! 🎊',
    'Welcome to our survey platform! Start completing surveys to earn rewards. Check out available surveys in the Surveys section.',
    'welcome',
    jsonb_build_object('user_email', NEW.email)
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user notifications
DROP TRIGGER IF EXISTS trigger_new_user_notification ON profiles;
CREATE TRIGGER trigger_new_user_notification
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_user();

-- Allow admins to insert notifications for admin push functionality
CREATE POLICY "Admins can create notifications for all users"
ON notifications
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());
