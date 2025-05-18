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
import { Loader2, Send, Calendar, ArrowLeft, FileText, Mail, CheckCircle, Save, AlertCircle, Eye, Users, ChevronRight } from 'lucide-react';
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
import { Typography } from '@/components/ui/typography';
import { cn } from '@/lib/utils';

// Import template utilities
import { extractVariablesFromContent, getStandardVariableDefaults, substituteVariables } from '@/lib/services/email/template-utils';

// Import UI utilities
import { 
  cardStyles, 
  buttonStyles, 
  badgeStyles, 
  typography, 
  spacing, 
  transitions 
} from './ui-utils';

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
  const [tabTransitioning, setTabTransitioning] = useState(false);

  // const unlayerEditorRef = useRef<UnlayerEditorRef>(null); // Will be moved to ContentTabContent
  const contentTabRef = useRef<ContentTabContentRef>(null); // Ref for ContentTabContent

  // Restore formatDate utility function
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleString();
  };

  // Enhanced getStatusBadge utility function
  const getStatusBadge = (status: string) => {
    const statusStyle = badgeStyles[status as keyof typeof badgeStyles] || badgeStyles.draft;
    
    const getStatusIcon = () => {
      switch (status) {
        case 'draft':
          return <FileText className="h-3.5 w-3.5 mr-1" />;
        case 'scheduled':
          return <Calendar className="h-3.5 w-3.5 mr-1" />;
        case 'sending':
          return <Send className="h-3.5 w-3.5 mr-1 animate-pulse" />;
        case 'completed':
          return <CheckCircle className="h-3.5 w-3.5 mr-1" />;
        case 'cancelled':
          return <AlertCircle className="h-3.5 w-3.5 mr-1" />;
        default:
          return <FileText className="h-3.5 w-3.5 mr-1" />;
      }
    };
    
    return (
      <Badge className={cn(
        statusStyle, 
        "ml-2 capitalize px-2 py-0.5 text-xs font-medium flex items-center",
        transitions.hover
      )}>
        {getStatusIcon()}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  // Handle tab change with animation
  const handleTabChange = (value: string) => {
    setTabTransitioning(true);
    setTimeout(() => {
      setActiveTab(value);
      setTabTransitioning(false);
    }, 150);
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
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="h-10 w-10 animate-spin text-primary/70" />
        <p className={cn(typography.muted, "animate-pulse")}>Loading campaign...</p>
      </div>
    );
  }

  if (!currentCampaign) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <AlertCircle className="h-12 w-12 text-destructive/70" />
        <h3 className={typography.h3}>Campaign Not Found</h3>
        <p className={typography.muted}>The campaign you're looking for doesn't exist or has been removed.</p>
        <Button 
          onClick={() => router.push('/admin/email/campaigns')}
          className={cn(buttonStyles.outline, "mt-2")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Campaigns
        </Button>
      </div>
    );
  }

  const canSendOrSchedule = currentCampaign?.status === 'draft' || currentCampaign?.status === 'scheduled';
  const sendButtonText = currentCampaign?.status === 'scheduled' ? 'Reschedule/Send Now' : 'Send Campaign';

  return (
    <div className={cn(spacing.section, transitions.fadeIn)}>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => router.back()}
            className={cn(buttonStyles.outline, "rounded-full h-9 w-9", transitions.hover)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className={cn(typography.h1, "flex items-center")}>
              {currentCampaignLoading ? (
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
              ) : (
                currentCampaign?.name
              )}
              {currentCampaign && getStatusBadge(currentCampaign.status)}
            </h1>
            <p className={cn(typography.muted, "mt-1")}>
              Email campaign created on {formatDate(currentCampaign.created_at)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button 
            variant="outline" 
            onClick={handleOpenLivePreview} 
            disabled={!currentCampaign?.campaign_html_body}
            className={cn(buttonStyles.outline, transitions.hover)}
          >
            <Eye className="mr-2 h-4 w-4" /> Preview
          </Button>
          <Button 
            onClick={() => setIsTestSendModalOpen(true)} 
            disabled={!currentCampaign?.campaign_html_body}
            className={cn(buttonStyles.secondary, transitions.hover)}
          >
            <Send className="mr-2 h-4 w-4" /> Test Send
          </Button>
          {currentCampaign?.status !== 'sending' && currentCampaign?.status !== 'completed' && (
            <Button 
              onClick={handleConfirmSend} 
              disabled={isSending || !canSendOrSchedule }
              className={cn(buttonStyles.primary, transitions.hover)}
            >
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

      <Card className={cardStyles.elevated}>
        <CardContent className="p-0">
          {/* Main Tabs Structure */}
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="w-full grid grid-cols-4 rounded-t-lg rounded-b-none h-14 bg-muted/70">
              <TabsTrigger 
                value="overview" 
                className={cn(
                  "flex items-center gap-1.5 text-sm font-medium transition-all", 
                  activeTab === "overview" ? "data-[state=active]:bg-background data-[state=active]:shadow-sm" : ""
                )}
              >
                <FileText className="h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger 
                value="content"
                className={cn(
                  "flex items-center gap-1.5 text-sm font-medium transition-all", 
                  activeTab === "content" ? "data-[state=active]:bg-background data-[state=active]:shadow-sm" : ""
                )}
              >
                <Mail className="h-4 w-4" />
                Content & Design
              </TabsTrigger>
              <TabsTrigger 
                value="audience"
                className={cn(
                  "flex items-center gap-1.5 text-sm font-medium transition-all", 
                  activeTab === "audience" ? "data-[state=active]:bg-background data-[state=active]:shadow-sm" : ""
                )}
              >
                <Users className="h-4 w-4" />
                Audience
              </TabsTrigger>
              <TabsTrigger 
                value="review"
                className={cn(
                  "flex items-center gap-1.5 text-sm font-medium transition-all", 
                  activeTab === "review" ? "data-[state=active]:bg-background data-[state=active]:shadow-sm" : ""
                )}
              >
                <CheckCircle className="h-4 w-4" />
                Review & Send
              </TabsTrigger>
            </TabsList>

            <div className={cn(
              "p-6", 
              tabTransitioning ? "opacity-0 transition-opacity duration-150" : "opacity-100 transition-opacity duration-150"
            )}>
              <TabsContent value="overview" className="m-0 p-0">
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

              <TabsContent value="content" className="m-0 p-0">
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

              <TabsContent value="audience" className="m-0 p-0">
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

              <TabsContent value="review" className="m-0 p-0">
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
            </div>
          </Tabs>
        </CardContent>
      </Card>

      {/* Tab Navigation Buttons */}
      <div className="flex justify-between mt-6">
        <Button 
          variant="outline" 
          onClick={() => {
            const tabs = ['overview', 'content', 'audience', 'review'];
            const currentIndex = tabs.indexOf(activeTab);
            if (currentIndex > 0) {
              handleTabChange(tabs[currentIndex - 1]);
            }
          }}
          disabled={activeTab === 'overview'}
          className={cn(buttonStyles.outline, transitions.hover)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Previous Step
        </Button>
        <Button 
          onClick={() => {
            const tabs = ['overview', 'content', 'audience', 'review'];
            const currentIndex = tabs.indexOf(activeTab);
            if (currentIndex < tabs.length - 1) {
              handleTabChange(tabs[currentIndex + 1]);
            } else if (currentIndex === tabs.length - 1) {
              // On the last tab, handle sending action
              handleConfirmSend();
            }
          }}
          className={cn(
            activeTab === 'review' ? buttonStyles.primary : buttonStyles.secondary,
            transitions.hover
          )}
        >
          {activeTab === 'review' ? (
            <>
              Send Campaign
              <Send className="ml-2 h-4 w-4" />
            </>
          ) : (
            <>
              Next Step
              <ChevronRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>

      {/* All Modals */}
      {/* Template Selection Modal */}
      <TemplateSelectionModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        onTemplateSelect={handleTemplateSelected}
      />

      {/* Test Send Modal */}
      <TestSendModal
        isOpen={isTestSendModalOpen}
        onClose={() => setIsTestSendModalOpen(false)}
        campaign={currentCampaign}
        getCampaignContent={getUnlayerContent}
      />

      {/* Live Preview Modal */}
      <LivePreviewModal
        isOpen={isLivePreviewModalOpen}
        onClose={() => setIsLivePreviewModalOpen(false)}
        initialHtml={livePreviewInitialData.html}
        initialSubject={livePreviewInitialData.subject}
      />

      {/* Schedule Modal */}
      <ScheduleModal
        isOpen={isScheduling}
        onClose={() => {
          setIsScheduling(false);
          // Optionally reset any related state in CampaignDetail if needed upon close, though most schedule state is in the modal
        }}
        campaignId={campaignId}
        estimatedAudienceSize={estimatedAudienceSize}
        onConfirmSchedule={async (scheduleDetails) => {
          try {
            const response = await fetch(`/api/admin/campaigns/${campaignId}/schedule`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(scheduleDetails),
            });

            if (!response.ok) {
              const error = await response.json();
              throw new Error(error.message || 'Failed to schedule campaign');
            }

            toast({
              title: 'Campaign Scheduled',
              description: 'Your campaign has been scheduled for sending.',
            });

            // Refresh campaign data to show updated status
            fetchCampaign(campaignId);
            setIsScheduling(false); // Close the modal
            return { success: true };
          } catch (error: any) {
            toast({
              title: 'Error',
              description: error.message || 'An error occurred while scheduling the campaign',
              variant: 'destructive',
            });
            return { success: false };
          }
        }}
      />

      {/* Send Confirmation Modal */}
      <SendConfirmationModal
        isOpen={isSendConfirmationOpen}
        onClose={() => setIsSendConfirmationOpen(false)}
        onConfirmSend={executeSendCampaign}
        audienceSize={estimatedAudienceSize}
        campaignName={currentCampaign?.name}
        isSending={isSending}
      />

      {/* Recipient Preview Modal - moved from CampaignDetail */}
      <RecipientPreviewModal
        isOpen={isRecipientPreviewModalOpen}
        onClose={() => setIsRecipientPreviewModalOpen(false)}
        campaignId={campaignId}
      />
    </div>
  );
}
