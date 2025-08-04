
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, AlertCircle, XCircle, Settings, Users, Database, Wifi, Shield, Globe } from "lucide-react";

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  status: 'completed' | 'warning' | 'error' | 'pending';
  category: string;
  icon: any;
  actionUrl?: string;
}

export const ProductionChecklist = () => {
  const { user } = useAuth();
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      checkSystemStatus();
    }
  }, [user]);

  const checkSystemStatus = async () => {
    setLoading(true);
    const items: ChecklistItem[] = [];

    try {
      // Check CPX Research configuration
      const cpxAppId = localStorage.getItem("cpx_app_id");
      items.push({
        id: 'cpx_config',
        title: 'CPX Research Integration',
        description: 'External survey provider configured and connected',
        status: cpxAppId ? 'completed' : 'error',
        category: 'External Services',
        icon: Wifi,
        actionUrl: '/cpx-settings'
      });

      // Check admin configuration
      const { data: adminUsers, error: adminError } = await supabase
        .from('admin_users')
        .select('*');

      items.push({
        id: 'admin_setup',
        title: 'Admin Users Configured',
        description: `${adminUsers?.length || 0} admin users configured`,
        status: adminUsers && adminUsers.length > 0 ? 'completed' : 'warning',
        category: 'Administration',
        icon: Shield,
        actionUrl: '/admin'
      });

      // Check survey data
      const { data: surveys } = await supabase
        .from('surveys')
        .select('*')
        .limit(1);

      items.push({
        id: 'surveys_available',
        title: 'Survey Content Available',
        description: 'Surveys are available for users to complete',
        status: surveys && surveys.length > 0 ? 'completed' : 'warning',
        category: 'Content',
        icon: Database,
        actionUrl: '/admin'
      });

      // Check user registrations
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id')
        .limit(5);

      items.push({
        id: 'user_base',
        title: 'User Base Established',
        description: `${profiles?.length || 0} users registered`,
        status: profiles && profiles.length > 0 ? 'completed' : 'pending',
        category: 'Users',
        icon: Users
      });

      // Check notification system
      const { data: notifications } = await supabase
        .from('notifications')
        .select('*')
        .limit(1);

      items.push({
        id: 'notifications',
        title: 'Notification System',
        description: 'Automatic notifications working properly',
        status: notifications ? 'completed' : 'pending',
        category: 'Features',
        icon: AlertCircle
      });

      // Check wallet system
      const { data: wallets } = await supabase
        .from('wallets')
        .select('*')
        .not('balance', 'eq', 0)
        .limit(1);

      items.push({
        id: 'wallet_system',
        title: 'Wallet & Rewards System',
        description: 'Users can earn and track rewards',
        status: wallets && wallets.length > 0 ? 'completed' : 'pending',
        category: 'Features',
        icon: Database
      });

      // Check payment system
      const { data: paymentRequests } = await supabase
        .from('payment_requests')
        .select('*')
        .limit(1);

      items.push({
        id: 'payment_system',
        title: 'Payment System',
        description: 'Users can request withdrawals',
        status: paymentRequests ? 'completed' : 'pending',
        category: 'Features',
        icon: Database
      });

      // Production readiness items
      items.push({
        id: 'ssl_certificate',
        title: 'SSL Certificate',
        description: 'HTTPS enabled for secure connections',
        status: window.location.protocol === 'https:' ? 'completed' : 'error',
        category: 'Security',
        icon: Shield
      });

      items.push({
        id: 'domain_setup',
        title: 'Custom Domain',
        description: 'Production domain configured',
        status: window.location.hostname.includes('lovable') ? 'warning' : 'completed',
        category: 'Infrastructure',
        icon: Globe
      });

      setChecklist(items);
    } catch (error) {
      console.error('Error checking system status:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-600">Ready</Badge>;
      case 'warning':
        return <Badge variant="secondary" className="bg-yellow-600">Review</Badge>;
      case 'error':
        return <Badge variant="destructive">Action Required</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  const categories = [...new Set(checklist.map(item => item.category))];

  const getCompletionStats = () => {
    const completed = checklist.filter(item => item.status === 'completed').length;
    const total = checklist.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { completed, total, percentage };
  };

  const stats = getCompletionStats();

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">Checking system status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-6 w-6" />
            Production Readiness Checklist
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            System status and production readiness overview
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">{stats.percentage}%</div>
              <div className="text-sm text-muted-foreground">Overall Completion</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{stats.completed}</div>
              <div className="text-sm text-muted-foreground">Items Complete</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-muted-foreground">{stats.total - stats.completed}</div>
              <div className="text-sm text-muted-foreground">Items Remaining</div>
            </div>
          </div>
          
          <div className="w-full bg-muted rounded-full h-3">
            <div 
              className="bg-primary h-3 rounded-full transition-all"
              style={{ width: `${stats.percentage}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Checklist by Category */}
      {categories.map(category => (
        <Card key={category}>
          <CardHeader>
            <CardTitle className="text-lg">{category}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {checklist
                .filter(item => item.category === category)
                .map(item => {
                  const IconComponent = item.icon;
                  return (
                    <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <IconComponent className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <h4 className="font-medium">{item.title}</h4>
                          <p className="text-sm text-muted-foreground">{item.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(item.status)}
                        {getStatusIcon(item.status)}
                        {item.actionUrl && (
                          <Button variant="ghost" size="sm" asChild>
                            <a href={item.actionUrl}>Configure</a>
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Next Steps</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats.percentage < 100 && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h4 className="font-medium text-yellow-800 mb-2">Action Required</h4>
                <p className="text-sm text-yellow-700 mb-3">
                  Complete the remaining items to ensure your site is production-ready.
                </p>
                <Button variant="outline" size="sm" onClick={checkSystemStatus}>
                  Refresh Status
                </Button>
              </div>
            )}
            
            {stats.percentage === 100 && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="font-medium text-green-800 mb-2">🎉 Production Ready!</h4>
                <p className="text-sm text-green-700">
                  Congratulations! Your survey platform is ready to go live.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
