
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Wallet, CreditCard, TrendingUp } from "lucide-react";

interface WalletData {
  id: string;
  balance: number;
  total_earned: number;
  total_withdrawn: number;
  updated_at: string;
}

interface Transaction {
  id: string;
  type: 'earned' | 'withdrawn';
  amount: number;
  description: string;
  created_at: string;
}

export const WalletManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchWalletData();
      fetchTransactions();
    }
  }, [user]);

  const fetchWalletData = async () => {
    try {
      const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code === 'PGRST116') {
        // No wallet found, create one
        await createWallet();
        return;
      }

      if (error) throw error;
      setWallet(data);
    } catch (error: any) {
      console.error('Error fetching wallet:', error);
      toast({
        title: "Error loading wallet",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createWallet = async () => {
    try {
      const { data, error } = await supabase
        .from('wallets')
        .insert({
          user_id: user?.id,
          balance: 0,
          total_earned: 0,
          total_withdrawn: 0
        })
        .select()
        .single();

      if (error) throw error;
      setWallet(data);
    } catch (error: any) {
      console.error('Error creating wallet:', error);
      toast({
        title: "Error creating wallet",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const fetchTransactions = async () => {
    try {
      // Get survey completions as earnings
      const { data: surveyData } = await supabase
        .from('user_surveys')
        .select('id, reward_earned, completed_at, survey_id, surveys(title)')
        .eq('user_id', user?.id)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false });

      // Get payment requests as withdrawals
      const { data: paymentData } = await supabase
        .from('payment_requests')
        .select('id, amount, status, created_at')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      const allTransactions: Transaction[] = [];

      if (surveyData) {
        surveyData.forEach(item => {
          if (item.completed_at && item.reward_earned) {
            allTransactions.push({
              id: item.id,
              type: 'earned',
              amount: Number(item.reward_earned),
              description: `Survey completion: ${(item.surveys as any)?.title || 'Unknown Survey'}`,
              created_at: item.completed_at
            });
          }
        });
      }

      if (paymentData) {
        paymentData.forEach(item => {
          allTransactions.push({
            id: item.id,
            type: 'withdrawn',
            amount: Number(item.amount),
            description: `Withdrawal request (${item.status})`,
            created_at: item.created_at
          });
        });
      }

      // Sort by date descending
      allTransactions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setTransactions(allTransactions);
    } catch (error: any) {
      console.error('Error fetching transactions:', error);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="animate-pulse">Loading wallet...</div>
        </CardContent>
      </Card>
    );
  }

  if (!wallet) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">Unable to load wallet data</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Wallet Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Balance</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              KES {Number(wallet.balance).toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earned</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              KES {Number(wallet.total_earned).toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Withdrawn</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              KES {Number(wallet.total_withdrawn).toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No transactions yet. Complete surveys to start earning!
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.slice(0, 10).map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{transaction.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(transaction.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant={transaction.type === 'earned' ? 'default' : 'secondary'}>
                      {transaction.type === 'earned' ? '+' : '-'}KES {transaction.amount.toFixed(2)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
