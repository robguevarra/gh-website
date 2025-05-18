'use client';

import { useState } from 'react';
import { EmailCampaign } from '@/lib/supabase/data-access/campaign-management';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Send, Calendar, Mail, AlertTriangle, CheckCircle, Users, FileText, Clock, Info, Eye } from 'lucide-react';
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

export interface ReviewSendTabContentProps {
  currentCampaign: EmailCampaign | null;
  campaignSegments: CampaignSegmentFromStore[] | null;
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
  campaignSegments,
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
    if (!campaignSegments?.length) {
      errors.push('At least one audience segment is required');
    } else if (estimatedAudienceSize === 0) {
      errors.push('Selected segments have no recipients');
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
    const hasSegments = !!campaignSegments?.length;
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
                    <dd className={cn(typography.body, "font-medium")}>
                      {currentCampaign.name}
                    </dd>
                  </div>
                  <div className="flex flex-col">
                    <dt className="text-muted-foreground">Email Subject</dt>
                    <dd className={typography.body}>
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
                        <span className={cn(typography.body, "text-secondary font-medium")}>
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
                  <div className="flex flex-col">
                    <dt className="text-muted-foreground">Selected Segments</dt>
                    <dd>
                      {campaignSegments?.length ? (
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {campaignSegments.map(segment => (
                            <Badge 
                              key={segment.id} 
                              variant="secondary" 
                              className={cn(
                                "hover:bg-secondary/30 transition-colors duration-150",
                                transitions.scale
                              )}
                            >
                              {segment.segment?.name}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-destructive flex items-center gap-1.5">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          No segments selected
                        </span>
                      )}
                    </dd>
                  </div>
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

          {/* Action Buttons */}
          <div className="space-y-4">
            <h3 className={typography.h4}>Campaign Actions</h3>
            <div className="flex flex-wrap gap-3">
              <Button 
                onClick={internalHandleConfirmSend} 
                disabled={isSendingGlobal || !canSendOrSchedule || currentCampaign.status === 'scheduled' || validationErrors.length > 0}
                className={cn(buttonStyles.primary, validationErrors.length === 0 ? "animate-pulse" : "")}
                size="lg"
              >
                <Send className="mr-2 h-5 w-5" /> 
                Send Campaign Now
              </Button>
              
              {currentCampaign.status !== 'sending' && currentCampaign.status !== 'completed' && (
                <Button 
                  onClick={internalHandleScheduleClick} 
                  variant="outline"
                  className={buttonStyles.secondary}
                  disabled={validationErrors.length > 0}
                  size="lg"
                >
                  <Calendar className="mr-2 h-5 w-5" /> 
                  Schedule for Later
                </Button>
              )}
              
              <div className="flex-1 md:text-right"></div>
              
              <Button 
                onClick={() => setIsTestSendModalOpen(true)} 
                variant="outline"
                className={buttonStyles.outline}
              >
                <Send className="mr-2 h-4 w-4" /> 
                Send Test Email
              </Button>
              
              <Button 
                onClick={handleOpenLivePreview} 
                variant="outline"
                className={buttonStyles.outline}
              >
                <Eye className="mr-2 h-4 w-4" /> 
                Preview Content
              </Button>
            </div>
            
            {currentCampaign.status === 'scheduled' && currentCampaign.scheduled_at && (
              <div className={cn("p-3 border border-secondary/30 rounded-md bg-secondary/10 flex items-start gap-2 mt-4", transitions.fadeIn)}>
                <Calendar className="h-5 w-5 text-secondary shrink-0 mt-0.5" />
                <p className="text-sm">
                  This campaign is currently <strong>scheduled</strong> for {formatDate(currentCampaign.scheduled_at)}.
                  Sending now will override the existing schedule.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 