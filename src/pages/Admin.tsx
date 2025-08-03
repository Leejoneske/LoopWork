import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Users, FileText, DollarSign, TrendingUp } from "lucide-react";
import { MobileHeader } from "@/components/MobileHeader";
import { AdminManagement } from "@/components/AdminManagement";

interface AdminStats {
  totalUsers: number;
  totalSurveys: number;
  totalEarnings: number;
  totalWithdrawals: number;
}

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  created_at: string;
  status: string;
}

interface Survey {
  id: string;
  title: string;
  reward_amount: number;
  status: string;
  current_completions: number;
  max_completions: number;
  created_at: string;
}

const Admin = () => {
  const { user, loading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const navigate = useNavigate();
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalSurveys: 0,
    totalEarnings: 0,
    totalWithdrawals: 0,
  });
  const [users, setUsers] = useState<User[]>([]);
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
      return;
    }

    if (!adminLoading && !isAdmin) {
      navigate("/dashboard");
      return;
    }
    
    if (user && isAdmin) {
      fetchAdminData();
    }
  }, [user, loading, navigate, isAdmin, adminLoading]);

  const fetchAdminData = async () => {
    try {
      // Fetch stats
      const [usersResult, surveysResult, walletsResult, paymentsResult] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact" }),
        supabase.from("surveys").select("*", { count: "exact" }),
        supabase.from("wallets").select("total_earned"),
        supabase.from("payment_requests").select("amount").eq("status", "completed"),
      ]);

      const totalEarnings = walletsResult.data?.reduce((sum, wallet) => sum + Number(wallet.total_earned || 0), 0) || 0;
      const totalWithdrawals = paymentsResult.data?.reduce((sum, payment) => sum + Number(payment.amount || 0), 0) || 0;

      setStats({
        totalUsers: usersResult.count || 0,
        totalSurveys: surveysResult.count || 0,
        totalEarnings,
        totalWithdrawals,
      });

      // Fetch detailed data
      setUsers(usersResult.data || []);
      setSurveys(surveysResult.data || []);
    } catch (error) {
      console.error("Error fetching admin data:", error);
    } finally {
      setLoadingData(false);
    }
  };

  if (loading || adminLoading || loadingData) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!isAdmin) {
    return <div className="flex items-center justify-center min-h-screen">Access denied. Admin privileges required.</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <MobileHeader />
      
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <Button onClick={() => navigate("/dashboard")}>Back to Dashboard</Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Surveys</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalSurveys}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">KES {stats.totalEarnings.toFixed(2)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Withdrawals</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">KES {stats.totalWithdrawals.toFixed(2)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Data Tables */}
        <Tabs defaultValue="users" className="space-y-4">
          <TabsList>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="surveys">Surveys</TabsTrigger>
            <TabsTrigger value="admins">Admin Management</TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>{`${user.first_name || ''} ${user.last_name || ''}`.trim() || 'N/A'}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
                            {user.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="surveys">
            <Card>
              <CardHeader>
                <CardTitle>Survey Management</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Reward</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Completions</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {surveys.map((survey) => (
                      <TableRow key={survey.id}>
                        <TableCell>{survey.title}</TableCell>
                        <TableCell>KES {survey.reward_amount}</TableCell>
                        <TableCell>
                          <Badge variant={survey.status === 'available' ? 'default' : 'secondary'}>
                            {survey.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{survey.current_completions}/{survey.max_completions || '∞'}</TableCell>
                        <TableCell>{new Date(survey.created_at).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="admins">
            <AdminManagement />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;