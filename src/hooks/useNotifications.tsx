
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface NotificationData {
  survey_id?: string;
  reward?: number;
  amount_added?: number;
  new_balance?: number;
  user_email?: string;
}

export const useNotifications = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  // Create notification helper function
  const createNotification = async (
    userId: string,
    title: string,
    message: string,
    type: string = 'general',
    data?: NotificationData
  ) => {
    try {
      const { data: notification, error } = await supabase.rpc('create_notification', {
        p_user_id: userId,
        p_title: title,
        p_message: message,
        p_type: type,
        p_data: data ? JSON.stringify(data) : null
      });

      if (error) {
        console.error('Error creating notification:', error);
        return null;
      }

      return notification;
    } catch (error) {
      console.error('Failed to create notification:', error);
      return null;
    }
  };

  // Send survey completion notification
  const notifySurveyCompletion = async (surveyTitle: string, rewardAmount: number) => {
    if (!user) return;
    
    await createNotification(
      user.id,
      'Survey Completed! 🎉',
      `Congratulations! You completed "${surveyTitle}" and earned KES ${rewardAmount}.`,
      'survey',
      { reward: rewardAmount }
    );
  };

  // Send reward received notification
  const notifyRewardReceived = async (amount: number, newBalance: number) => {
    if (!user) return;
    
    await createNotification(
      user.id,
      'Reward Received! 💰',
      `You received KES ${amount}. Your new balance is KES ${newBalance}.`,
      'reward',
      { amount_added: amount, new_balance: newBalance }
    );
  };

  // Send achievement unlocked notification
  const notifyAchievementUnlocked = async (achievementName: string, rewardAmount: number) => {
    if (!user) return;
    
    await createNotification(
      user.id,
      'Achievement Unlocked! 🏆',
      `Congratulations! You unlocked "${achievementName}" and earned KES ${rewardAmount}.`,
      'achievement',
      { reward: rewardAmount }
    );
  };

  // Send referral success notification
  const notifyReferralSuccess = async (referredUserEmail: string, rewardAmount: number) => {
    if (!user) return;
    
    await createNotification(
      user.id,
      'Referral Success! 👥',
      `Your referral of ${referredUserEmail} was successful! You earned KES ${rewardAmount}.`,
      'referral',
      { reward: rewardAmount, user_email: referredUserEmail }
    );
  };

  return {
    createNotification,
    notifySurveyCompletion,
    notifyRewardReceived,
    notifyAchievementUnlocked,
    notifyReferralSuccess
  };
};
