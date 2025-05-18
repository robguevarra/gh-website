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
import { Loader2, Send, Calendar, ArrowLeft, FileText, Mail, CheckCircle, Save, AlertCircle } from 'lucide-react';
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
import { extractVariablesFromContent, getStandardVariableDefaults, substituteVariables } from '@/lib/services/email/template-utils';

import { TemplateSelectionModal } from './template-selection-modal';
import UnlayerEmailEditor, { EditorRef as UnlayerEditorRef } from '@/app/admin/email-templates/unlayer-email-editor';
import { EmailCampaign } from '@/lib/supabase/data-access/campaign-management';
import { TestSendModal } from './modals/test-send-modal';
import { LivePreviewModal } from './modals/live-preview-modal';
import { ScheduleModal } from './modals/schedule-modal';
import { SendConfirmationModal } from './modals/send-confirmation-modal';
import { OverviewTabContent } from './tabs/overview-tab-content';
import { ContentTabContent } from './tabs/content-tab-content';
import { AudienceTabContent } from './tabs/audience-tab-content';
import { ReviewSendTabContent } from './tabs/review-send-tab-content';

// Define the Ref type for ContentTabContent
export interface ContentTabContentRef {
  getInnerEditorContent: () => Promise<{ html: string; design: any } | null>;
  resetEditorWithNewContent: (content: { designJSON: any; htmlContent: string | null }) => void;
  dangerouslyUpdateEditorContent: (newContent: { designJSON: any; htmlContent: string | null }) => void;
}

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

  const [isSending, setIsSending] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isTestSendModalOpen, setIsTestSendModalOpen] = useState(false);
  const [isLivePreviewModalOpen, setIsLivePreviewModalOpen] = useState(false);
  const [isRecipientPreviewModalOpen, setIsRecipientPreviewModalOpen] = useState(false);
  const [isSendConfirmationOpen, setIsSendConfirmationOpen] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [livePreviewInitialData, setLivePreviewInitialData] = useState<{ html: string; subject: string }>({ html: '', subject: '' });
  const [activeTab, setActiveTab] = useState<string>('overview');

  // const unlayerEditorRef = useRef<UnlayerEditorRef>(null); // Will be moved to ContentTabContent
  const contentTabRef = useRef<ContentTabContentRef>(null); // Ref for ContentTabContent

  // Restore formatDate utility function
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleString();
  };

  // Restore getStatusBadge utility function
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="outline">Draft</Badge>;
      case 'scheduled':
        return <Badge variant="secondary">Scheduled</Badge>;
      case 'sending':
        return <Badge variant="default">Sending</Badge>; // This was 'default', but might be better as 'warning' or specific color
      case 'completed':
        return <Badge variant="default">Completed</Badge>; // Reverted from 'success' to 'default' or another valid variant like 'secondary' if more appropriate. Using 'default'.
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Modified handleTemplateSelected
  const handleTemplateSelected = async (template: { id: string; htmlBody: string | null; designJson: any }) => {
    console.log('handleTemplateSelected called with template:', template);
    if (currentCampaign && updateCampaign && contentTabRef.current) {
      try {
        // First, update the campaign in the backend/store
        await updateCampaign(currentCampaign.id, {
          selected_template_id: template.id,
          campaign_design_json: template.designJson,
          campaign_html_body: template.htmlBody,
        });
        
        // Then, tell ContentTabContent to load this new content
        // This will also trigger its internal useEffect to re-key the editor if necessary
        contentTabRef.current.dangerouslyUpdateEditorContent({
          designJSON: template.designJson,
          htmlContent: template.htmlBody,
        });

      toast({ 
          title: 'Template Applied',
          description: 'The selected template has been loaded into the editor.',
        });

      } catch (error) {
        console.error('Failed to update campaign with template or reset editor:', error);
      toast({ 
          title: 'Error Applying Template',
          description: (error instanceof Error ? error.message : 'Failed to apply template'),
          variant: 'destructive',
        });
      }
            } else {
      let errorContext = '';
      if (!currentCampaign) errorContext += 'Current campaign not available. ';
      if (!updateCampaign) errorContext += 'Update campaign function not available. ';
      if (!contentTabRef.current) errorContext += 'Editor reference not available. ';
      console.error('handleTemplateSelected: Prerequisites not met.', errorContext);
      toast({
        title: 'Error',
        description: 'Could not apply template due to missing prerequisites.',
        variant: 'destructive',
      });
    }
    setIsTemplateModalOpen(false);
  };

  // Restore handleConfirmSend function - now it just opens the modal
  const handleConfirmSend = () => {
    // Validation is now handled by ReviewSendTabContent before this is called
    setIsSendConfirmationOpen(true);
  };

  // Actual send logic for the confirmation dialog
  const executeSendCampaign = async () => {
    setIsSending(true);
    setIsSendConfirmationOpen(false);
    try {
      await sendCampaign(campaignId);
        toast({ 
        title: 'Campaign sending initiated',
        description: 'Your campaign is now being sent to recipients.',
      });
      fetchCampaign(campaignId); // Re-fetch to update status
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

  // The handleScheduleClick will be used by the button in Review & Send tab
  // It should now just open the modal, validation is inside the modal or before opening.
  const handleScheduleClick = () => {
    // Validation is now handled by ReviewSendTabContent before this is called
    setIsScheduling(true);
  };

    useEffect(() => {
    if (campaignId) {
      fetchCampaign(campaignId);
      fetchCampaignAnalytics(campaignId);
      fetchCampaignSegments(campaignId); 
      fetchAvailableSegments(); 
      fetchEstimatedAudienceSize(campaignId);
    }
    // Minimal dependencies, just for fetching core campaign data
  }, [campaignId, fetchCampaign, fetchCampaignAnalytics, fetchCampaignSegments, fetchAvailableSegments, fetchEstimatedAudienceSize]);

  const handleEditorLoad = () => {
    console.log('Unlayer editor loaded and ready');
  };

  const handleOpenLivePreview = async () => {
    if (!currentCampaign) {
      toast({ title: "Error", description: "No campaign selected.", variant: "destructive" });
        return;
      }

    let content = null;
    if (contentTabRef.current) { // Use the new ref
      content = await contentTabRef.current.getInnerEditorContent();
    } else if (currentCampaign.campaign_html_body) { // Fallback for existing HTML if ref not ready
      content = { html: currentCampaign.campaign_html_body, design: currentCampaign.campaign_design_json };
    }

    if (content && content.html) { // Check if content and content.html are not null
      setLivePreviewInitialData({ html: content.html, subject: currentCampaign.subject || '' });
      setIsLivePreviewModalOpen(true);
    } else {
      toast({ title: "Preview Error", description: "Could not load content for live preview.", variant: "destructive" });
    }
  };

  // getUnlayerContent will now use the contentTabRef
  const getUnlayerContent = async () => {
    if (contentTabRef.current) {
      return contentTabRef.current.getInnerEditorContent();
    }
    console.warn('getUnlayerContent: contentTabRef or its method is not available');
    toast({ title: "Editor Error", description: "Cannot access editor content.", variant: "destructive" });
    return null;
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
      {/* SINGLE Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center">
              {currentCampaignLoading ? (
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
              ) : (
                currentCampaign?.name || 'New Campaign'
              )}
              {currentCampaign && getStatusBadge(currentCampaign.status)}
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage your email campaign details, content, and performance.
            </p>
              </div>
          </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleOpenLivePreview} disabled={!currentCampaign?.campaign_html_body}>
            <Mail className="mr-2 h-4 w-4" /> Live Preview
          </Button>
          <Button onClick={() => setIsTestSendModalOpen(true)} disabled={!currentCampaign?.campaign_html_body}>
            <Send className="mr-2 h-4 w-4" /> Test Send
          </Button>
          {currentCampaign?.status !== 'sending' && currentCampaign?.status !== 'completed' && (
            <Button onClick={handleConfirmSend} disabled={isSending || !canSendOrSchedule }>
            {isSending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
                <Send className="mr-2 h-4 w-4" />
            )}
              {currentCampaign?.status === 'scheduled' ? 'Send Now' : 'Send Campaign'}
          </Button>
          )}
        </div>
      </div>

      <Separator />

      {/* SINGLE Main Tabs Structure */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="content">Content & Design</TabsTrigger>
          <TabsTrigger value="audience">Audience</TabsTrigger>
          <TabsTrigger value="review">Review & Send</TabsTrigger>
            </TabsList>

        <TabsContent value="overview">
          <OverviewTabContent
            currentCampaign={currentCampaign}
            campaignAnalytics={campaignAnalytics}
            analyticsLoading={analyticsLoading}
            estimatedAudienceSize={estimatedAudienceSize}
            campaignSegments={campaignSegments as any} 
            formatDate={formatDate}
            getStatusBadge={getStatusBadge}
          />
            </TabsContent>

        {/* Replace inline JSX with ContentTabContent component */}
        <TabsContent value="content" className="space-y-6">
          <ContentTabContent
            ref={contentTabRef}
            currentCampaign={currentCampaign}
            campaignId={campaignId}
            setIsTemplateModalOpen={setIsTemplateModalOpen}
            onNewCampaignCreated={(newCampaignId) => {
              router.push(`/admin/email/campaigns/${newCampaignId}`);
            }}
          />
            </TabsContent>

        {/* Replace inline JSX with AudienceTabContent component */}
        <TabsContent value="audience">
          <AudienceTabContent
            currentCampaignId={currentCampaign?.id}
            campaignSegments={campaignSegments} // Pass from store
            segmentsLoading={segmentsLoading} // Pass from store
            segmentsError={segmentsError} // Pass from store
            availableSegments={availableSegments} // Pass from store
            availableSegmentsLoading={availableSegmentsLoading} // Pass from store
            availableSegmentsError={availableSegmentsError} // Pass from store
            addCampaignSegment={addCampaignSegment} // Pass store action
            removeCampaignSegment={removeCampaignSegment} // Pass store action
            estimatedAudienceSize={estimatedAudienceSize} // Pass from store
          />
            </TabsContent>

        {/* Replace inline JSX with ReviewSendTabContent component */}
        <TabsContent value="review">
          <ReviewSendTabContent
            currentCampaign={currentCampaign}
            campaignSegments={campaignSegments as any} 
            estimatedAudienceSize={estimatedAudienceSize}
            isSendingGlobal={isSending} // Pass isSending as isSendingGlobal
            canSendOrSchedule={canSendOrSchedule}
            onConfirmSend={handleConfirmSend} // Pass the updated handleConfirmSend
            onScheduleClick={handleScheduleClick} // Pass the updated handleScheduleClick
            setIsTestSendModalOpen={setIsTestSendModalOpen}
            handleOpenLivePreview={handleOpenLivePreview}
            formatDate={formatDate}
            getStatusBadge={getStatusBadge}
          />
            </TabsContent>
      </Tabs> {/* End of SINGLE Main Tabs component */}

      {/* All Modals */}
      <ScheduleModal
        isOpen={isScheduling}
        onClose={() => {
                        setIsScheduling(false);
          // Optionally reset any related state in CampaignDetail if needed upon close, though most schedule state is in the modal
        }}
        campaignId={campaignId}
        estimatedAudienceSize={estimatedAudienceSize}
        onConfirmSchedule={async (scheduleDetails) => {
          // The scheduleCampaign function (previously in CampaignDetail) is now effectively this callback's body
          // We pass its core logic here to be executed by the modal.
          // The modal will handle its own internal `isSchedulingApiCall` state.
          try {
            // The actual API call logic from the original scheduleCampaign function:
            const response = await fetch(`/api/admin/campaigns/${campaignId}/schedule`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                scheduledAt: new Date(scheduleDetails.scheduledAt).toISOString(),
                timezone: scheduleDetails.timezone,
                isRecurring: scheduleDetails.isRecurring,
                ...(scheduleDetails.isRecurring && { recurrence: scheduleDetails.recurrence })
              }),
            });

            const data = await response.json();
            if (!response.ok) {
              throw new Error(data.error || 'Failed to schedule campaign');
            }

            await fetchCampaign(campaignId); // Refresh campaign data
            return { success: true };
          } catch (error) {
            console.error('Error scheduling campaign (callback in CampaignDetail):', error);
                          toast({
              title: 'Error scheduling campaign',
              description: error instanceof Error ? error.message : 'An error occurred',
                            variant: 'destructive',
                          });
            return { success: false };
          }
        }}
        // Pass initial values if currentCampaign holds them
        initialScheduledAt={currentCampaign?.scheduled_at}
      />

      <TestSendModal 
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

      {/* Use new SendConfirmationModal component */}
      <SendConfirmationModal
        isOpen={isSendConfirmationOpen}
        onClose={() => setIsSendConfirmationOpen(false)}
        onConfirmSend={executeSendCampaign} // executeSendCampaign handles setting isSending and API call
        isSending={isSending} // Pass the isSending state for the button's loading indicator
        audienceSize={estimatedAudienceSize}
        campaignName={currentCampaign?.name}
      />

    </div>
  );
}
