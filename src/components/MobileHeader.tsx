
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, Home, User, Wallet, FileText, BarChart3, Users, Trophy, Settings, Plus } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { NotificationCenter } from "./NotificationCenter";

export const MobileHeader = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();
  const { isAdmin } = useAdmin();

  const menuItems = [
    { icon: Home, label: "Dashboard", path: "/dashboard" },
    { icon: FileText, label: "Surveys", path: "/surveys" },
    { icon: Wallet, label: "Wallet", path: "/wallet" },
    { icon: Users, label: "Referrals", path: "/referrals" },
    { icon: Trophy, label: "Achievements", path: "/achievements" },
    { icon: BarChart3, label: "Analytics", path: "/analytics" },
    { icon: User, label: "Profile", path: "/profile" },
    ...(isAdmin ? [
      { icon: Settings, label: "Admin", path: "/admin" },
      { icon: Plus, label: "Survey Admin", path: "/survey-admin" },
    ] : []),
  ];

  const handleNavigation = (path: string) => {
    navigate(path);
    setIsOpen(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
    setIsOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="md:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <div className="flex h-full flex-col">
                <div className="flex items-center border-b px-6 py-4">
                  <h2 className="text-lg font-semibold">Survey App</h2>
                </div>
                <nav className="flex-1 space-y-1 p-4">
                  {menuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;
                    return (
                      <Button
                        key={item.path}
                        variant={isActive ? "default" : "ghost"}
                        className="w-full justify-start gap-2"
                        onClick={() => handleNavigation(item.path)}
                      >
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </Button>
                    );
                  })}
                </nav>
                <div className="border-t p-4">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleSignOut}
                  >
                    Sign Out
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
          <h1 className="text-lg font-semibold">Survey App</h1>
        </div>
        
        <NotificationCenter />
      </div>
    </header>
  );
};
