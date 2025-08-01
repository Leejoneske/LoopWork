import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MobileHeader } from "@/components/MobileHeader";
import { Share2, Users, Gift, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ReferralData {
  referralCode: string;
  totalReferrals: number;
  pendingReferrals: number;
  completedReferrals: number;
  totalEarnings: number;
  referrals: Array<{
    id: string;
    referred_email: string;
    status: string;
    reward_amount: number;
    created_at: string;
    completed_at: string | null;
  }>;
}

const Referrals = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [referralData, setReferralData] = useState<ReferralData>({
    referralCode: '',
    totalReferrals: 0,
    pendingReferrals: 0,
    completedReferrals: 0,
    totalEarnings: 0,
    referrals: [],
  });
  const [loadingData, setLoadingData] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
      return;
    }
    
    if (user) {
      fetchReferralData();
    }
  }, [user, loading, navigate]);

  const fetchReferralData = async () => {
    try {
      // Get user's referral code from profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("referral_code")
        .eq("id", user?.id)
        .single();

      // Get referral statistics
      const { data: referrals } = await supabase
        .from("referrals")
        .select("*")
        .eq("referrer_id", user?.id);

      const totalReferrals = referrals?.length || 0;
      const pendingReferrals = referrals?.filter(r => r.status === 'pending').length || 0;
      const completedReferrals = referrals?.filter(r => r.status === 'completed').length || 0;
      const totalEarnings = referrals?.reduce((sum, r) => sum + (r.status === 'completed' ? Number(r.reward_amount) : 0), 0) || 0;

      setReferralData({
        referralCode: profile?.referral_code || '',
        totalReferrals,
        pendingReferrals,
        completedReferrals,
        totalEarnings,
        referrals: referrals?.map(r => ({
          id: r.id,
          referred_email: `User ${r.referred_id.substring(0, 8)}...`,
          status: r.status,
          reward_amount: Number(r.reward_amount),
          created_at: r.created_at,
          completed_at: r.completed_at,
        })) || [],
      });
    } catch (error) {
      console.error("Error fetching referral data:", error);
    } finally {
      setLoadingData(false);
    }
  };

  const copyReferralCode = async () => {
    try {
      await navigator.clipboard.writeText(referralData.referralCode);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Referral code copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy referral code",
        variant: "destructive",
      });
    }
  };

  const shareReferral = async () => {
    const shareText = `Join me on SurveyApp and earn money by taking surveys! Use my referral code: ${referralData.referralCode}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join SurveyApp',
          text: shareText,
        });
      } catch (error) {
        console.log('Share cancelled');
      }
    } else {
      // Fallback to copying
      copyReferralCode();
    }
  };

  if (loading || loadingData) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <MobileHeader />
      
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Referral Program</h1>
          <Button onClick={() => navigate("/dashboard")}>Back to Dashboard</Button>
        </div>

        {/* Referral Code Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5" />
              Your Referral Code
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Input 
                value={referralData.referralCode} 
                readOnly 
                className="font-mono text-lg"
              />
              <Button 
                onClick={copyReferralCode}
                variant="outline"
                size="icon"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <div className="flex gap-2">
              <Button onClick={shareReferral} className="flex-1">
                <Share2 className="mr-2 h-4 w-4" />
                Share Code
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Share your referral code with friends and earn KES 5 for each friend who signs up and completes their first survey!
            </p>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{referralData.totalReferrals}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{referralData.pendingReferrals}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{referralData.completedReferrals}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Earned</CardTitle>
              <Gift className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">KES {referralData.totalEarnings.toFixed(2)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Referral History */}
        <Card>
          <CardHeader>
            <CardTitle>Referral History</CardTitle>
          </CardHeader>
          <CardContent>
            {referralData.referrals.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="mx-auto h-12 w-12 mb-4" />
                <p>No referrals yet. Start sharing your code!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {referralData.referrals.map((referral) => (
                  <div key={referral.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">{referral.referred_email}</p>
                      <p className="text-sm text-muted-foreground">
                        Referred on {new Date(referral.created_at).toLocaleDateString()}
                      </p>
                      {referral.completed_at && (
                        <p className="text-sm text-muted-foreground">
                          Completed on {new Date(referral.completed_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <Badge variant={referral.status === 'completed' ? 'default' : 'secondary'}>
                        {referral.status}
                      </Badge>
                      <p className="text-sm font-medium mt-1">
                        KES {referral.reward_amount.toFixed(2)}
                      </p>
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

export default Referrals;