
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, Wallet, FileText, User, LogOut, BarChart3, Gift, Users, Award } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { NotificationCenter } from "./NotificationCenter";

interface MobileHeaderProps {
  wallet?: {
    balance: number;
    total_earned: number;
  } | null;
}

export const MobileHeader = ({ wallet }: MobileHeaderProps) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
    setIsOpen(false);
  };

  const menuItems = [
    { label: "Dashboard", icon: User, path: "/dashboard" },
    { label: "All Surveys", icon: FileText, path: "/surveys" },
    { label: "Analytics", icon: BarChart3, path: "/analytics" },
    { label: "Achievements", icon: Award, path: "/achievements" },
    { label: "Referrals", icon: Users, path: "/referrals" },
    { label: "Wallet", icon: Wallet, path: "/wallet" },
    { label: "Profile", icon: User, path: "/profile" },
  ];

  return (
    <header className="lg:hidden border-b bg-card sticky top-0 z-50">
      <div className="flex items-center justify-between p-4">
        <h1 className="text-lg font-bold text-primary">SurveyEarn</h1>
        
        <div className="flex items-center gap-2">
          <NotificationCenter />
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Balance</div>
            <div className="text-sm font-semibold text-primary">
              KSh {wallet?.balance?.toFixed(2) || "0.00"}
            </div>
          </div>
          
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon">
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-64">
              <div className="flex flex-col h-full">
                <div className="py-4 border-b">
                  <p className="text-sm text-muted-foreground">Welcome,</p>
                  <p className="font-medium truncate">
                    {user?.user_metadata?.first_name || user?.email}
                  </p>
                </div>
                
                <nav className="flex-1 py-4">
                  <div className="space-y-2">
                    {menuItems.map((item) => (
                      <Button
                        key={item.path}
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => {
                          navigate(item.path);
                          setIsOpen(false);
                        }}
                      >
                        <item.icon className="mr-2 h-4 w-4" />
                        {item.label}
                      </Button>
                    ))}
                  </div>
                </nav>
                
                <div className="border-t pt-4">
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-destructive"
                    onClick={handleSignOut}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};
