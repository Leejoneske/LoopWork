import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, LineChart, Line, ResponsiveContainer } from "recharts";
import { MobileHeader } from "@/components/MobileHeader";
import { TrendingUp, Award, DollarSign, Calendar } from "lucide-react";

interface AnalyticsData {
  totalSurveysCompleted: number;
  totalEarnings: number;
  averageRating: number;
  surveysThisMonth: number;
  monthlyEarnings: Array<{ month: string; earnings: number }>;
  categoryDistribution: Array<{ name: string; value: number }>;
  completionTrend: Array<{ date: string; completions: number }>;
}

const Analytics = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalSurveysCompleted: 0,
    totalEarnings: 0,
    averageRating: 0,
    surveysThisMonth: 0,
    monthlyEarnings: [],
    categoryDistribution: [],
    completionTrend: [],
  });
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
      return;
    }
    
    if (user) {
      fetchAnalytics();
    }
  }, [user, loading, navigate]);

  const fetchAnalytics = async () => {
    try {
      // Fetch user surveys
      const { data: userSurveys } = await supabase
        .from("user_surveys")
        .select(`
          *,
          surveys!inner (
            title,
            reward_amount,
            category_id,
            survey_categories (name)
          )
        `)
        .eq("user_id", user?.id)
        .eq("status", "completed");

      // Fetch wallet data
      const { data: wallet } = await supabase
        .from("wallets")
        .select("*")
        .eq("user_id", user?.id)
        .single();

      const completedSurveys = userSurveys || [];
      const totalEarnings = Number(wallet?.total_earned || 0);

      // Calculate this month's surveys
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const surveysThisMonth = completedSurveys.filter(survey => {
        const completedDate = new Date(survey.completed_at);
        return completedDate.getMonth() === currentMonth && completedDate.getFullYear() === currentYear;
      }).length;

      // Calculate monthly earnings (last 6 months)
      const monthlyEarnings = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthName = date.toLocaleDateString('en-US', { month: 'short' });
        
        const monthEarnings = completedSurveys
          .filter(survey => {
            const completedDate = new Date(survey.completed_at);
            return completedDate.getMonth() === date.getMonth() && 
                   completedDate.getFullYear() === date.getFullYear();
          })
          .reduce((sum, survey) => sum + Number(survey.reward_earned || 0), 0);
        
        monthlyEarnings.push({ month: monthName, earnings: monthEarnings });
      }

      // Calculate category distribution
      const categoryMap = new Map();
      completedSurveys.forEach(survey => {
        const categoryName = survey.surveys?.survey_categories?.name || 'Uncategorized';
        categoryMap.set(categoryName, (categoryMap.get(categoryName) || 0) + 1);
      });
      
      const categoryDistribution = Array.from(categoryMap.entries()).map(([name, value]) => ({
        name,
        value,
      }));

      // Calculate completion trend (last 30 days)
      const completionTrend = [];
      for (let i = 29; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayCompletions = completedSurveys.filter(survey => {
          const completedDate = new Date(survey.completed_at);
          return completedDate.toISOString().split('T')[0] === dateStr;
        }).length;
        
        completionTrend.push({ 
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), 
          completions: dayCompletions 
        });
      }

      setAnalytics({
        totalSurveysCompleted: completedSurveys.length,
        totalEarnings,
        averageRating: 4.5, // Placeholder since we don't have ratings yet
        surveysThisMonth,
        monthlyEarnings,
        categoryDistribution,
        completionTrend,
      });
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoadingData(false);
    }
  };

  if (loading || loadingData) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1'];

  return (
    <div className="min-h-screen bg-background">
      <MobileHeader />
      
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Your Analytics</h1>
          <Button onClick={() => navigate("/dashboard")}>Back to Dashboard</Button>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Surveys</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.totalSurveysCompleted}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">KES {analytics.totalEarnings.toFixed(2)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Month</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.surveysThisMonth}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg. Rating</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.averageRating.toFixed(1)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Monthly Earnings */}
          <Card>
            <CardHeader>
              <CardTitle>Monthly Earnings</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.monthlyEarnings}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`KES ${value}`, 'Earnings']} />
                  <Bar dataKey="earnings" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Category Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Survey Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={analytics.categoryDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {analytics.categoryDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Completion Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Survey Completion Trend (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics.completionTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="completions" stroke="#8884d8" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Analytics;