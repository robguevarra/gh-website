'use client';

import { useState } from 'react';
import { EmailCampaign } from '@/lib/supabase/data-access/campaign-management';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Send, Calendar, Mail, AlertTriangle, CheckCircle, Users, FileText, Clock, Info, Eye, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Typography } from '@/components/ui/typography';
import { cn } from '@/lib/utils';
import { 
  cardStyles, 
  buttonStyles, 
  badgeStyles, 
  typography, 
  spacing, 
  transitions 
} from '../ui-utils';

// Assuming CampaignSegmentFromStore is defined elsewhere or passed with correct type
// For now, defining a compatible structure if it's not imported
interface CampaignSegmentFromStore {
    id: string; 
    segment_id: string; 
    segment: {
        id: string; 
        name: string;
        description?: string | null;
    };
}

// Define and export AudienceSummaryForReview as per Build Note Step 5.A & 5.B
export interface AudienceSummaryForReview {
  includeOperator: 'AND' | 'OR';
  includedSegments: Array<{ id: string; name: string }>;
  excludedSegments: Array<{ id: string; name: string }>;
}

export interface ReviewSendTabContentProps {
  currentCampaign: EmailCampaign | null;
  audienceSummary: AudienceSummaryForReview | null;
  estimatedAudienceSize: number | null;
  isSendingGlobal: boolean;
  canSendOrSchedule: boolean;
  onConfirmSend: () => void;
  onScheduleClick: () => void;
  setIsTestSendModalOpen: (isOpen: boolean) => void;
  handleOpenLivePreview: () => void;
  formatDate: (dateString: string | null) => string;
  getStatusBadge: (status: string) => JSX.Element;
}

