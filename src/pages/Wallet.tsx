import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Wallet as WalletIcon, ArrowDownLeft, ArrowUpRight, TrendingUp, History } from "lucide-react";

interface WalletData {
  balance: number;
  total_earned: number;
  total_withdrawn: number;
}

interface PaymentRequest {
  id: string;
  amount: number;
  method: string;
  status: string;
  created_at: string;
  processed_at?: string;
}

const Wallet = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawMethod, setWithdrawMethod] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchWallet();
      fetchPaymentRequests();
    }
  }, [user]);

  const fetchWallet = async () => {
    try {
      const { data, error } = await supabase
        .from("wallets")
        .select("*")
        .eq("user_id", user?.id)
        .single();

      if (error) throw error;
      setWallet(data);
    } catch (error: any) {
      console.error("Error fetching wallet:", error);
    }
  };

  const fetchPaymentRequests = async () => {
    try {
      const { data, error } = await supabase
        .from("payment_requests")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setPaymentRequests(data || []);
    } catch (error: any) {
      console.error("Error fetching payment requests:", error);
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount || !withdrawMethod || !phoneNumber) {
      toast({
        title: "Missing information",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    const amount = parseFloat(withdrawAmount);
    if (amount <= 0 || amount > (wallet?.balance || 0)) {
      toast({
        title: "Invalid amount",
        description: "Amount must be greater than 0 and not exceed your balance",
        variant: "destructive",
      });
      return;
    }

    if (amount < 100) {
      toast({
        title: "Minimum withdrawal",
        description: "Minimum withdrawal amount is KSh 100",
        variant: "destructive",
      });
      return;
    }

    setIsWithdrawing(true);
    try {
      const { error } = await supabase
        .from("payment_requests")
        .insert({
          user_id: user?.id,
          amount,
          method: withdrawMethod as "mpesa" | "airtime" | "voucher",
          recipient_details: { phone_number: phoneNumber },
          status: "pending",
        });

      if (error) throw error;

      toast({
        title: "Withdrawal requested!",
        description: "Your withdrawal request has been submitted and will be processed within 24 hours.",
      });

      setWithdrawAmount("");
      setPhoneNumber("");
      fetchPaymentRequests();
    } catch (error: any) {
      toast({
        title: "Error requesting withdrawal",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsWithdrawing(false);
    }
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
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/dashboard")}>
              ← Back
            </Button>
            <h1 className="text-2xl font-bold text-primary">My Wallet</h1>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Wallet Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Current Balance</CardTitle>
              <WalletIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">
                KSh {wallet?.balance?.toFixed(2) || "0.00"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Available for withdrawal
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Earned</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-success">
                KSh {wallet?.total_earned?.toFixed(2) || "0.00"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Lifetime earnings
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Withdrawn</CardTitle>
              <ArrowDownLeft className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                KSh {wallet?.total_withdrawn?.toFixed(2) || "0.00"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Successfully withdrawn
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Withdrawal Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowUpRight className="h-5 w-5" />
                Request Withdrawal
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (KSh)</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="100"
                  min="100"
                  max={wallet?.balance || 0}
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Minimum: KSh 100 | Available: KSh {wallet?.balance?.toFixed(2) || "0.00"}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="method">Payment Method</Label>
                <Select value={withdrawMethod} onValueChange={setWithdrawMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mpesa">M-Pesa</SelectItem>
                    <SelectItem value="airtime">Airtime</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="0700000000"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                />
              </div>

              <Button 
                onClick={handleWithdraw}
                disabled={isWithdrawing || !withdrawAmount || !withdrawMethod || !phoneNumber}
                className="w-full"
              >
                {isWithdrawing ? "Processing..." : "Request Withdrawal"}
              </Button>
            </CardContent>
          </Card>

          {/* Payment History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Payment History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {paymentRequests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No payment history yet</p>
                  <p className="text-sm mt-1">Your withdrawal requests will appear here</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {paymentRequests.map((request) => (
                    <div
                      key={request.id}
                      className="flex justify-between items-center p-3 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium">KSh {request.amount}</p>
                        <p className="text-sm text-muted-foreground capitalize">
                          {request.method} • {new Date(request.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          request.status === 'completed' 
                            ? 'bg-success text-success-foreground'
                            : request.status === 'failed'
                            ? 'bg-destructive text-destructive-foreground'
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          {request.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Wallet;