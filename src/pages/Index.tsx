import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { TrendingUp, Shield, Wallet, Users } from "lucide-react";

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate("/dashboard");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <h1 className="text-5xl font-bold mb-6 text-foreground">
            Earn Money with <span className="text-primary">LoopWork</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of users earning real money by completing surveys. 
            Share your opinions and get rewarded instantly.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={() => navigate("/auth")} className="text-lg px-8">
              Get Started Today
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/auth")} className="text-lg px-8">
              Sign In
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Why Choose LoopWork?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card>
              <CardHeader className="text-center">
                <TrendingUp className="h-12 w-12 text-primary mx-auto mb-4" />
                <CardTitle>High Rewards</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center">
                  Earn up to KSh 500 per survey with our premium partner network.
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="text-center">
                <Shield className="h-12 w-12 text-primary mx-auto mb-4" />
                <CardTitle>Secure & Safe</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center">
                  Your data is protected with bank-level security and encryption.
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="text-center">
                <Wallet className="h-12 w-12 text-primary mx-auto mb-4" />
                <CardTitle>Instant Payouts</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center">
                  Get paid via M-Pesa, Airtime, or vouchers within 24 hours.
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="text-center">
                <Users className="h-12 w-12 text-primary mx-auto mb-4" />
                <CardTitle>Growing Community</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center">
                  Join over 10,000+ active users earning money daily.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl font-bold mb-6">Ready to Start Earning?</h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
            Sign up now and complete your first survey to earn your welcome bonus!
          </p>
          <Button size="lg" onClick={() => navigate("/auth")} className="text-lg px-8">
            Join LoopWork Now
          </Button>
        </div>
      </section>
    </div>
  );
};

export default Index;
