
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Edit, Trash2, Eye, EyeOff } from "lucide-react";
import { SurveyCompletionHandler } from "./SurveyCompletionHandler";
import { useAuth } from "@/hooks/useAuth";

interface Survey {
  id: string;
  title: string;
  description: string;
  external_survey_id: string;
  reward_amount: number;
  estimated_time: number;
  status: string;
  max_completions: number;
  current_completions: number;
  created_at: string;
}

export const SurveyManagement = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    external_survey_id: "",
    reward_amount: 0,
    estimated_time: 10,
    max_completions: 100,
  });

  useEffect(() => {
    fetchSurveys();
  }, []);

  const fetchSurveys = async () => {
    try {
      // Use RPC function or direct query with proper permissions
      const { data, error } = await supabase
        .from("surveys")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSurveys(data || []);
    } catch (error: any) {
      console.error('Error fetching surveys:', error);
      toast({
        title: "Error fetching surveys",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingId) {
        const { error } = await supabase
          .from("surveys")
          .update(formData)
          .eq("id", editingId);

        if (error) throw error;

        toast({
          title: "Survey updated",
          description: "Survey has been updated successfully.",
        });
      } else {
        const { error } = await supabase
          .from("surveys")
          .insert([{ ...formData, status: 'available' }]);

        if (error) throw error;

        toast({
          title: "Survey created",
          description: "Survey has been created successfully.",
        });
      }

      // Reset form
      setFormData({
        title: "",
        description: "",
        external_survey_id: "",
        reward_amount: 0,
        estimated_time: 10,
        max_completions: 100,
      });
      setEditingId(null);
      setShowForm(false);
      await fetchSurveys();
    } catch (error: any) {
      console.error('Error saving survey:', error);
      toast({
        title: editingId ? "Error updating survey" : "Error creating survey",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (survey: Survey) => {
    setFormData({
      title: survey.title,
      description: survey.description,
      external_survey_id: survey.external_survey_id,
      reward_amount: survey.reward_amount,
      estimated_time: survey.estimated_time,
      max_completions: survey.max_completions,
    });
    setEditingId(survey.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return;

    try {
      // First delete related user_surveys to avoid foreign key constraints
      const { error: userSurveysError } = await supabase
        .from("user_surveys")
        .delete()
        .eq("survey_id", id);

      if (userSurveysError) {
        console.warn('Warning deleting user surveys:', userSurveysError);
      }

      // Then delete the survey
      const { error } = await supabase
        .from("surveys")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Survey deleted",
        description: "Survey has been deleted successfully.",
      });

      await fetchSurveys();
    } catch (error: any) {
      console.error('Error deleting survey:', error);
      toast({
        title: "Error deleting survey",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const toggleSurveyStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'available' ? 'blocked' : 'available';
    
    try {
      const { error } = await supabase
        .from("surveys")
        .update({ status: newStatus })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Survey status updated",
        description: `Survey has been ${newStatus === 'available' ? 'activated' : 'blocked'}.`,
      });

      await fetchSurveys();
    } catch (error: any) {
      console.error('Error updating survey status:', error);
      toast({
        title: "Error updating survey status",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const isExternalSurvey = (surveyId: string) => {
    const survey = surveys.find(s => s.id === surveyId);
    return survey?.external_survey_id?.startsWith('http') || survey?.external_survey_id?.includes('cpx');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Survey Management</h2>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-2" />
          {showForm ? "Cancel" : "Add Survey"}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? "Edit Survey" : "Create New Survey"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="title" className="block text-sm font-medium mb-2">
                    Survey Title
                  </label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="external_survey_id" className="block text-sm font-medium mb-2">
                    External Survey ID/URL
                  </label>
                  <Input
                    id="external_survey_id"
                    value={formData.external_survey_id}
                    onChange={(e) => setFormData({ ...formData, external_survey_id: e.target.value })}
                    required
                    placeholder="http://survey-url.com or survey-id"
                  />
                </div>
                
                <div>
                  <label htmlFor="reward_amount" className="block text-sm font-medium mb-2">
                    Reward Amount (KES)
                  </label>
                  <Input
                    id="reward_amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.reward_amount}
                    onChange={(e) => setFormData({ ...formData, reward_amount: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="estimated_time" className="block text-sm font-medium mb-2">
                    Estimated Time (minutes)
                  </label>
                  <Input
                    id="estimated_time"
                    type="number"
                    min="1"
                    value={formData.estimated_time}
                    onChange={(e) => setFormData({ ...formData, estimated_time: parseInt(e.target.value) || 10 })}
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="max_completions" className="block text-sm font-medium mb-2">
                    Max Completions
                  </label>
                  <Input
                    id="max_completions"
                    type="number"
                    min="1"
                    value={formData.max_completions}
                    onChange={(e) => setFormData({ ...formData, max_completions: parseInt(e.target.value) || 100 })}
                    required
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="description" className="block text-sm font-medium mb-2">
                  Description
                </label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>
              
              <Button type="submit" disabled={loading}>
                {loading ? "Processing..." : editingId ? "Update Survey" : "Create Survey"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {surveys.map((survey) => (
          <Card key={survey.id}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-lg">{survey.title}</h3>
                    <Badge variant={survey.status === 'available' ? 'default' : 'secondary'}>
                      {survey.status}
                    </Badge>
                    {isExternalSurvey(survey.id) && (
                      <Badge variant="outline">External</Badge>
                    )}
                  </div>
                  
                  <p className="text-muted-foreground mb-4">{survey.description}</p>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Reward:</span> KES {survey.reward_amount}
                    </div>
                    <div>
                      <span className="font-medium">Time:</span> {survey.estimated_time} min
                    </div>
                    <div>
                      <span className="font-medium">Completions:</span> {survey.current_completions}/{survey.max_completions}
                    </div>
                    <div>
                      <span className="font-medium">Created:</span> {new Date(survey.created_at).toLocaleDateString()}
                    </div>
                  </div>

                  {/* Survey Completion Handler - only show manual button for internal surveys */}
                  <SurveyCompletionHandler
                    surveyId={survey.id}
                    surveyTitle={survey.title}
                    rewardAmount={survey.reward_amount}
                    showManualButton={!isExternalSurvey(survey.id)}
                  />
                </div>
                
                <div className="flex items-center gap-2 ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleSurveyStatus(survey.id, survey.status)}
                    title={survey.status === 'available' ? 'Block Survey' : 'Activate Survey'}
                  >
                    {survey.status === 'available' ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(survey)}
                    title="Edit Survey"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(survey.id, survey.title)}
                    className="text-destructive hover:text-destructive"
                    title="Delete Survey"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {surveys.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground">No surveys found. Create your first survey to get started.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
