
-- Fix the wallet system by creating proper triggers for automatic notifications
CREATE OR REPLACE FUNCTION public.notify_wallet_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Only notify when balance increases
  IF NEW.balance > OLD.balance THEN
    PERFORM public.create_notification(
      NEW.user_id,
      'Reward Received! 💰',
      'You have received KES ' || (NEW.balance - OLD.balance)::text || '. Your new balance is KES ' || NEW.balance::text || '.',
      'reward',
      jsonb_build_object('amount_added', NEW.balance - OLD.balance, 'new_balance', NEW.balance)
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger for wallet updates
DROP TRIGGER IF EXISTS wallet_update_notification ON public.wallets;
CREATE TRIGGER wallet_update_notification
  AFTER UPDATE ON public.wallets
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_wallet_update();

-- Fix survey deletion by allowing cascade deletes and creating proper cleanup
ALTER TABLE public.user_surveys 
DROP CONSTRAINT IF EXISTS user_surveys_survey_id_fkey;

ALTER TABLE public.user_surveys 
ADD CONSTRAINT user_surveys_survey_id_fkey 
FOREIGN KEY (survey_id) REFERENCES public.surveys(id) ON DELETE CASCADE;

-- Create function to safely delete surveys with all related data
CREATE OR REPLACE FUNCTION public.delete_survey_safely(survey_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Check if user is admin
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can delete surveys';
  END IF;

  -- Delete related user_surveys first
  DELETE FROM public.user_surveys WHERE survey_id = survey_id_param;
  
  -- Delete the survey
  DELETE FROM public.surveys WHERE id = survey_id_param;
  
  RETURN true;
END;
$function$;

-- Update RLS policy for surveys to allow admins to see all surveys for management
DROP POLICY IF EXISTS "Admins can view all surveys" ON public.surveys;
CREATE POLICY "Admins can view all surveys" 
ON public.surveys 
FOR SELECT 
USING (is_admin() OR status = 'available'::survey_status);
