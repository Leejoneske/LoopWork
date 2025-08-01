import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { MobileHeader } from "@/components/MobileHeader";
import { Award, Crown, Star, DollarSign, Users, Network, Trophy } from "lucide-react";

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  requirement_type: string;
  requirement_value: number;
  reward_amount: number;
  earned: boolean;
  earned_at?: string;
  progress: number;
}

const Achievements = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [stats, setStats] = useState({
    surveysCompleted: 0,
    totalEarnings: 0,
    referralsMade: 0,
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
      return;
    }
    
    if (user) {
      fetchAchievements();
    }
  }, [user, loading, navigate]);

  const fetchAchievements = async () => {
    try {
      // Get user statistics
      const [surveysResult, walletResult, referralsResult] = await Promise.all([
        supabase.from("user_surveys").select("*").eq("user_id", user?.id).eq("status", "completed"),
        supabase.from("wallets").select("total_earned").eq("user_id", user?.id).single(),
        supabase.from("referrals").select("*").eq("referrer_id", user?.id).eq("status", "completed"),
      ]);

      const surveysCompleted = surveysResult.data?.length || 0;
      const totalEarnings = Number(walletResult.data?.total_earned || 0);
      const referralsMade = referralsResult.data?.length || 0;

      setStats({ surveysCompleted, totalEarnings, referralsMade });

      // Get all achievements
      const { data: allAchievements } = await supabase
        .from("achievements")
        .select("*")
        .order("requirement_value", { ascending: true });

      // Get user's earned achievements
      const { data: userAchievements } = await supabase
        .from("user_achievements")
        .select("achievement_id, earned_at")
        .eq("user_id", user?.id);

      const earnedAchievementIds = new Set(userAchievements?.map(ua => ua.achievement_id));

      // Calculate progress for each achievement
      const achievementsWithProgress = allAchievements?.map(achievement => {
        const isEarned = earnedAchievementIds.has(achievement.id);
        const earnedData = userAchievements?.find(ua => ua.achievement_id === achievement.id);
        
        let currentValue = 0;
        switch (achievement.requirement_type) {
          case 'surveys_completed':
            currentValue = surveysCompleted;
            break;
          case 'earnings_reached':
            currentValue = totalEarnings;
            break;
          case 'referrals_made':
            currentValue = referralsMade;
            break;
        }

        const progress = Math.min((currentValue / achievement.requirement_value) * 100, 100);

        return {
          ...achievement,
          earned: isEarned,
          earned_at: earnedData?.earned_at,
          progress,
        };
      }) || [];

      setAchievements(achievementsWithProgress);
    } catch (error) {
      console.error("Error fetching achievements:", error);
    } finally {
      setLoadingData(false);
    }
  };

  const getIcon = (iconName: string) => {
    const icons = {
      Award,
      Crown,
      Star,
      DollarSign,
      Users,
      Network,
      Trophy,
    };
    const IconComponent = icons[iconName as keyof typeof icons] || Award;
    return IconComponent;
  };

  const getRequirementText = (type: string, value: number) => {
    switch (type) {
      case 'surveys_completed':
        return `Complete ${value} survey${value > 1 ? 's' : ''}`;
      case 'earnings_reached':
        return `Earn KES ${value}`;
      case 'referrals_made':
        return `Refer ${value} friend${value > 1 ? 's' : ''}`;
      default:
        return 'Unknown requirement';
    }
  };

  if (loading || loadingData) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  const earnedAchievements = achievements.filter(a => a.earned);
  const availableAchievements = achievements.filter(a => !a.earned);

  return (
    <div className="min-h-screen bg-background">
      <MobileHeader />
      
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Achievements</h1>
          <Button onClick={() => navigate("/dashboard")}>Back to Dashboard</Button>
        </div>

        {/* Progress Summary */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Your Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{stats.surveysCompleted}</div>
              <p className="text-sm text-muted-foreground">Surveys Completed</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">KES {stats.totalEarnings.toFixed(2)}</div>
              <p className="text-sm text-muted-foreground">Total Earnings</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{stats.referralsMade}</div>
              <p className="text-sm text-muted-foreground">Referrals Made</p>
            </div>
          </CardContent>
        </Card>

        {/* Earned Achievements */}
        {earnedAchievements.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Earned Achievements</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {earnedAchievements.map((achievement) => {
                const IconComponent = getIcon(achievement.icon);
                return (
                  <Card key={achievement.id} className="relative overflow-hidden">
                    <div className="absolute top-2 right-2">
                      <Badge variant="default">Earned</Badge>
                    </div>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <IconComponent className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{achievement.name}</CardTitle>
                          <p className="text-sm text-muted-foreground">
                            {getRequirementText(achievement.requirement_type, achievement.requirement_value)}
                          </p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm mb-3">{achievement.description}</p>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          Earned: {new Date(achievement.earned_at!).toLocaleDateString()}
                        </span>
                        <span className="font-medium text-primary">
                          +KES {achievement.reward_amount}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Available Achievements */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Available Achievements</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableAchievements.map((achievement) => {
              const IconComponent = getIcon(achievement.icon);
              return (
                <Card key={achievement.id} className="relative">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-muted rounded-lg">
                        <IconComponent className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{achievement.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {getRequirementText(achievement.requirement_type, achievement.requirement_value)}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm mb-3">{achievement.description}</p>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Progress</span>
                        <span>{achievement.progress.toFixed(0)}%</span>
                      </div>
                      <Progress value={achievement.progress} className="h-2" />
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Reward</span>
                        <span className="font-medium text-primary">
                          +KES {achievement.reward_amount}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Achievements;