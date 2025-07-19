import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Wallet, TrendingUp, Clock, Star } from "lucide-react";

interface Survey {
  id: string;
  title: string;
  description: string;
  reward_amount: number;
  estimated_time: number;
  status: string;
}

interface WalletData {
  balance: number;
  total_earned: number;
  total_withdrawn: number;
}

const Dashboard = () => {
  const { user, loading, signOut } = useAuth();
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
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-primary">SurveyEarn</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Welcome, {user?.user_metadata?.first_name || user?.email}
            </span>
            <Button variant="outline" onClick={handleSignOut}>
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Wallet Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Current Balance</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                KSh {wallet?.balance?.toFixed(2) || "0.00"}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Earned</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">
                KSh {wallet?.total_earned?.toFixed(2) || "0.00"}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available Surveys</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{surveys.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Available Surveys */}
        <Card>
          <CardHeader>
            <CardTitle>Available Surveys</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingSurveys ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-muted-foreground">Loading surveys...</p>
              </div>
            ) : surveys.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No surveys available at the moment.</p>
                <p className="text-sm text-muted-foreground mt-2">Check back later for new opportunities!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {surveys.map((survey) => (
                  <div
                    key={survey.id}
                    className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold">{survey.title}</h3>
                      <Badge variant="secondary" className="bg-success text-success-foreground">
                        KSh {survey.reward_amount}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      {survey.description}
                    </p>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {survey.estimated_time} min
                        </span>
                      </div>
                      <Button size="sm">
                        Start Survey
                      </Button>
                    </div>
                  </div>
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