export function ReviewSendTabContent({
  currentCampaign,
  audienceSummary,
  estimatedAudienceSize,
  isSendingGlobal,
  canSendOrSchedule,
  onConfirmSend,
  onScheduleClick,
  setIsTestSendModalOpen,
  handleOpenLivePreview,
  formatDate,
  getStatusBadge,
}: ReviewSendTabContentProps) {
  const { toast } = useToast();
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  if (!currentCampaign) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-3">
        <Clock className="h-8 w-8 animate-spin text-primary/70" />
        <p className={cn(typography.muted, "animate-pulse")}>Loading campaign details for review...</p>
      </div>
    );
  }

  const validateCampaignLocal = () => {
    const errors: string[] = [];
    if (!currentCampaign?.subject?.trim()) {
      errors.push('Campaign subject is required');
    }
    if (!currentCampaign?.campaign_html_body?.trim()) {
      errors.push('Campaign content is required (check Content & Design tab)');
    }
    if (!audienceSummary || !audienceSummary.includedSegments || audienceSummary.includedSegments.length === 0) {
      errors.push('At least one audience segment must be included in the rules (check Audience tab)');
    } else if (estimatedAudienceSize === 0 && audienceSummary.includedSegments.length > 0) {
      errors.push('Selected audience rules result in no recipients');
    }
    setValidationErrors(errors);
    return errors.length === 0;
  };

  const internalHandleConfirmSend = () => {
    if (validateCampaignLocal()) {
      onConfirmSend();
    } else {
      toast({
        title: "Validation Failed",
        description: "Please fix the errors listed below before sending.",
        variant: "destructive"
      });
    }
  };

  const internalHandleScheduleClick = () => {
    if (validateCampaignLocal()) {
      onScheduleClick();
    } else {
      toast({
        title: "Validation Failed",
        description: "Please fix the errors listed below before scheduling.",
        variant: "destructive"
      });
    }
  };

  // Helper function to get status style based on validation state
  const getValidationState = () => {
    if (validationErrors.length > 0) {
      return "error";
    }

    const hasSubject = !!currentCampaign?.subject?.trim();
    const hasContent = !!currentCampaign?.campaign_html_body?.trim();
    const hasSegments = !!audienceSummary?.includedSegments?.length;
    const hasRecipients = estimatedAudienceSize !== null && estimatedAudienceSize > 0;

    if (hasSubject && hasContent && hasSegments && hasRecipients) {
      return "success";
    }

    return "pending";
  };

  const validationState = getValidationState();

  return (
    <div className={cn(spacing.section, transitions.fadeIn)}>
      <Card className={cardStyles.elevated}>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
              <CheckCircle 
                className={cn(
                  "h-5 w-5",
                  validationState === "success" && "text-green-500",
                  validationState === "error" && "text-destructive",
                  validationState === "pending" && "text-muted-foreground"
                )}
              />
              <CardTitle className={typography.h2}>Campaign Review</CardTitle>
            </div>
            <Badge className={cn(badgeStyles[currentCampaign.status as keyof typeof badgeStyles] || badgeStyles.draft, "px-3 py-1")}>
              {currentCampaign.status.charAt(0).toUpperCase() + currentCampaign.status.slice(1)}
            </Badge>
          </div>
          <CardDescription className="mt-1">
            Confirm your campaign details before sending to {estimatedAudienceSize?.toLocaleString() || '0'} recipients
          </CardDescription>
        </CardHeader>

        <CardContent className={spacing.card}>
          {/* Validation Summary */}
          {validationErrors.length > 0 ? (
            <div className={cn("p-4 border border-destructive/50 rounded-md bg-destructive/10 mb-6", transitions.fadeIn)}>
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div>
                  <h4 className={cn(typography.h4, "text-destructive mb-2")}>Required Actions Before Sending</h4>
                  <ul className="list-disc list-inside text-sm text-destructive space-y-2">
                    {validationErrors.map((error, index) => (
                      <li key={index} className="animate-in fade-in-50 duration-300" style={{ animationDelay: `${index * 100}ms` }}>
                        {error}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ) : currentCampaign.status === 'sending' ? (
            <div className={cn("p-4 border border-blue-200 rounded-md bg-blue-50 dark:bg-blue-900/10 dark:border-blue-900/30 mb-6", transitions.fadeIn)}>
              <div className="flex items-start gap-3">
                <Send className="h-5 w-5 text-blue-500 shrink-0 mt-0.5 animate-pulse" />
                <div>
                  <h4 className={cn(typography.h4, "text-blue-700 dark:text-blue-400 mb-1")}>Campaign Sending In Progress</h4>
                  <p className="text-sm text-blue-600 dark:text-blue-300">
                    This campaign is currently being processed. You can monitor its progress on the Overview tab.
                  </p>
                </div>
              </div>
            </div>
          ) : currentCampaign.status === 'sent' || currentCampaign.status === 'completed' ? (
            <div className={cn("p-4 border border-green-200 rounded-md bg-green-50 dark:bg-green-900/10 dark:border-green-900/30 mb-6", transitions.fadeIn)}>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className={cn(typography.h4, "text-green-700 dark:text-green-400 mb-1")}>
                    {currentCampaign.status === 'completed' ? 'Campaign Completed' : 'Campaign Sent'}
                  </h4>
                  <p className="text-sm text-green-600 dark:text-green-300">
                    {currentCampaign.status === 'completed' 
                      ? 'All emails for this campaign have been processed. Check the Overview tab for final statistics.'
                      : 'This campaign has been sent and is processing. Check the Overview tab for progress and final statistics.'}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className={cn("p-4 border border-green-200 rounded-md bg-green-50 dark:bg-green-900/10 dark:border-green-900/30 mb-6", transitions.fadeIn)}>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className={cn(typography.h4, "text-green-700 dark:text-green-400 mb-1")}>Campaign Ready to Send</h4>
                  <p className="text-sm text-green-600 dark:text-green-300">
                    All required information is complete. You can now send or schedule your campaign.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Campaign Details */}
            <div>
              {/* Basic Information */}
              <div className="space-y-4 mb-6">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <h3 className={typography.h4}>Campaign Information</h3>
                </div>
                <Separator className="my-2" />
                <dl className="grid gap-3 text-sm">
                  <div className="flex flex-col">
                    <dt className="text-muted-foreground">Campaign Name</dt>
                    <dd className={cn(typography.p, "font-medium mt-0")}>
                      {currentCampaign.name}
                    </dd>
                  </div>
                  <div className="flex flex-col">
                    <dt className="text-muted-foreground">Email Subject</dt>
                    <dd className={cn(typography.p, "mt-0")}>
                      {currentCampaign.subject ? (
                        <span className="flex items-center gap-1.5">
                          <Mail className="h-3.5 w-3.5 text-primary" />
                          {currentCampaign.subject}
                        </span>
                      ) : (
                        <span className="text-destructive flex items-center gap-1.5">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          Subject not set
                        </span>
                      )}
                    </dd>
                  </div>
                  {currentCampaign.status === 'scheduled' && currentCampaign.scheduled_at && (
                    <div className="flex flex-col">
                      <dt className="text-muted-foreground">Scheduled Send Time</dt>
                      <dd className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-secondary" />
                        <span className={cn(typography.p, "text-secondary font-medium mt-0")}>
                          {formatDate(currentCampaign.scheduled_at)}
                        </span>
                      </dd>
                    </div>
                  )}
                </dl>
              </div>

              {/* Audience Information */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  <h3 className={typography.h4}>Audience Details</h3>
                </div>
                <Separator className="my-2" />
                <dl className="grid gap-3 text-sm">
                  <div className="flex flex-col">
                    <dt className="text-muted-foreground">Estimated Recipients</dt>
                    <dd className={cn(typography.h3, "text-2xl font-semibold text-primary", estimatedAudienceSize === 0 && "text-destructive")}>
                      {estimatedAudienceSize !== null ? estimatedAudienceSize.toLocaleString() : 'N/A'}
                    </dd>
                  </div>
                  {/* Display Audience Rules based on audienceSummary - Build Note Step 5.B.3 */}
                  {audienceSummary && (
                    <>
                      <div className="flex flex-col col-span-full pt-2"> 
                        <dt className="text-muted-foreground mb-1">Audience Rules:</dt>
                        <dd className={cn("leading-7", "space-y-1.5", "mt-0")}>
                          {audienceSummary.includedSegments.length > 0 && (
                            <div className="flex items-start text-sm">
                              <span className="font-medium mr-1.5 shrink-0">Include users who are in:</span>
                              <div className="flex flex-wrap gap-1 items-center">
                                {audienceSummary.includedSegments.map((segment, index) => (
                                  <Badge key={segment.id} variant="outline" className="font-normal py-0.5 px-1.5 bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700 text-green-700 dark:text-green-300">
                                    {segment.name}
                                    {index < audienceSummary.includedSegments.length - 1 && 
                                     <span className="font-semibold text-green-600 dark:text-green-400 ml-1.5 mr-0.5 text-xs">{audienceSummary.includeOperator}</span>}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          {audienceSummary.excludedSegments.length > 0 && (
                            <div className="flex items-start text-sm">
                              <span className="font-medium mr-1.5 shrink-0">Exclude users who are in:</span>
                              <div className="flex flex-wrap gap-1">
                                {audienceSummary.excludedSegments.map((segment) => (
                                  <Badge key={segment.id} variant="outline" className="font-normal py-0.5 px-1.5 bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700 text-red-700 dark:text-red-300">
                                    {segment.name}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          {audienceSummary.includedSegments.length === 0 && audienceSummary.excludedSegments.length === 0 && (
                            <p className="text-muted-foreground text-sm">No audience rules defined. Please configure on the Audience tab.</p>
                          )}
                        </dd>
                      </div>
                    </>
                  )}
                </dl>
              </div>
            </div>

            {/* Content Preview */}
            <div>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-primary" />
                  <h3 className={typography.h4}>Content Preview</h3>
                </div>
                <Separator className="my-2" />
                
                <div className={cn(
                  "border rounded-md p-6 bg-muted/30 h-64 overflow-hidden flex flex-col items-center justify-center text-center",
                  transitions.hover,
                  "hover:border-primary/30 cursor-pointer"
                )} onClick={handleOpenLivePreview}>
                  {currentCampaign.campaign_html_body ? (
                    <>
                      <Mail className="h-12 w-12 text-primary/50 mb-4" />
                      <h4 className={typography.h4}>Email Content Ready</h4>
                      <p className={typography.muted}>Click to view a live preview of your email</p>
                      <Button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenLivePreview();
                        }} 
                        variant="outline" 
                        className={cn(buttonStyles.outline, "mt-4 animate-in fade-in-50")}
                      >
                        <Eye className="mr-2 h-4 w-4" /> 
                        View Live Preview
                      </Button>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-12 w-12 text-destructive/50 mb-4" />
                      <h4 className={cn(typography.h4, "text-destructive")}>No Content Available</h4>
                      <p className={typography.muted}>Please add content in the Content & Design tab</p>
                    </>
                  )}
                </div>

                <div className="mt-4 p-3 border border-border bg-muted/20 rounded-md">
                  <div className="flex items-start gap-2">
                    <Info className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                    <p className={typography.small}>
                      Before sending, use the <strong>Test Email</strong> feature to preview how your email will look in different email clients.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <Separator className="my-6" />

          {/* Action Buttons - Conditionally render or disable based on status */}
          {(currentCampaign.status === 'draft' || currentCampaign.status === 'scheduled') && !validationErrors.length && (
            <CardFooter className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t">
              <Button 
                variant="outline" 
                onClick={() => setIsTestSendModalOpen(true)}
                disabled={isSendingGlobal || !canSendOrSchedule}
                className={cn(buttonStyles.secondary, transitions.hover, "w-full sm:w-auto")}
              >
                <Mail className="h-4 w-4 mr-2" /> Send Test Email
              </Button>
              <Button 
                variant="outline" 
                onClick={internalHandleScheduleClick} 
                disabled={isSendingGlobal || !canSendOrSchedule}
                className={cn(buttonStyles.secondary, transitions.hover, "w-full sm:w-auto")}
              >
                <Calendar className="h-4 w-4 mr-2" /> Schedule Campaign
              </Button>
              <Button 
                onClick={internalHandleConfirmSend} 
                disabled={isSendingGlobal || !canSendOrSchedule}
                className={cn(buttonStyles.primary, transitions.hover, "w-full sm:w-auto")}
              >
                {isSendingGlobal ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Send Campaign Now
              </Button>
            </CardFooter>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 