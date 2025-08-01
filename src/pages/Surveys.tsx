
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { SurveyCard } from "@/components/SurveyCard";
import { Search, Filter, RotateCcw } from "lucide-react";

interface Survey {
  id: string;
  title: string;
  description: string;
  reward_amount: number;
  estimated_time: number;
  status: string;
  current_completions: number;
  max_completions: number;
  created_at: string;
}

const Surveys = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [filteredSurveys, setFilteredSurveys] = useState<Survey[]>([]);
  const [loadingSurveys, setLoadingSurveys] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("reward_desc");
  const [timeFilter, setTimeFilter] = useState("all");

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchSurveys();
    }
  }, [user]);

  useEffect(() => {
    applyFilters();
  }, [surveys, searchTerm, sortBy, timeFilter]);

  const fetchSurveys = async () => {
    setLoadingSurveys(true);
    try {
      const { data, error } = await supabase
        .from("surveys")
        .select("*")
        .eq("status", "available")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSurveys(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading surveys",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoadingSurveys(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...surveys];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(survey =>
        survey.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        survey.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Time filter
    if (timeFilter && timeFilter !== "all") {
      filtered = filtered.filter(survey => {
        const time = survey.estimated_time;
        switch (timeFilter) {
          case "short": return time <= 10;
          case "medium": return time > 10 && time <= 30;
          case "long": return time > 30;
          default: return true;
        }
      });
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "reward_desc": return b.reward_amount - a.reward_amount;
        case "reward_asc": return a.reward_amount - b.reward_amount;
        case "time_asc": return a.estimated_time - b.estimated_time;
        case "time_desc": return b.estimated_time - a.estimated_time;
        case "newest": return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        default: return 0;
      }
    });

    setFilteredSurveys(filtered);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSortBy("reward_desc");
    setTimeFilter("all");
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
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/dashboard")}>
              ← Back
            </Button>
            <h1 className="text-2xl font-bold text-primary">Available Surveys</h1>
          </div>
          <Badge variant="secondary" className="bg-primary text-primary-foreground">
            {filteredSurveys.length} surveys
          </Badge>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters & Search
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search surveys..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Sort by</label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reward_desc">Highest Reward</SelectItem>
                    <SelectItem value="reward_asc">Lowest Reward</SelectItem>
                    <SelectItem value="time_asc">Shortest Time</SelectItem>
                    <SelectItem value="time_desc">Longest Time</SelectItem>
                    <SelectItem value="newest">Newest First</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Duration</label>
                <Select value={timeFilter} onValueChange={setTimeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Any duration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any duration</SelectItem>
                    <SelectItem value="short">Short (≤ 10 min)</SelectItem>
                    <SelectItem value="medium">Medium (11-30 min)</SelectItem>
                    <SelectItem value="long">Long (&gt; 30 min)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Actions</label>
                <Button variant="outline" onClick={clearFilters} className="w-full">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Survey Grid */}
        {loadingSurveys ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading surveys...</p>
          </div>
        ) : filteredSurveys.length === 0 ? (
          <div className="text-center py-12">
            <div className="max-w-md mx-auto">
              <p className="text-lg font-medium text-muted-foreground mb-2">
                {surveys.length === 0 ? "No surveys available" : "No surveys match your filters"}
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                  {surveys.length === 0 
                    ? "Check back later for new survey opportunities!"
                    : "Try adjusting your search terms or clearing filters."
                  }
              </p>
              {surveys.length > 0 && (
                <Button variant="outline" onClick={clearFilters}>
                  Clear Filters
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSurveys.map((survey) => (
              <SurveyCard 
                key={survey.id} 
                survey={survey}
                onSurveyStart={fetchSurveys}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Surveys;
