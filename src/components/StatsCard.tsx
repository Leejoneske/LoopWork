
import { Card, CardContent } from "@/components/ui/card";

interface WalletData {
  balance: number;
  total_earned: number;
  total_withdrawn: number;
}

interface StatsCardProps {
  wallet: WalletData;
}

export const StatsCard = ({ wallet }: StatsCardProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <Card>
        <CardContent className="p-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">KSh {wallet.balance.toFixed(2)}</p>
            <p className="text-sm text-muted-foreground">Current Balance</p>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">KSh {wallet.total_earned.toFixed(2)}</p>
            <p className="text-sm text-muted-foreground">Total Earned</p>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-orange-600">KSh {wallet.total_withdrawn.toFixed(2)}</p>
            <p className="text-sm text-muted-foreground">Total Withdrawn</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
