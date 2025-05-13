'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useCampaignStore } from '@/lib/hooks/use-campaign-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Send, Calendar, ArrowLeft, FileText } from 'lucide-react';

import { TemplateSelectionModal } from './template-selection-modal';
import UnlayerEmailEditor, { EditorRef as UnlayerEditorRef } from '@/app/admin/email-templates/unlayer-email-editor';
import { EmailCampaign } from '@/lib/supabase/data-access/campaign-management';

interface CampaignDetailProps {
  campaignId: string;
}

export function CampaignDetail({ campaignId }: CampaignDetailProps) {
  const router = useRouter();
  const { toast } = useToast();
  const {
    currentCampaign,
    currentCampaignLoading,
    currentCampaignError,
    fetchCampaign,
    campaignAnalytics,
    analyticsLoading,
    fetchCampaignAnalytics,
    sendCampaign,
    updateCampaign,
    createCampaign,
  } = useCampaignStore();

  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);

  const unlayerEditorRef = useRef<UnlayerEditorRef>(null);

  useEffect(() => {
    if (campaignId) {
      fetchCampaign(campaignId);
      fetchCampaignAnalytics(campaignId);
    }
  }, [fetchCampaign, fetchCampaignAnalytics, campaignId]);

  const handleSendCampaign = async () => {
    setIsSending(true);
    try {
      await sendCampaign(campaignId);
      toast({
        title: 'Campaign sending initiated',
        description: 'Your campaign is now being sent to recipients.',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send campaign',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="outline">Draft</Badge>;
      case 'scheduled':
        return <Badge variant="secondary">Scheduled</Badge>;
      case 'sending':
        return <Badge variant="default">Sending</Badge>;
      case 'completed':
        return <Badge variant="default">Completed</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleString();
  };

  const handleTemplateSelected = (template: { id: string; htmlBody: string; designJson: any }) => {
    console.log('handleTemplateSelected called with template:', template); // Log received template data
    if (updateCampaign && currentCampaign) {
      console.log('Before updateCampaign - currentCampaign.id:', currentCampaign.id);
      console.log('Before updateCampaign - changes to be applied:', {
        selected_template_id: template.id,
        campaign_html_body: template.htmlBody,
        campaign_design_json: template.designJson,
      });
      updateCampaign(currentCampaign.id, {
        selected_template_id: template.id,
        campaign_html_body: template.htmlBody,
        campaign_design_json: template.designJson,
      });
      console.log('After updateCampaign was called.');
    } else {
      console.error('handleTemplateSelected: updateCampaign is not available or currentCampaign is null.');
      if (!currentCampaign) console.error('currentCampaign is null/undefined');
      if (!updateCampaign) console.error('updateCampaign is null/undefined');
    }
    setIsTemplateModalOpen(false);
  };

  const handleSaveCampaign = async () => {
    if (!currentCampaign || !unlayerEditorRef.current || (!updateCampaign && campaignId !== 'new') || (!createCampaign && campaignId === 'new') ) {
      toast({ title: 'Error', description: 'Campaign data not loaded, editor not ready, or save action unavailable.', variant: 'destructive' });
      return;
    }
    setIsSavingDraft(true);

    let latestHtml = currentCampaign.campaign_html_body;
    let latestDesign = currentCampaign.campaign_design_json;

    try {
      const exportedData = await new Promise<{ design: any; html: string }>((resolve, reject) => {
        if (unlayerEditorRef.current) {
          unlayerEditorRef.current.exportHtml(data => {
            if (data && data.design && data.html) {
              resolve(data);
            } else {
              reject(new Error('Failed to export valid data from Unlayer editor.')); 
            }
          });
        } else {
          reject(new Error('Editor reference is not available.'));
        }
        // Optional: Add a timeout for robustness
        // setTimeout(() => reject(new Error('Unlayer export timed out')), 5000);
      });
      latestHtml = exportedData.html;
      latestDesign = exportedData.design;
    } catch (exportError: any) {
      console.error('Failed to export from Unlayer editor:', exportError);
      toast({ title: 'Editor Export Error', description: exportError.message || 'Could not get latest content from editor.', variant: 'destructive' });
      setIsSavingDraft(false);
      return; 
    }

    const campaignDataToSave: Partial<EmailCampaign> = {
      // Ensure to get current name, etc., from state if they are bound to input fields
      // For this example, assuming currentCampaign holds the latest editable fields like name
      name: currentCampaign.name, 
      // description: currentCampaign.description, // if you have this field
      selected_template_id: currentCampaign.selected_template_id,
      campaign_html_body: latestHtml,
      campaign_design_json: latestDesign,
      status: 'draft', 
    };

    try {
      if (campaignId === 'new' && createCampaign) { // Assuming 'new' is the identifier for a new campaign
        // Remove 'id' if it was part of currentCampaign for a 'new' scenario, or ensure createCampaign handles it.
        const { id, ...newData } = campaignDataToSave; // Basic way to omit id, ensure EmailCampaign partial accepts this
        const newCampaign = await createCampaign(newData);
        toast({ title: 'Campaign Draft Created', description: 'New campaign draft saved successfully.' });
        // Optionally, navigate to the new campaign's edit page
        router.push(`/admin/email/campaigns/${newCampaign.id}`);
      } else if (updateCampaign) {
        await updateCampaign(currentCampaign.id, campaignDataToSave);
        toast({ title: 'Campaign Draft Saved', description: 'Your campaign draft has been updated.' });
      }
      // Re-fetch campaign data to ensure UI is consistent with DB, especially if createCampaign doesn't update currentCampaign
      if (campaignId && campaignId !== 'new') fetchCampaign(campaignId);

    } catch (error: any) {
      toast({ title: 'Error Saving Draft', description: error.message || 'Failed to save campaign draft.', variant: 'destructive' });
    } finally {
      setIsSavingDraft(false);
    }
  };

  if (currentCampaignLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (currentCampaignError) {
    return (
      <div className="text-center py-8 text-destructive">
        {currentCampaignError}
      </div>
    );
  }

  if (!currentCampaign) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Campaign not found.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => router.push('/admin/email/campaigns')}
          className="flex items-center"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Campaigns
        </Button>

        <div className="flex space-x-2">
          {currentCampaign.status === 'draft' && (
            <>
              <Button onClick={handleSaveCampaign} variant="outline" disabled={isSavingDraft}>
                {isSavingDraft && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} 
                Save Draft
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push(`/admin/email/campaigns/${campaignId}/schedule`)}
              >
                <Calendar className="mr-2 h-4 w-4" />
                Schedule
              </Button>
              <Button
                onClick={handleSendCampaign}
                disabled={isSending}
              >
                {isSending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Send Now
                  </>
                )}
              </Button>
            </>
          )}

          {currentCampaign.status === 'scheduled' && (
            <Button
              onClick={handleSendCampaign}
              disabled={isSending}
            >
              {isSending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send Now
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="text-2xl">{currentCampaign.name}</CardTitle>
              <CardDescription>{currentCampaign.description}</CardDescription>
            </div>
            <div className="mt-2 md:mt-0">
              {getStatusBadge(currentCampaign.status)}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="overview" className="mt-4">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="content">Content</TabsTrigger>
              <TabsTrigger value="targeting">Targeting</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Created</h3>
                  <p>{formatDate(currentCampaign.created_at)}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Last Updated</h3>
                  <p>{formatDate(currentCampaign.updated_at)}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Scheduled For</h3>
                  <p>{formatDate(currentCampaign.scheduled_at)}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Completed</h3>
                  <p>{formatDate(currentCampaign.completed_at)}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Sender Name</h3>
                  <p>{currentCampaign.sender_name}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Sender Email</h3>
                  <p>{currentCampaign.sender_email}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">A/B Testing</h3>
                  <p>{currentCampaign.is_ab_test ? 'Enabled' : 'Disabled'}</p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="content" className="space-y-4 mt-4">
              <div className="flex justify-end mb-4">
                <Button 
                  onClick={() => {
                    console.log('[CampaignDetail] Load from Template button CLICKED.');
                    setIsTemplateModalOpen(true);
                    // Log state immediately after setting (note: state updates might be async, 
                    // so this log shows the value *before* potential re-render with new state)
                    // A useEffect watching isTemplateModalOpen would be more definitive for seeing the *updated* state.
                    console.log('[CampaignDetail] isTemplateModalOpen attempted to be set to true. Current value in this render cycle:', isTemplateModalOpen);
                  }}
                  variant="outline"
                >
                  <FileText className="mr-2 h-4 w-4" /> Load from Template
                </Button>
              </div>

              {(() => {
                return null; // Ensure a valid ReactNode is returned
              })()}

              {currentCampaign.campaign_design_json !== undefined ? (
                <UnlayerEmailEditor
                  key={JSON.stringify(currentCampaign.campaign_design_json)} // Key ensures re-render if design_json object changes reference
                  ref={unlayerEditorRef}
                  initialDesign={currentCampaign.campaign_design_json}
                  initialHtml={currentCampaign.campaign_html_body}
                />
              ) : (
                <div className="text-center py-8 text-muted-foreground border rounded-md min-h-[300px] flex flex-col justify-center items-center">
                  <p>No content loaded, or campaign is still loading.</p>
                  <p className="text-sm">Load a template or ensure campaign data is fully fetched.</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="targeting" className="space-y-4 mt-4">
              <div className="text-center py-4 text-muted-foreground">
                Segment targeting interface will be implemented here.
              </div>
            </TabsContent>

            <TabsContent value="analytics" className="mt-4">
              {analyticsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : !campaignAnalytics ? (
                <div className="text-center py-4 text-muted-foreground">
                  No analytics data available yet.
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-2xl font-bold">{campaignAnalytics.total_recipients}</div>
                        <p className="text-xs text-muted-foreground">Recipients</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-2xl font-bold">{campaignAnalytics.total_sent}</div>
                        <p className="text-xs text-muted-foreground">Sent</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-2xl font-bold">{campaignAnalytics.total_opens}</div>
                        <p className="text-xs text-muted-foreground">Opens</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-2xl font-bold">{campaignAnalytics.total_clicks}</div>
                        <p className="text-xs text-muted-foreground">Clicks</p>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-2xl font-bold">{campaignAnalytics.open_rate.toFixed(2)}%</div>
                        <p className="text-xs text-muted-foreground">Open Rate</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-2xl font-bold">{campaignAnalytics.click_rate.toFixed(2)}%</div>
                        <p className="text-xs text-muted-foreground">Click Rate</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-2xl font-bold">{campaignAnalytics.bounce_rate.toFixed(2)}%</div>
                        <p className="text-xs text-muted-foreground">Bounce Rate</p>
                      </CardContent>
                    </Card>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium mb-2">Last Updated</h3>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(campaignAnalytics.last_calculated_at)}
                    </p>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      onClick={() => fetchCampaignAnalytics(campaignId, true)}
                    >
                      Refresh Analytics
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <TemplateSelectionModal
        isOpen={isTemplateModalOpen}
        onClose={() => {
          console.log('[CampaignDetail] TemplateSelectionModal onClose called.');
          setIsTemplateModalOpen(false);
        }}
        onTemplateSelect={handleTemplateSelected}
      />
    </div>
  );
}
