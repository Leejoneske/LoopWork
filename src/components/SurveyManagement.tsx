
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Edit, Trash2, ExternalLink } from "lucide-react";

interface Survey {
  id: string;
  title: string;
  description: string;
  reward_amount: number;
  estimated_time: number;
  status: "available" | "expired" | "completed" | "blocked";
  current_completions: number;
  max_completions: number;
  external_survey_id: string;
  category_id: string;
  expires_at: string;
}

interface Category {
  id: string;
  name: string;
}

export const SurveyManagement = () => {
  const { toast } = useToast();
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingSurvey, setEditingSurvey] = useState<Survey | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    reward_amount: "",
    estimated_time: "",
    max_completions: "",
    external_survey_id: "",
    category_id: "",
    expires_at: ""
  });

  useEffect(() => {
    fetchSurveys();
    fetchCategories();
  }, []);

  const fetchSurveys = async () => {
    try {
      console.log('Fetching surveys...');
      const { data, error } = await supabase
        .from("surveys")
        .select(`
          *,
          survey_categories (name)
        `)
        .order("created_at", { ascending: false });

      console.log('Surveys fetch result:', { data, error });

      if (error) {
        console.error('Error fetching surveys:', error);
        throw error;
      }
      setSurveys(data || []);
    } catch (error: any) {
      console.error('Failed to fetch surveys:', error);
      toast({
        title: "Error fetching surveys",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("survey_categories")
        .select("*")
        .order("name");

      if (error) throw error;
      setCategories(data || []);
    } catch (error: any) {
      toast({
        title: "Error fetching categories",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log('Submitting survey form:', formData);
      
      const surveyData = {
        title: formData.title,
        description: formData.description,
        reward_amount: parseFloat(formData.reward_amount),
        estimated_time: parseInt(formData.estimated_time),
        max_completions: formData.max_completions ? parseInt(formData.max_completions) : null,
        external_survey_id: formData.external_survey_id,
        category_id: formData.category_id || null,
        expires_at: formData.expires_at ? new Date(formData.expires_at).toISOString() : null,
        status: "available" as const
      };

      console.log('Survey data to save:', surveyData);

      let result;
      if (editingSurvey) {
        result = await supabase
          .from("surveys")
          .update(surveyData)
          .eq("id", editingSurvey.id)
          .select();
      } else {
        result = await supabase
          .from("surveys")
          .insert(surveyData)
          .select();
      }

      console.log('Survey save result:', result);

      if (result.error) {
        console.error('Error saving survey:', result.error);
        throw result.error;
      }

      toast({
        title: editingSurvey ? "Survey updated!" : "Survey created!",
        description: `Survey "${formData.title}" has been ${editingSurvey ? "updated" : "created"} successfully.`,
      });

      resetForm();
      await fetchSurveys();
    } catch (error: any) {
      console.error('Failed to save survey:', error);
      toast({
        title: "Error saving survey",
        description: error.message || "Failed to save survey",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (survey: Survey) => {
    setEditingSurvey(survey);
    setFormData({
      title: survey.title,
      description: survey.description || "",
      reward_amount: survey.reward_amount.toString(),
      estimated_time: survey.estimated_time?.toString() || "",
      max_completions: survey.max_completions?.toString() || "",
      external_survey_id: survey.external_survey_id,
      category_id: survey.category_id || "",
      expires_at: survey.expires_at ? new Date(survey.expires_at).toISOString().split('T')[0] : ""
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"? This action cannot be undone.`)) return;

    try {
      console.log('Deleting survey:', { id, title });
      
      const { error } = await supabase
        .from("surveys")
        .delete()
        .eq("id", id);

      console.log('Delete survey result:', { error });

      if (error) {
        console.error('Error deleting survey:', error);
        throw error;
      }

      toast({
        title: "Survey deleted",
        description: `"${title}" has been deleted successfully.`,
      });

      await fetchSurveys();
    } catch (error: any) {
      console.error('Failed to delete survey:', error);
      toast({
        title: "Error deleting survey",
        description: error.message || "Failed to delete survey",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      reward_amount: "",
      estimated_time: "",
      max_completions: "",
      external_survey_id: "",
      category_id: "",
      expires_at: ""
    });
    setEditingSurvey(null);
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Survey Management</h2>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-2" />
          Add New Survey
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingSurvey ? "Edit Survey" : "Add New Survey"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Survey Title *</label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Enter survey title"
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">External Survey URL/ID *</label>
                  <Input
                    value={formData.external_survey_id}
                    onChange={(e) => setFormData({ ...formData, external_survey_id: e.target.value })}
                    placeholder="https://survey-provider.com/survey-id or survey-id"
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Reward Amount (KSh) *</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.reward_amount}
                    onChange={(e) => setFormData({ ...formData, reward_amount: e.target.value })}
                    placeholder="0.00"
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Estimated Time (minutes)</label>
                  <Input
                    type="number"
                    value={formData.estimated_time}
                    onChange={(e) => setFormData({ ...formData, estimated_time: e.target.value })}
                    placeholder="15"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Max Completions</label>
                  <Input
                    type="number"
                    value={formData.max_completions}
                    onChange={(e) => setFormData({ ...formData, max_completions: e.target.value })}
                    placeholder="Leave empty for unlimited"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Category</label>
                  <Select value={formData.category_id} onValueChange={(value) => setFormData({ ...formData, category_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium">Expires At</label>
                  <Input
                    type="date"
                    value={formData.expires_at}
                    onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Survey description..."
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={loading}>
                  {loading ? "Saving..." : editingSurvey ? "Update Survey" : "Create Survey"}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {surveys.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">No surveys found. Create your first survey!</p>
            </CardContent>
          </Card>
        ) : (
          surveys.map((survey) => (
            <Card key={survey.id}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold">{survey.title}</h3>
                      <Badge variant={survey.status === "available" ? "default" : "secondary"}>
                        {survey.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{survey.description}</p>
                    <div className="flex items-center gap-4 text-sm">
                      <span>Reward: KSh {survey.reward_amount}</span>
                      <span>Time: {survey.estimated_time} min</span>
                      <span>Completions: {survey.current_completions}/{survey.max_completions || "∞"}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(survey.external_survey_id.startsWith('http') ? survey.external_survey_id : `https://${survey.external_survey_id}`, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleEdit(survey)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleDelete(survey.id, survey.title)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
