import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminManagement } from "@/components/AdminManagement";
import { SurveyManagement } from "@/components/SurveyManagement";
import { ProductionChecklist } from "@/components/ProductionChecklist";
import { MobileHeader } from "@/components/MobileHeader";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { WalletManager } from "@/components/WalletManager";

const Admin = () => {
  const { user, loading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
      return;
    }

    if (!adminLoading && !isAdmin) {
      navigate("/dashboard");
      return;
    }
  }, [user, loading, navigate, isAdmin, adminLoading]);

  if (loading || adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
            <p className="text-muted-foreground">You need admin privileges to access this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Manage surveys, users, and system settings
        </p>
      </div>

      <Tabs defaultValue="surveys" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="surveys">Surveys</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="wallet">Wallet</TabsTrigger>
          <TabsTrigger value="checklist">Production</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="surveys">
          <SurveyManagement />
        </TabsContent>

        <TabsContent value="users">
          <AdminManagement />
        </TabsContent>

        <TabsContent value="wallet">
          <Card>
            <CardHeader>
              <CardTitle>Wallet & Rewards Management</CardTitle>
            </CardHeader>
            <CardContent>
              <WalletManager />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="checklist">
          <ProductionChecklist />
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>System Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Additional system settings and configurations will be available here.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Admin;
