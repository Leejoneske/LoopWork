import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { MobileHeader } from "@/components/MobileHeader";
import { CPXResearchWidget } from "@/components/CPXResearchWidget";
import { Settings, ExternalLink, AlertCircle, CheckCircle } from "lucide-react";

const CPXSettings = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [appId, setAppId] = useState("");
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    // Check if CPX is already configured
    const savedAppId = localStorage.getItem("cpx_app_id");
    if (savedAppId) {
      setAppId(savedAppId);
      setIsConfigured(true);
    }
  }, []);

  const handleSave = () => {
    if (!appId || appId.trim() === "") {
      toast({
        title: "Error",
        description: "Please enter a valid CPX Research App ID",
        variant: "destructive",
      });
      return;
    }

    localStorage.setItem("cpx_app_id", appId.trim());
    setIsConfigured(true);
    
    toast({
      title: "Settings Saved",
      description: "CPX Research has been configured successfully!",
    });
  };

  const handleReset = () => {
    localStorage.removeItem("cpx_app_id");
    setAppId("");
    setIsConfigured(false);
    
    toast({
      title: "Settings Reset",
      description: "CPX Research configuration has been cleared.",
    });
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
      <MobileHeader />
      
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigate("/dashboard")}>
              ← Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Settings className="h-8 w-8 text-primary" />
                CPX Research Settings
              </h1>
              <p className="text-muted-foreground">Configure your CPX Research integration</p>
            </div>
          </div>
          <Badge variant={isConfigured ? "default" : "secondary"}>
            {isConfigured ? (
              <><CheckCircle className="h-3 w-3 mr-1" /> Configured</>
            ) : (
              <><AlertCircle className="h-3 w-3 mr-1" /> Not Configured</>
            )}
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>CPX Research Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="appId">CPX Research App ID</Label>
                <Input
                  id="appId"
                  type="number"
                  placeholder="Enter your CPX Research App ID"
                  value={appId}
                  onChange={(e) => setAppId(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Find this in your CPX Research publisher dashboard
                </p>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSave} className="flex-1">
                  Save Configuration
                </Button>
                {isConfigured && (
                  <Button variant="outline" onClick={handleReset}>
                    Reset
                  </Button>
                )}
              </div>

              <Alert>
                <ExternalLink className="h-4 w-4" />
                <AlertDescription>
                  Don't have a CPX Research account?{" "}
                  <a 
                    href="https://publisher.cpx-research.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="font-medium underline"
                  >
                    Sign up here
                  </a>{" "}
                  to get your App ID.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Setup Guide */}
          <Card>
            <CardHeader>
              <CardTitle>Setup Guide</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-medium">1. Create CPX Research Account</h4>
                  <p className="text-sm text-muted-foreground">
                    Sign up at{" "}
                    <a 
                      href="https://publisher.cpx-research.com" 
                      target="_blank" 
                      className="underline"
                    >
                      publisher.cpx-research.com
                    </a>
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">2. Add Your Website</h4>
                  <p className="text-sm text-muted-foreground">
                    Add your website domain to your CPX Research publisher account
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">3. Get Your App ID</h4>
                  <p className="text-sm text-muted-foreground">
                    Copy your App ID from the CPX Research dashboard and enter it above
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">4. Configure Postback URL</h4>
                  <p className="text-sm text-muted-foreground">
                    Set your postback URL in CPX Research to:
                  </p>
                  <code className="block text-xs bg-muted p-2 rounded mt-1">
                    {window.location.origin}/api/cpx-postback
                  </code>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Preview */}
        {isConfigured && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Preview</CardTitle>
              <p className="text-sm text-muted-foreground">
                Here's how CPX Research surveys will appear on your site
              </p>
            </CardHeader>
            <CardContent>
              <CPXResearchWidget design="sidebar" limit={3} />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default CPXSettings;