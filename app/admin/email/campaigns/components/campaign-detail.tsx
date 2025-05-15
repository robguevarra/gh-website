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
import { AudienceWarning } from './audience-warning';
import { RecipientPreviewModal } from './recipient-preview-modal';
import { Loader2, Send, Calendar, ArrowLeft, FileText, Mail } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';

// Import template utilities
import { extractVariablesFromContent, generateDefaultVariableValues, substituteVariables } from '@/lib/services/email/template-utils';

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
    updateCampaignFields, // Destructure for cleaner use later if preferred
    // Segments related state and actions
    availableSegments,
    availableSegmentsLoading,
    availableSegmentsError,
    campaignSegments, // Segments linked to the current campaign
    segmentsLoading,  // Loading state for current campaign's segments
    segmentsError,    // Error state for current campaign's segments
    fetchAvailableSegments,
    fetchCampaignSegments,
    addCampaignSegment,
    removeCampaignSegment,
    // Audience size related state and actions
    estimatedAudienceSize, // Destructure for display
    audienceSizeLoading,   // Destructure for display
    audienceSizeError,     // Destructure for display
    fetchEstimatedAudienceSize, // Destructure the action
  } = useCampaignStore();

  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isTestSendModalOpen, setIsTestSendModalOpen] = useState(false);
  const [isLivePreviewModalOpen, setIsLivePreviewModalOpen] = useState(false);
  const [isRecipientPreviewModalOpen, setIsRecipientPreviewModalOpen] = useState(false);
  const [livePreviewInitialData, setLivePreviewInitialData] = useState<{ html: string; subject: string }>({ html: '', subject: '' });

  const unlayerEditorRef = useRef<UnlayerEditorRef>(null);

  useEffect(() => {
    if (campaignId) {
      fetchCampaign(campaignId);
      fetchCampaignAnalytics(campaignId);
      fetchCampaignSegments(campaignId); // Fetch segments for the current campaign
      fetchAvailableSegments(); // Fetch all available segments for selection
      fetchEstimatedAudienceSize(campaignId); // Call the action here
    }
  }, [fetchCampaign, fetchCampaignAnalytics, fetchCampaignSegments, fetchAvailableSegments, fetchEstimatedAudienceSize, campaignId]); // Add to dependency array

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

  const handleTemplateSelected = (template: { id: string; htmlBody: string | null; designJson: any }) => {
    console.log('handleTemplateSelected called with template:', template);
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
      subject: currentCampaign.subject, // Add subject here
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

  const handleOpenLivePreview = async () => {
    if (!currentCampaign || !unlayerEditorRef.current) {
      toast({
        title: 'Cannot Open Preview',
        description: 'Campaign data or editor not ready.',
        variant: 'destructive',
      });
      return;
    }
    try {
      const exportedData = await new Promise<{ design: any; html: string }>((resolve, reject) => {
        if (unlayerEditorRef.current) {
          unlayerEditorRef.current.exportHtml(data => {
            if (data && data.html) {
              resolve(data);
            } else {
              reject(new Error('Failed to export HTML from editor for preview.'));
            }
          });
        } else {
          reject(new Error('Editor reference is not available for preview.'));
        }
      });
      setLivePreviewInitialData({ html: exportedData.html, subject: currentCampaign.subject || 'No Subject Set' });
      setIsLivePreviewModalOpen(true);
    } catch (error: any) {
      toast({
        title: 'Error Preparing Preview',
        description: error.message || 'Could not get content for live preview.',
        variant: 'destructive',
      });
    }
  };

  const CampaignTestSendModal = ({
    isOpen,
    onClose,
    campaign,
    getCampaignContent // Function to get current Unlayer content
  }: {
    isOpen: boolean;
    onClose: () => void;
    campaign: EmailCampaign | null;
    getCampaignContent: () => Promise<{ html: string; design: any } | null>;
  }) => {
    const [recipientEmail, setRecipientEmail] = useState('');
    const [isSendingTest, setIsSendingTest] = useState(false);
    const [testSendError, setTestSendError] = useState<string | null>(null);
    const { toast } = useToast();
    const [variableValues, setVariableValues] = useState<Record<string, string>>({});

    useEffect(() => {
      if (isOpen && campaign) {
        const fetchAndUpdateVariables = async () => {
          try {
            let htmlContent = campaign.campaign_html_body; // Default to stored HTML
            try {
              const contentFromEditor = await getCampaignContent(); // Attempt to get latest from editor
              if (contentFromEditor && contentFromEditor.html) {
                htmlContent = contentFromEditor.html;
              }
            } catch (editorError) {
              console.warn('Could not fetch live content from editor for test send, using stored HTML:', editorError);
              // Fallback to campaign.campaign_html_body is already set
            }

            if (htmlContent) {
              const extracted = extractVariablesFromContent(htmlContent);
              const defaults = generateDefaultVariableValues(extracted);
              setVariableValues(defaults);
            } else {
              setVariableValues({}); // No HTML content, so no variables
            }
          } catch (error) {
            console.error("Error processing campaign variables:", error);
            setTestSendError('Could not load email variables.');
            setVariableValues({});
          }
        };
        fetchAndUpdateVariables();
      }
    }, [isOpen, campaign, getCampaignContent, campaign?.campaign_html_body]); // Added campaign_html_body as a dep

    const handleSendTest = async () => {
      if (!campaign) {
        setTestSendError('Campaign data is not available.');
        return;
      }
      if (!recipientEmail) {
        setTestSendError('Please enter a recipient email address.');
        return;
      }

      setIsSendingTest(true);
      setTestSendError(null);

      try {
        const content = await getCampaignContent();
        if (!content) {
          throw new Error('Could not retrieve campaign content from editor.');
        }

        const campaignSubject = campaign.subject || campaign.name || 'Test Email'; // Use subject, fallback to name or default

        const response = await fetch(`/api/admin/campaigns/${campaign.id}/test`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipientEmail,
            subject: campaignSubject,
            html_content: content.html,
            placeholder_data: variableValues, // Send the current variable values
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || `Failed to send test email (${response.status})`);
        }

        toast({
          title: 'Test Email Sent',
          description: `Successfully sent test email to ${recipientEmail}.`,
        });
        onClose(); // Close modal on success
      } catch (error: any) {
        console.error('Error sending test email:', error);
        setTestSendError(error.message || 'An unknown error occurred.');
        toast({
          title: 'Error Sending Test Email',
          description: error.message || 'An unknown error occurred.',
          variant: 'destructive',
        });
      } finally {
        setIsSendingTest(false);
      }
    };

    if (!isOpen) return null;

    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Send Test Email</DialogTitle>
            <DialogDescription>
              Send a test version of this campaign. Variables will be populated with sample data.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="recipient-email" className="text-right">
                Recipient Email
              </Label>
              <Input
                id="recipient-email"
                type="email"
                value={recipientEmail}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRecipientEmail(e.target.value)}
                placeholder="test@example.com"
                className="col-span-3"
              />
            </div>
            {/* Variable Inputs Section */}
            {Object.keys(variableValues).length > 0 && (
              <div className="my-4 pt-4 border-t">
                <h4 className="mb-2 text-sm font-medium text-center">Email Variables (Sample Data)</h4>
                <div className="max-h-60 overflow-y-auto space-y-3 pr-2">
                  {Object.entries(variableValues).map(([name, value]) => (
                    <div key={name} className="grid grid-cols-4 items-center gap-x-2 gap-y-1">
                      <Label htmlFor={`var-${name}`} className="text-right text-xs truncate col-span-1" title={name}>
                        {name}
                      </Label>
                      <Input
                        id={`var-${name}`}
                        value={value}
                        onChange={(e) => setVariableValues(prev => ({ ...prev, [name]: e.target.value }))}
                        className="col-span-3 h-8 text-xs"
                        placeholder={`Sample for ${name}`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
            {testSendError && (
              <p className="text-sm text-destructive col-span-4 text-center mt-2">{testSendError}</p>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="button" onClick={handleSendTest} disabled={isSendingTest}>
              {isSendingTest ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send Test
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  const getUnlayerContent = async () => {
    if (unlayerEditorRef.current) {
      return new Promise<{ html: string; design: any }>((resolve, reject) => {
        unlayerEditorRef.current!.exportHtml(data => {
          if (data && data.design && data.html) {
            resolve(data);
          } else {
            reject(new Error('Failed to export valid data from Unlayer editor.'));
          }
        });
      });
    }
    return null;
  };

  const LivePreviewModal = ({
    isOpen,
    onClose,
    initialHtml,
    initialSubject,
  }: {
    isOpen: boolean;
    onClose: () => void;
    initialHtml: string;
    initialSubject: string;
  }) => {
    const [extractedVariables, setExtractedVariables] = useState<string[]>([]);
    const [variableValues, setVariableValues] = useState<Record<string, string>>({});
    const [previewHtml, setPreviewHtml] = useState<string>('');

    useEffect(() => {
      if (isOpen && initialHtml) {
        const vars = extractVariablesFromContent(initialHtml);
        setExtractedVariables(vars);
        setVariableValues(generateDefaultVariableValues(vars));
      }
    }, [isOpen, initialHtml]);

    useEffect(() => {
      if (initialHtml && Object.keys(variableValues).length > 0) {
        setPreviewHtml(substituteVariables(initialHtml, variableValues));
      } else if (initialHtml) {
        // If no variables or values, show initial HTML
        setPreviewHtml(initialHtml);
      }
    }, [initialHtml, variableValues]);

    const handleVariableChange = (variableName: string, value: string) => {
      setVariableValues(prev => ({ ...prev, [variableName]: value }));
    };

    if (!isOpen) return null;

    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-2xl md:max-w-3xl lg:max-w-4xl xl:max-w-5xl h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Live Email Preview: {initialSubject}</DialogTitle>
            <DialogDescription>
              Enter sample data for the detected variables to see a live preview. Changes here are not saved.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-grow min-h-0">
            <div className="md:col-span-1 space-y-4 overflow-y-auto pr-2 border-r">
              <h3 className="text-lg font-semibold mb-2">Variables</h3>
              {extractedVariables.length === 0 && <p className="text-sm text-muted-foreground">No variables detected in content.</p>}
              {extractedVariables.map(variable => (
                <div key={variable} className="space-y-1">
                  <Label htmlFor={`var-${variable}`}>{variable}</Label>
                  <Input
                    id={`var-${variable}`}
                    value={variableValues[variable] || ''}
                    onChange={(e) => handleVariableChange(variable, e.target.value)}
                    placeholder={`Sample ${variable}`}
                  />
                </div>
              ))}
            </div>
            <div className="md:col-span-2 overflow-y-auto pl-2">
              <h3 className="text-lg font-semibold mb-2">Preview</h3>
              <div
                className="border rounded-md p-4 bg-white h-full min-h-[300px] prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            </div>
          </div>
          <DialogFooter className="mt-auto pt-4">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Close
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
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

  const canSendOrSchedule = currentCampaign?.status === 'draft' || currentCampaign?.status === 'scheduled';
  const sendButtonText = currentCampaign?.status === 'scheduled' ? 'Reschedule/Send Now' : 'Send Campaign';

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
              <Button onClick={handleSaveCampaign} disabled={isSavingDraft || currentCampaignLoading} className="mr-2">
                {isSavingDraft ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save Draft
              </Button>
              <Button onClick={() => setIsTestSendModalOpen(true)} variant="outline" className="mr-2">
                <Mail className="mr-2 h-4 w-4" /> Send Test Email
              </Button>
              <Button onClick={handleOpenLivePreview} variant="outline" className="mr-2">
                <FileText className="mr-2 h-4 w-4" /> Live Preview
              </Button>
              <Button onClick={handleSendCampaign} disabled={isSending || !canSendOrSchedule} >
                {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                {sendButtonText}
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
          {currentCampaign && (
            <div className="mt-4">
              <Label htmlFor="campaignSubject" className="text-sm font-medium">
                Campaign Subject
              </Label>
              <Input
                id="campaignSubject"
                placeholder="Enter campaign subject"
                value={currentCampaign?.subject || ''}
                onChange={(e) => {
                  if (currentCampaign) {
                    updateCampaignFields({ // Or useCampaignStore.getState().updateCampaignFields
                      id: currentCampaign.id,
                      changes: { subject: e.target.value }
                    });
                  }
                }}
                className="mt-1"
              />
            </div>
          )}
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
                    console.log('[CampaignDetail] isTemplateModalOpen attempted to be set to true. Current value in this render cycle:', isTemplateModalOpen);
                  }}
                  variant="outline"
                >
                  <FileText className="mr-2 h-4 w-4" /> Load from Template
                </Button>
                <Button onClick={() => setIsTestSendModalOpen(true)} variant="secondary" disabled={!currentCampaign?.selected_template_id}>
                  <Mail className="mr-2 h-4 w-4" />
                  Send Test Email
                </Button>
              </div>

              {currentCampaign.campaign_design_json !== undefined ? (
                <UnlayerEmailEditor
                  key={JSON.stringify(currentCampaign.campaign_design_json)} 
                  ref={unlayerEditorRef}
                  initialDesign={currentCampaign.campaign_design_json ?? undefined}
                  initialHtml={currentCampaign.campaign_html_body ?? undefined}
                />
              ) : (
                <div className="text-center py-8 text-muted-foreground border rounded-md min-h-[300px] flex flex-col justify-center items-center">
                  <p>No content loaded, or campaign is still loading.</p>
                  <p className="text-sm">Load a template or ensure campaign data is fully fetched.</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="targeting">
              <Card>
                <CardHeader>
                  <CardTitle>Audience Targeting</CardTitle>
                  <CardDescription>
                    Select user segments to target with this campaign.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium mb-2">Select Segments</h3>
                    {(availableSegmentsLoading || segmentsLoading) && <p><Loader2 className="mr-2 h-4 w-4 animate-spin inline" /> Loading segments...</p>}
                    {availableSegmentsError && <p className="text-red-500">Error loading available segments: {availableSegmentsError}</p>}
                    {segmentsError && <p className="text-red-500">Error loading campaign segments: {segmentsError}</p>}
                    
                    {!availableSegmentsLoading && !availableSegmentsError && availableSegments && availableSegments.length === 0 && (
                      <p>No segments available to select.</p>
                    )}

                    {!availableSegmentsLoading && !segmentsLoading && availableSegments && availableSegments.length > 0 && (
                      <div className="space-y-2 max-h-96 overflow-y-auto border rounded-md p-4">
                        {availableSegments.map(segment => {
                          const isSelected = campaignSegments.some(cs => cs.segment_id === segment.id);
                          return (
                            <div key={segment.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`segment-${segment.id}`}
                                checked={isSelected}
                                onCheckedChange={(checked) => {
                                  if (!currentCampaign) return;
                                  if (checked) {
                                    addCampaignSegment(currentCampaign.id, segment.id)
                                      .catch(err => toast({ title: 'Error adding segment', description: err.message, variant: 'destructive' }));
                                  } else {
                                    removeCampaignSegment(currentCampaign.id, segment.id)
                                      .catch(err => toast({ title: 'Error removing segment', description: err.message, variant: 'destructive' }));
                                  }
                                }}
                              />
                              <Label htmlFor={`segment-${segment.id}`} className="font-normal">
                                {segment.name}
                                {segment.description && <span className="text-sm text-muted-foreground ml-2">({segment.description})</span>}
                              </Label>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Display Estimated Audience Size */}
                  <Separator className="my-4" />
                  <div>
                    <h3 className="text-lg font-medium mb-2">Estimated Audience Size</h3>
                    {audienceSizeLoading && <p><Loader2 className="mr-2 h-4 w-4 animate-spin inline" /> Calculating...</p>}
                    {audienceSizeError && <p className="text-red-500">Error estimating audience: {audienceSizeError}</p>}
                    {!audienceSizeLoading && !audienceSizeError && estimatedAudienceSize !== null && (
                      <>
                        <div className="flex items-center gap-2">
                          <p className="text-2xl font-bold">{estimatedAudienceSize.toLocaleString()}</p>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setIsRecipientPreviewModalOpen(true)}
                            disabled={estimatedAudienceSize === 0}
                          >
                            Preview Recipients
                          </Button>
                        </div>
                        <AudienceWarning size={estimatedAudienceSize} />
                      </>
                    )}
                    {!audienceSizeLoading && !audienceSizeError && estimatedAudienceSize === null && (
                      <p className="text-muted-foreground">Select segments to see an estimate.</p>
                    )}
                  </div>
                  {/* TODO: Dynamic Audience Size Estimation (II.B) - This is now implemented above */}
                  {/* TODO: (Optional) Advanced Logic: Segment AND/OR, exclusion (II.C) */}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analytics">
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

      <CampaignTestSendModal 
        isOpen={isTestSendModalOpen}
        onClose={() => setIsTestSendModalOpen(false)}
        campaign={currentCampaign}
        getCampaignContent={getUnlayerContent}
      />

      {isTemplateModalOpen && currentCampaign && (
        <TemplateSelectionModal
          isOpen={isTemplateModalOpen}
          onClose={() => setIsTemplateModalOpen(false)}
          onTemplateSelect={handleTemplateSelected}
        />
      )}

      <LivePreviewModal 
        isOpen={isLivePreviewModalOpen}
        onClose={() => setIsLivePreviewModalOpen(false)}
        initialHtml={livePreviewInitialData.html}
        initialSubject={livePreviewInitialData.subject}
      />

      {currentCampaign && (
        <RecipientPreviewModal
          isOpen={isRecipientPreviewModalOpen}
          onClose={() => setIsRecipientPreviewModalOpen(false)}
          campaignId={currentCampaign.id}
        />
      )}
    </div>
  );
}
