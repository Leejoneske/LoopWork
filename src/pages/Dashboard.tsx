
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { SurveyCard } from "@/components/SurveyCard";
import { MobileHeader } from "@/components/MobileHeader";
import { StatCard } from "@/components/StatCard";
import { QuickActionCard } from "@/components/QuickActionCard";
import { Wallet, TrendingUp, Star, FileText, User, CreditCard, Settings } from "lucide-react";

interface Survey {
  id: string;
  title: string;
  description: string;
  reward_amount: number;
  estimated_time: number;
  status: string;
  current_completions: number;
  max_completions: number;
  external_survey_id: string;
  created_at: string;
}

interface WalletData {
  balance: number;
  total_earned: number;
  total_withdrawn: number;
}

const Dashboard = () => {
  const { user, loading, signOut } = useAuth();
  const { isAdmin } = useAdmin();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [loadingSurveys, setLoadingSurveys] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchWallet();
      fetchSurveys();
    }
  }, [user]);

  const fetchWallet = async () => {
    try {
      const { data, error } = await supabase
        .from("wallets")
        .select("balance, total_earned, total_withdrawn")
        .eq("user_id", user?.id)
        .single();

      if (error) throw error;
      setWallet(data);
    } catch (error: any) {
      console.error("Error fetching wallet:", error);
    }
  };

  const fetchSurveys = async () => {
    setLoadingSurveys(true);
    try {
      const { data, error } = await supabase
        .from("surveys")
        .select("*")
        .eq("status", "available")
        .order("reward_amount", { ascending: false })
        .limit(10);

      if (error) throw error;
      setSurveys(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading surveys",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoadingSurveys(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const quickActions = [
    {
      title: "Browse All Surveys",
      description: "Find and complete surveys that match your profile",
      icon: FileText,
      onClick: () => navigate("/surveys")
    },
    {
      title: "Manage Wallet",
      description: "View earnings and request withdrawals",
      icon: CreditCard,
      onClick: () => navigate("/wallet")
    },
    {
      title: "Update Profile",
      description: "Complete your profile to get better survey matches",
      icon: User,
      onClick: () => navigate("/profile")
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <MobileHeader />
      
      {/* Desktop Header */}
      <header className="hidden lg:block border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-primary">LoopWork</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Welcome, {user?.user_metadata?.first_name || user?.email}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate("/surveys")}>
                <FileText className="h-4 w-4 mr-2" />
                All Surveys
              </Button>
              <Button variant="outline" onClick={() => navigate("/wallet")}>
                <Wallet className="h-4 w-4 mr-2" />
                Wallet
              </Button>
              <Button variant="outline" onClick={() => navigate("/profile")}>
                <User className="h-4 w-4 mr-2" />
                Profile
              </Button>
              {isAdmin && (
                <Button variant="outline" onClick={() => navigate("/admin")}>
                  <Settings className="h-4 w-4 mr-2" />
                  Admin
                </Button>
              )}
              <Button variant="outline" onClick={handleSignOut}>
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-4 sm:py-8">
        {/* Wallet Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <StatCard
            title="Current Balance"
            value={`KSh ${wallet?.balance?.toFixed(2) || "0.00"}`}
            icon={Wallet}
            className="text-primary"
          />
          
          <StatCard
            title="Total Earned"
            value={`KSh ${wallet?.total_earned?.toFixed(2) || "0.00"}`}
            icon={TrendingUp}
            className="text-success"
          />

          <StatCard
            title="Available Surveys"
            value={surveys.length.toString()}
            icon={Star}
            className="sm:col-span-2 lg:col-span-1"
          />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {quickActions.map((action) => (
            <QuickActionCard
              key={action.title}
              {...action}
            />
          ))}
        </div>

        {/* Recent Surveys */}
        <Card>
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0">
            <CardTitle className="text-lg sm:text-xl">Recent Surveys</CardTitle>
            <Button variant="outline" onClick={() => navigate("/surveys")} size="sm">
              View All
            </Button>
          </CardHeader>
          <CardContent>
            {loadingSurveys ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-muted-foreground">Loading surveys...</p>
              </div>
            ) : surveys.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">No surveys available at the moment.</p>
                <p className="text-sm text-muted-foreground mt-2">Check back later for new opportunities!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {surveys.slice(0, 3).map((survey) => (
                  <SurveyCard 
                    key={survey.id} 
                    survey={survey}
                    onSurveyStart={fetchSurveys}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
