
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, UserCheck } from "lucide-react";

interface AdminUser {
  id: string;
  email: string;
  created_at: string;
}

export const AdminManagement = () => {
  const { toast } = useToast();
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState("");

  useEffect(() => {
    fetchAdminUsers();
  }, []);

  const fetchAdminUsers = async () => {
    try {
      console.log('Fetching admin users...');
      const { data, error } = await supabase
        .from("admin_users")
        .select("*")
        .order("created_at", { ascending: false });

      console.log('Admin users fetch result:', { data, error });
      
      if (error) {
        console.error('Error fetching admin users:', error);
        throw error;
      }
      setAdminUsers(data || []);
    } catch (error: any) {
      console.error('Failed to fetch admin users:', error);
      toast({
        title: "Error fetching admin users",
        description: error.message || "Failed to load admin users",
        variant: "destructive",
      });
    }
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminEmail.trim()) return;

    setLoading(true);
    try {
      console.log('Adding admin:', newAdminEmail);
      const { data, error } = await supabase
        .from("admin_users")
        .insert({ email: newAdminEmail.trim().toLowerCase() })
        .select()
        .single();

      console.log('Add admin result:', { data, error });

      if (error) {
        console.error('Error adding admin:', error);
        throw error;
      }

      toast({
        title: "Admin added",
        description: `${newAdminEmail} has been added as an admin.`,
      });

      setNewAdminEmail("");
      await fetchAdminUsers();
    } catch (error: any) {
      console.error('Failed to add admin:', error);
      toast({
        title: "Error adding admin",
        description: error.message || "Failed to add admin user",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveAdmin = async (id: string, email: string) => {
    if (!confirm(`Are you sure you want to remove ${email} as an admin?`)) return;

    try {
      console.log('Removing admin:', { id, email });
      const { error } = await supabase
        .from("admin_users")
        .delete()
        .eq("id", id);

      console.log('Remove admin result:', { error });

      if (error) {
        console.error('Error removing admin:', error);
        throw error;
      }

      toast({
        title: "Admin removed",
        description: `${email} has been removed as an admin.`,
      });

      await fetchAdminUsers();
    } catch (error: any) {
      console.error('Failed to remove admin:', error);
      toast({
        title: "Error removing admin",
        description: error.message || "Failed to remove admin user",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Admin User Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddAdmin} className="flex gap-2 mb-6">
            <Input
              type="email"
              placeholder="Enter email address"
              value={newAdminEmail}
              onChange={(e) => setNewAdminEmail(e.target.value)}
              required
            />
            <Button type="submit" disabled={loading}>
              <Plus className="h-4 w-4 mr-2" />
              {loading ? "Adding..." : "Add Admin"}
            </Button>
          </form>

          <div className="space-y-3">
            {adminUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No admin users found.
              </p>
            ) : (
              adminUsers.map((admin) => (
                <div key={admin.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge variant="default">Admin</Badge>
                    <span className="font-medium">{admin.email}</span>
                    <span className="text-sm text-muted-foreground">
                      Added {new Date(admin.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRemoveAdmin(admin.id, admin.email)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
