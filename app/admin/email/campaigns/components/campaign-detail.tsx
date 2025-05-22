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
import { Loader2, Send, Calendar, ArrowLeft, FileText, Mail, CheckCircle, Save, AlertCircle, Eye, Users, ChevronRight, Edit3, Info } from 'lucide-react';
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
import { OverviewTabContent, OverviewTabContentProps, AudienceSegmentForDisplay as OverviewAudienceSegment } from './tabs/overview-tab-content';
import { ContentTabContent } from './tabs/content-tab-content';
import { AudienceTabContent, SegmentRules, CampaignSegmentFromStore, AvailableSegmentFromStore } from './tabs/audience-tab-content';
import { ReviewSendTabContent, ReviewSendTabContentProps, AudienceSummaryForReview } from './tabs/review-send-tab-content';

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
    updateCampaignFields,
    availableSegments,
    availableSegmentsLoading,
    availableSegmentsError,
    segmentsLoading,  
    segmentsError,    
    fetchAvailableSegments,
    estimatedAudienceSize, 
    audienceSizeLoading,   
    audienceSizeError,     
    fetchEstimatedAudienceSize,
    setIncludeOperator,   
    addIncludeSegmentId,  
    removeIncludeSegmentId, 
    addExcludeSegmentId,  
    removeExcludeSegmentId, 
    getSegmentDetails,    
    saveSegmentRules,
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

    // --- Toast 1: Moved here for immediate feedback after modal confirmation ---
    toast({
      title: "Campaign Processing Initiated",
      description: `Your campaign '${currentCampaign?.name || 'Selected Campaign'}' is now being processed.`,
    });
    // --- End Toast 1 ---

    try {
      const result = await sendCampaign(campaignId);
      
      if (result.success) {
        toast({ 
          title: currentCampaign?.name ? `Campaign '${currentCampaign.name}' is Sending` : 'Campaign Sending Initiated',
          description: result.details?.queuedCount !== undefined 
            ? `${result.details.queuedCount} emails have been successfully queued.` 
            : (result.message || 'Your campaign is now being processed.'),
        });
        fetchCampaign(campaignId); 
      } else {
        toast({
          title: 'Campaign Send Issue',
          description: result.message || 'Could not fully initiate campaign sending. Please check campaign status.',
        });
      }
    } catch (error: any) {
      toast({ 
        title: 'Error Sending Campaign',
        description: error.message || 'An unexpected error occurred while trying to send the campaign.',
        variant: 'destructive',
      });
      // Optionally, re-fetch campaign here too, as an error might have reverted its status
      fetchCampaign(campaignId);
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

  // Default segment_rules if currentCampaign or its segment_rules are not yet loaded
  const defaultSegmentRules: SegmentRules = {
    version: 1,
    include: { operator: 'OR', segmentIds: [] },
    exclude: { segmentIds: [] },
  };

  // Derived state for audience summary in Review & Send tab (Build Note Step 5.A)
  const currentSegmentRules = currentCampaign?.segment_rules || defaultSegmentRules;
  
  const includedSegmentsForSummary: Array<{ id: string; name: string }> = 
    (currentSegmentRules.include?.segmentIds || []).map(id => {
      const segment = getSegmentDetails(id); // getSegmentDetails comes from useCampaignStore
      return { id, name: segment?.name || 'Unknown Segment' };
    }).filter(segment => segment.name !== 'Unknown Segment' || currentCampaign?.segment_rules?.include?.segmentIds?.includes(segment.id)); // Keep if explicitly in rules, even if name lookup fails

  const excludedSegmentsForSummary: Array<{ id: string; name: string }> = 
    (currentSegmentRules.exclude?.segmentIds || []).map(id => {
      const segment = getSegmentDetails(id);
      return { id, name: segment?.name || 'Unknown Segment' };
    }).filter(segment => segment.name !== 'Unknown Segment' || currentCampaign?.segment_rules?.exclude?.segmentIds?.includes(segment.id));

  const audienceSummaryForReview: AudienceSummaryForReview = {
    includeOperator: currentSegmentRules.include?.operator || 'OR', 
    includedSegments: includedSegmentsForSummary,
    excludedSegments: excludedSegmentsForSummary,
  };

  // Derive segments for OverviewTabContent (needs { id: string, name: string }[])
  // This derivation is still useful if OverviewTabContent wants a simple list for part of its display
  // but we will also pass the full rules.
  const derivedSegmentsForOverview: OverviewAudienceSegment[] = 
    (currentSegmentRules && 
     currentSegmentRules.include && 
     Array.isArray(currentSegmentRules.include.segmentIds)
    ) 
      ? currentSegmentRules.include.segmentIds.map(segId => {
          const segmentDetail = getSegmentDetails(segId); // Returns AvailableSegmentFromStore | undefined
          return {
            id: segId,
            name: segmentDetail?.name || 'Unknown Segment',
          };
        })
      : []; // Default to an empty array if rules are not as expected

  // Derive segments for ReviewSendTabContent (needs CampaignSegmentFromStore[])
  const derivedSegmentsForReviewSend: CampaignSegmentFromStore[] = 
    (currentSegmentRules && 
     currentSegmentRules.include && 
     Array.isArray(currentSegmentRules.include.segmentIds)
    )
      ? currentSegmentRules.include.segmentIds.map(segId => {
          const segmentDetail = getSegmentDetails(segId); // Should return AvailableSegmentFromStore | undefined
          return {
            id: segId, // SHIM: This is campaign_segment_id, using segment_id for now
            campaign_id: currentCampaign?.id || '',
            segment_id: segId,
            // created_at for the CampaignSegment link (not the segment itself)
            // Not available directly from segment_rules, so using a placeholder.
            created_at: new Date().toISOString(), 
            segment: {
              id: segId,
              name: segmentDetail?.name || 'Unknown Segment',
              description: segmentDetail?.description || null,
              // user_count is on AvailableSegmentFromStore, ensure getSegmentDetails returns this type
              user_count: (segmentDetail as AvailableSegmentFromStore)?.user_count || 0, 
              // type: (segmentDetail as AvailableSegmentFromStore)?.type || 'manual', // If AvailableSegmentFromStore has type
            },
          };
        })
      : []; // Default to an empty array if rules are not as expected

  useEffect(() => {
    if (campaignId) {
      fetchCampaign(campaignId); 
      fetchCampaignAnalytics(campaignId);
      fetchAvailableSegments(); 
    }
  }, [campaignId, fetchCampaign, fetchCampaignAnalytics, fetchAvailableSegments]);

  const handleEditorLoad = () => {
    console.log('Unlayer editor loaded and ready');
  };

  const handleOpenLivePreview = async () => {
    if (!currentCampaign) {
      toast({ title: "Error", description: "No campaign selected.", variant: "destructive" });
      return;
    }

    let content = null;
    if (contentTabRef.current) {
      content = await contentTabRef.current.getInnerEditorContent();
    } else if (currentCampaign.campaign_html_body) {
      content = { html: currentCampaign.campaign_html_body, design: currentCampaign.campaign_design_json };
    }

    if (content && content.html) {
      setLivePreviewInitialData({ html: content.html, subject: currentCampaign.subject || '' });
      setIsLivePreviewModalOpen(true);
    } else {
      toast({ title: "Preview Error", description: "Could not load content for live preview.", variant: "destructive" });
    }
  };

  // getUnlayerContent will now use the contentTabRef
  const getUnlayerContent = async () => {
    if (contentTabRef.current) {
      return await contentTabRef.current.getInnerEditorContent();
    }
    // Fallback or error if editor not ready
    if (currentCampaign?.campaign_html_body) {
        return { html: currentCampaign.campaign_html_body, design: currentCampaign.campaign_design_json };
    }
    console.warn('[CampaignDetail] Editor not ready to provide content for test send.');
    toast({ title: "Editor Not Ready", description: "The content editor hasn't loaded yet.", variant: "default"});
    return null;
  };

  if (currentCampaignLoading && !currentCampaign) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">Loading campaign details...</p>
      </div>
    );
  }

  if (currentCampaignError) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] text-center p-4">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h3 className={cn(typography.h3, "mb-2")}>Error Loading Campaign</h3>
        <p className={cn(typography.muted, "mb-6")}>
          {currentCampaignError}
        </p>
        <Button onClick={() => router.push('/admin/email/campaigns')} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Campaigns
        </Button>
      </div>
    );
  }

  if (!currentCampaign) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] text-center p-4">
        <Mail className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className={cn(typography.h3, "mb-2")}>Campaign Not Found</h3>
        <p className={cn(typography.muted, "mb-6")}>
          The requested campaign could not be found or you might not have permission to view it.
        </p>
        <Button onClick={() => router.push('/admin/email/campaigns')} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Campaigns
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
            onClick={() => router.push('/admin/email/campaigns')}
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
                  formatDate={formatDate}
                  getStatusBadge={getStatusBadge}
                  audienceSizeLoading={audienceSizeLoading}
                  audienceSizeError={audienceSizeError}
                  audienceRulesDisplay={currentSegmentRules}
                  getSegmentDetails={getSegmentDetails}
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

              <TabsContent value="audience" className={cn(spacing.card)}>
                <AudienceTabContent
                  currentCampaignId={currentCampaign?.id}
                  segmentRules={currentSegmentRules}
                  segmentsLoading={segmentsLoading || currentCampaignLoading}
                  segmentsError={segmentsError || currentCampaignError}
                  availableSegments={availableSegments}
                  availableSegmentsLoading={availableSegmentsLoading}
                  availableSegmentsError={availableSegmentsError}
                  estimatedAudienceSize={estimatedAudienceSize}
                  setIncludeOperator={setIncludeOperator}
                  addIncludeSegmentId={addIncludeSegmentId}
                  removeIncludeSegmentId={removeIncludeSegmentId}
                  addExcludeSegmentId={addExcludeSegmentId}
                  removeExcludeSegmentId={removeExcludeSegmentId}
                  getSegmentDetails={getSegmentDetails}
                  saveSegmentRules={saveSegmentRules}
                />
              </TabsContent>

              <TabsContent value="review" className={cn(!tabTransitioning && activeTab === 'review' ? transitions.fadeIn : transitions.scaleDown, "mt-0")}>
                <ReviewSendTabContent 
                  currentCampaign={currentCampaign}
                  audienceSummary={audienceSummaryForReview}
                  estimatedAudienceSize={estimatedAudienceSize}
                  isSendingGlobal={isSending}
                  canSendOrSchedule={canSendOrSchedule}
                  onConfirmSend={handleConfirmSend}
                  onScheduleClick={handleScheduleClick}
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
        isSending={isSending}
        audienceSize={estimatedAudienceSize}
        campaignName={currentCampaign?.name || 'this campaign'}
        campaignStatus={currentCampaign?.status || 'draft'}
      />

      {/* Recipient Preview Modal - moved from CampaignDetail */}
      {isRecipientPreviewModalOpen && currentCampaign && (
        <RecipientPreviewModal
          isOpen={isRecipientPreviewModalOpen}
          onClose={() => setIsRecipientPreviewModalOpen(false)}
          campaignId={currentCampaign.id}
        />
      )}
    </div>
  );
}
