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
import { Loader2, Send, Calendar, ArrowLeft, FileText, Mail, CheckCircle, Save } from 'lucide-react';
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
  const [isEditorReady, setIsEditorReady] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [editorKey, setEditorKey] = useState(Date.now());
  const [isTestSendModalOpen, setIsTestSendModalOpen] = useState(false);
  const [isLivePreviewModalOpen, setIsLivePreviewModalOpen] = useState(false);
  const [isRecipientPreviewModalOpen, setIsRecipientPreviewModalOpen] = useState(false);
  const [livePreviewInitialData, setLivePreviewInitialData] = useState<{ html: string; subject: string }>({ html: '', subject: '' });
  const [activeTab, setActiveTab] = useState<string>('overview');

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

  const handleTemplateSelected = async (template: { id: string; htmlBody: string | null; designJson: any }) => {
    console.log('handleTemplateSelected called with template:', template);
    if (currentCampaign && updateCampaign) {
      try {
        await updateCampaign(currentCampaign.id, {
          selected_template_id: template.id,
          campaign_design_json: template.designJson,
          campaign_html_body: template.htmlBody,
        });
        // Reset the editor to apply the new template
        resetEditor();
      } catch (error) {
        console.error('Failed to update campaign with template:', error);
        toast({
          title: 'Error',
          description: 'Failed to apply template',
          variant: 'destructive',
        });
      }
    } else {
      console.error('handleTemplateSelected: updateCampaign is not available or currentCampaign is null.');
      if (!currentCampaign) console.error('currentCampaign is null/undefined');
      if (!updateCampaign) console.error('updateCampaign is null/undefined');
    }
    setIsTemplateModalOpen(false);
  };

  const handleEditorLoad = () => {
    console.log('Unlayer editor loaded and ready');
    setIsEditorReady(true);
  };

  const resetEditor = () => {
    console.log('Resetting editor...');
    setIsEditorReady(false);
    setEditorKey(Date.now());
  };

  const handleSaveCampaign = async () => {
    console.log('handleSaveCampaign called');
    console.log('currentCampaign:', currentCampaign);
    console.log('unlayerEditorRef.current:', unlayerEditorRef.current);
    console.log('isEditorReady:', isEditorReady);
    console.log('updateCampaign available:', !!updateCampaign);
    console.log('createCampaign available:', !!createCampaign);
    
    // Check if editor is ready
    if (!isEditorReady) {
      const errorMsg = 'Editor is still loading. Please wait a moment and try again.';
      console.error('Cannot save campaign:', errorMsg);
      toast({ 
        title: 'Editor Not Ready', 
        description: errorMsg, 
        variant: 'destructive' 
      });
      return;
    }
    
    // Check other conditions
    if (!currentCampaign || !unlayerEditorRef.current || 
        (!updateCampaign && campaignId !== 'new') || 
        (!createCampaign && campaignId === 'new')) {
      const errorMsg = !currentCampaign ? 'No current campaign' : 
                        !unlayerEditorRef.current ? 'Editor reference not available' : 
                        (!updateCampaign && campaignId !== 'new') ? 'Update function not available' : 'Create function not available';
      console.error('Cannot save campaign:', errorMsg);
      toast({ 
        title: 'Error', 
        description: `Cannot save campaign: ${errorMsg}`, 
        variant: 'destructive' 
      });
      return;
    }
    
    setIsSavingDraft(true);
    console.log('Starting save process...');

    let latestHtml = currentCampaign.campaign_html_body;
    let latestDesign = currentCampaign.campaign_design_json;
    console.log('Initial HTML and design loaded from current campaign');

    try {
      console.log('Starting Unlayer export...');
      const exportedData = await new Promise<{ design: any; html: string }>((resolve, reject) => {
        if (unlayerEditorRef.current) {
          console.log('Exporting HTML and design from Unlayer...');
          unlayerEditorRef.current.exportHtml(data => {
            console.log('Unlayer export callback received data:', !!data);
            if (data && data.design && data.html) {
              console.log('Successfully exported data from Unlayer');
              resolve(data);
            } else {
              const error = new Error('Failed to export valid data from Unlayer editor.');
              console.error('Unlayer export error:', error, 'Data received:', data);
              reject(error);
            }
          });
        } else {
          const error = new Error('Editor reference is not available.');
          console.error('Unlayer editor reference error:', error);
          reject(error);
        }
      });
      latestHtml = exportedData.html;
      latestDesign = exportedData.design;
      console.log('Successfully updated latest HTML and design from Unlayer export');
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
    
    console.log('Prepared campaign data to save:', {
      ...campaignDataToSave,
      campaign_html_body: '[HTML content]',  // Don't log full HTML
      campaign_design_json: '[Design JSON]'  // Don't log full design
    });

    try {
      if (campaignId === 'new' && createCampaign) {
        console.log('Creating new campaign...');
        const { id, ...newData } = campaignDataToSave;
        console.log('Calling createCampaign with data:', newData);
        
        const newCampaign = await createCampaign(newData);
        console.log('Campaign created successfully:', newCampaign);
        
        toast({ 
          title: 'Campaign Draft Created', 
          description: 'New campaign draft saved successfully.' 
        });
        
        // Navigate to the new campaign's edit page
        console.log('Navigating to new campaign:', newCampaign.id);
        router.push(`/admin/email/campaigns/${newCampaign.id}`);
      } else if (updateCampaign) {
        console.log('Updating existing campaign:', currentCampaign.id);
        console.log('Calling updateCampaign with data:', {
          ...campaignDataToSave,
          campaign_html_body: '[HTML content]',
          campaign_design_json: '[Design JSON]'
        });
        
        await updateCampaign(currentCampaign.id, campaignDataToSave);
        console.log('Campaign updated successfully');
        
        toast({ 
          title: 'Campaign Draft Saved', 
          description: 'Your campaign draft has been updated.' 
        });
      } else {
        console.error('No valid action available for saving');
        throw new Error('No valid save action available');
      }
      
      // Re-fetch campaign data to ensure UI is consistent with DB
      if (campaignId && campaignId !== 'new') {
        console.log('Refreshing campaign data...');
        await fetchCampaign(campaignId);
      }
      
      console.log('Save process completed successfully');

    } catch (error: any) {
      console.error('Error in handleSaveCampaign:', error);
      toast({ 
        title: 'Error Saving Draft', 
        description: error.message || 'Failed to save campaign draft.', 
        variant: 'destructive' 
      });
    } finally {
      console.log('Cleaning up save process');
      setIsSavingDraft(false);
    }
  };

  const handleOpenLivePreview = async () => {
    try {
      if (!currentCampaign) {
        throw new Error('Campaign data not ready');
      }

      let content;
      if (unlayerEditorRef.current) {
        content = await new Promise<{ html: string; design: any }>((resolve, reject) => {
          unlayerEditorRef.current?.exportHtml((data: any) => {
            if (data && data.design && data.html) {
              resolve(data);
            } else {
              reject(new Error('Invalid content from editor'));
            }
          });
        });
      } else if (currentCampaign.campaign_html_body) {
        content = { html: currentCampaign.campaign_html_body, design: null };
      } else {
        throw new Error('No content available for preview');
      }
      
      setLivePreviewInitialData({
        html: content.html,
        subject: currentCampaign.subject || 'Email Preview'
      });
      setIsLivePreviewModalOpen(true);
    } catch (error) {
      console.error('Error preparing live preview:', error);
      toast({
        title: 'Preview Error',
        description: 'Could not prepare email preview. ' + (error instanceof Error ? error.message : 'Please try again.'),
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
              <h3 className="text-lg font-medium mb-2">Variables</h3>
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
              <h3 className="text-lg font-medium mb-2">Preview</h3>
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
        <div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              onClick={() => router.push('/admin/email/campaigns')}
              className="h-8 w-8 p-0"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back</span>
            </Button>
            <h1 className="text-2xl font-bold">{currentCampaign?.name || 'Loading...'}</h1>
          </div>
          <div className="flex items-center space-x-4 mt-1">
            {currentCampaign?.status && (
              <div className="flex items-center text-sm text-muted-foreground">
                <span className="capitalize">{currentCampaign.status}</span>
                {currentCampaign.updated_at && (
                  <span className="mx-2">•</span>
                )}
                {currentCampaign.updated_at && (
                  <span>Last saved: {formatDate(currentCampaign.updated_at)}</span>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="flex space-x-2">
          <Button
            onClick={handleSendCampaign}
            disabled={isSending || currentCampaignLoading}
            className="bg-green-600 hover:bg-green-700"
          >
            {isSending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                {sendButtonText}
              </>
            )}
          </Button>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Campaign Details</CardTitle>
          <div className="space-y-4">
            <div>
              <Label htmlFor="campaignSubject">Subject</Label>
              <Input
                id="campaignSubject"
                placeholder="Enter campaign subject"
                value={currentCampaign?.subject || ''}
                onChange={(e) => {
                  if (currentCampaign) {
                    updateCampaignFields({
                      id: currentCampaign.id,
                      changes: { subject: e.target.value }
                    });
                  }
                }}
                className="mt-1"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="content">Content</TabsTrigger>
              <TabsTrigger value="targeting">Targeting</TabsTrigger>
              <TabsTrigger 
                value="review" 
                className={`flex items-center gap-1 ${activeTab === 'review' ? 'bg-primary text-primary-foreground' : ''}`}
              >
                <CheckCircle className="h-4 w-4" />
                <span>Review & Send</span>
              </TabsTrigger>
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

            <TabsContent value="content" id="content-section" className="space-y-4 mt-4">
              <div className="flex justify-between items-center mb-4">
                <div className="flex space-x-2">
                  <Button
                    onClick={handleSaveCampaign}
                    disabled={isSavingDraft || !isEditorReady}
                    variant="outline"
                  >
                    {isSavingDraft ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Draft
                      </>
                    )}
                  </Button>
                </div>
                <div className="flex space-x-2">
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
                  <Button 
                    onClick={() => setIsTestSendModalOpen(true)} 
                    variant="secondary" 
                    disabled={!currentCampaign?.selected_template_id}
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    Send Test Email
                  </Button>
                </div>
              </div>

              {currentCampaign.campaign_design_json !== undefined ? (
                <div className="relative h-full">
                  {!isEditorReady && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-8 w-8 animate-spin" />
                        <p className="text-sm text-muted-foreground">Loading editor...</p>
                      </div>
                    </div>
                  )}
                  <UnlayerEmailEditor
                    key={editorKey}
                    ref={unlayerEditorRef}
                    onLoad={handleEditorLoad}
                    initialDesign={currentCampaign.campaign_design_json ?? undefined}
                    initialHtml={currentCampaign.campaign_html_body ?? undefined}
                    minHeight="600px"
                  />
                </div>
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
                                onChange={(checked) => {
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

            <TabsContent value="review" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Review & Send Campaign</CardTitle>
                  <CardDescription>
                    Review all campaign details before sending to your audience.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Campaign Details */}
                  <div>
                    <h3 className="text-lg font-medium mb-2">Campaign Details</h3>
                    <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Campaign Name</p>
                        <p>{currentCampaign.name}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Subject Line</p>
                        <p>{currentCampaign.subject || 'No subject set'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">From</p>
                        <p>{currentCampaign.sender_name} &lt;{currentCampaign.sender_email}&gt;</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Scheduled For</p>
                        <p>{currentCampaign.scheduled_at ? formatDate(currentCampaign.scheduled_at) : 'Send immediately'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Audience Summary */}
                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium">Audience</h3>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setActiveTab('targeting')}
                        className="text-primary"
                      >
                        Edit
                      </Button>
                    </div>
                    <div className="mt-2 space-y-2">
                      {campaignSegments && campaignSegments.length > 0 ? (
                        <div>
                          <p className="text-sm text-muted-foreground">Targeting {campaignSegments.length} segment(s)</p>
                          <ul className="list-disc list-inside text-sm mt-1 space-y-1">
                            {campaignSegments.map(segment => (
                              <li key={segment.id} className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-green-500" />
                                <span className="text-sm font-medium">{segment.segment?.name || 'Unnamed Segment'}</span>
                                {segment.segment?.description && (
                                  <span className="text-xs text-muted-foreground">
                                    ({segment.segment.description})
                                  </span>
                                )}
                              </li>
                            ))}
                          </ul>
                          <p className="mt-2">
                            <span className="font-medium">Estimated recipients:</span>{' '}
                            {audienceSizeLoading ? (
                              <span><Loader2 className="inline h-3 w-3 animate-spin mr-1" />Calculating...</span>
                            ) : audienceSizeError ? (
                              <span className="text-destructive">Error loading estimate</span>
                            ) : (
                              <span>{estimatedAudienceSize?.toLocaleString() || 0} recipients</span>
                            )}
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No segments selected</p>
                      )}
                    </div>
                  </div>

                  {/* Content Preview */}
                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium">Content Preview</h3>
                      <div className="space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => {
                            setActiveTab('content');
                            // Smooth scroll to content section after a small delay to allow tab switch
                            setTimeout(() => {
                              const contentSection = document.getElementById('content-section');
                              if (contentSection) {
                                window.scrollTo({
                                  top: contentSection.offsetTop - 20,
                                  behavior: 'smooth'
                                });
                              }
                            }, 100);
                          }}
                        >
                          Edit Content
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={handleOpenLivePreview}
                        >
                          Live Preview
                        </Button>
                      </div>
                    </div>
                    <div className="mt-2 border rounded-md p-4 bg-muted/20">
                      <h4 className="font-medium mb-1">{currentCampaign.subject || 'No subject'}</h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        {currentCampaign.campaign_html_body 
                          ? `${currentCampaign.campaign_html_body.substring(0, 150)}${currentCampaign.campaign_html_body.length > 150 ? '...' : ''}` 
                          : 'No content'}
                      </p>
                      <Button 
                        variant="link" 
                        size="sm" 
                        className="p-0 h-auto"
                        onClick={() => {
                          setActiveTab('content');
                          // Smooth scroll to content section after a small delay to allow tab switch
                          setTimeout(() => {
                            const contentSection = document.getElementById('content-section');
                            if (contentSection) {
                              window.scrollTo({
                                top: contentSection.offsetTop - 20,
                                behavior: 'smooth'
                              });
                            }
                          }, 100);
                        }}
                      >
                        View full content
                      </Button>
                    </div>
                    {audienceSizeLoading && (
                      <p className="text-sm text-muted-foreground mt-2 flex items-center">
                        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                        Verifying audience size...
                      </p>
                    )}
                    {!audienceSizeLoading && !estimatedAudienceSize && (
                      <p className="text-sm text-destructive mt-2">
                        Please select at least one segment with recipients.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
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

      <LivePreviewModal
        isOpen={isLivePreviewModalOpen}
        onClose={() => setIsLivePreviewModalOpen(false)}
        initialHtml={livePreviewInitialData.html}
        initialSubject={livePreviewInitialData.subject}
      />

      <RecipientPreviewModal
        isOpen={isRecipientPreviewModalOpen}
        onClose={() => setIsRecipientPreviewModalOpen(false)}
        campaignId={campaignId}
      />

      <TemplateSelectionModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        onTemplateSelect={handleTemplateSelected}
      />
    </div>
  );
}
