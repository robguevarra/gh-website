'use client';

import { useEffect, useState } from 'react';
import { EmailCampaign } from '@/lib/supabase/data-access/campaign-management';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Loader2, BarChart3, Users, Mail, Clock, Calendar, Send, CheckCircle, AlertTriangle, MinusCircle, Check, Search, Info, Eye } from 'lucide-react';
import { Typography } from '@/components/ui/typography';
import { cn } from '@/lib/utils';
import { 
  cardStyles, 
  badgeStyles, 
  typography, 
  spacing, 
  transitions 
} from '../ui-utils';
import { SegmentRules } from '@/types/campaigns';
import { AvailableSegmentFromStore } from './audience-tab-content';
import { Progress } from '@/components/ui/progress';

// Define a basic type for CampaignAnalytics if not already available globally
export interface CampaignAnalyticsData {
  total_sent?: number;
  total_delivered?: number;
  total_opens?: number;
  unique_opens?: number;
  total_clicks?: number;
  unique_clicks?: number;
  total_bounces?: number;
  total_complaints?: number;
  open_rate?: number;
  click_rate?: number;
  bounce_rate?: number;
  unsubscribe_rate?: number;
  // Add other fields as necessary based on your actual analytics data structure
}

// AudienceSegment is now AvailableSegmentFromStore for consistency with getSegmentDetails
export type AudienceSegmentForDisplay = Pick<AvailableSegmentFromStore, 'id' | 'name'>;

// Define type for the new sending stats
interface SendingStats {
  campaignId: string;
  campaignStatus: string;
  totalQueued: number;
  processedCount: number;
  failedPermanentCount: number;
  retryingCount: number;
  pendingCount: number;
  totalSentByProvider: number;
}

export interface OverviewTabContentProps {
  currentCampaign: EmailCampaign | null;
  campaignAnalytics: CampaignAnalyticsData | null;
  analyticsLoading: boolean;
  estimatedAudienceSize: number | null;
  formatDate: (dateString: string | null) => string;
  getStatusBadge: (status: string) => JSX.Element;
  audienceSizeLoading: boolean;
  audienceSizeError: string | null;
  audienceRulesDisplay: SegmentRules;
  getSegmentDetails: (segmentId: string) => AvailableSegmentFromStore | undefined;
}

export function OverviewTabContent({
  currentCampaign,
  campaignAnalytics,
  analyticsLoading,
  estimatedAudienceSize,
  formatDate,
  getStatusBadge,
  audienceSizeLoading,
  audienceSizeError,
  audienceRulesDisplay,
  getSegmentDetails,
}: OverviewTabContentProps) {
  const [sendingStats, setSendingStats] = useState<SendingStats | null>(null);
  const [sendingStatsLoading, setSendingStatsLoading] = useState<boolean>(false);
  const [sendingStatsError, setSendingStatsError] = useState<string | null>(null);

  useEffect(() => {
    let intervalId: NodeJS.Timeout | undefined;

    const fetchStats = async () => {
      if (currentCampaign && (currentCampaign.status === 'sending' || currentCampaign.status === 'sent')) {
        setSendingStatsLoading(true);
        setSendingStatsError(null);
        try {
          const response = await fetch(`/api/admin/campaigns/${currentCampaign.id}/sending-stats`);
          if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || 'Failed to fetch sending stats');
          }
          const data = await response.json();
          setSendingStats(data.stats);
        } catch (error: any) {
          console.error("Error fetching sending stats:", error);
          setSendingStatsError(error.message);
          setSendingStats(null); // Clear stats on error
        } finally {
          setSendingStatsLoading(false);
        }
      }
    };

    fetchStats(); // Initial fetch

    if (currentCampaign && (currentCampaign.status === 'sending' || currentCampaign.status === 'sent')) {
      intervalId = setInterval(fetchStats, 15000); // Poll every 15 seconds
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [currentCampaign?.id, currentCampaign?.status]); // Dependencies: campaign ID and status

  if (!currentCampaign) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary/70" />
        <p className={cn(typography.muted, "animate-pulse")}>Loading campaign details...</p>
      </div>
    );
  }

  const renderEstimatedAudience = () => {
    if (audienceSizeLoading) {
      return <Loader2 className={cn(typography.h3, "h-6 w-6 animate-spin ml-2 text-primary")} />;
    }
    if (audienceSizeError) {
      return <span className={cn(typography.p, "text-destructive text-sm ml-2 flex items-center")}><AlertTriangle className="h-4 w-4 mr-1" /> Error</span>;
    }
    if (estimatedAudienceSize !== null) {
      return <span className={cn(typography.h3, "text-2xl font-semibold text-primary")}>{estimatedAudienceSize.toLocaleString()}</span>;
    }
    return <span className={cn(typography.h3, "text-2xl font-semibold text-muted-foreground")}>N/A</span>;
  };

  const includedSegments = audienceRulesDisplay?.include?.segmentIds
    ?.map(id => getSegmentDetails(id))
    .filter(Boolean) as AvailableSegmentFromStore[] || [];

  const excludedSegments = audienceRulesDisplay?.exclude?.segmentIds
    ?.map(id => getSegmentDetails(id))
    .filter(Boolean) as AvailableSegmentFromStore[] || [];

  // Helper function to get status style based on status
  const getStatusClass = (status: string) => {
    switch (status.toLowerCase()) {
      case 'draft':
        return badgeStyles.draft;
      case 'scheduled':
        return badgeStyles.scheduled;
      case 'sending':
        return badgeStyles.sending;
      case 'completed':
        return badgeStyles.completed;
      case 'cancelled':
        return badgeStyles.cancelled;
      default:
        return badgeStyles.draft;
    }
  };

  return (
    <div className={cn(spacing.section, transitions.fadeIn, "mb-6")}>
      {/* Campaign Overview Section */}
      <Card className={cardStyles.elevated}>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start flex-wrap gap-2">
            <div>
              <CardTitle className={typography.h2}>Campaign Overview</CardTitle>
              <CardDescription className="mt-1.5">
                Summary of your email campaign
              </CardDescription>
            </div>
            {getStatusBadge(currentCampaign.status)}
          </div>
        </CardHeader>
        <CardContent className={spacing.card}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            {/* Details Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                <h3 className={typography.h4}>Details</h3>
              </div>
              <Separator className="my-2" />
              <dl className="grid grid-cols-1 gap-3">
                <div className="flex flex-col">
                  <dt className={cn(typography.muted, "text-sm")}>Name</dt>
                  <dd className={cn(typography.lead, "font-semibold")}>{currentCampaign.name}</dd>
                </div>
                <div className="flex flex-col">
                  <dt className={cn(typography.muted, "text-sm")}>Subject</dt>
                  <dd className={cn(typography.p, "font-medium")}>{currentCampaign.subject || 'Not set'}</dd>
                </div>
                <div className="flex flex-col">
                  <dt className={cn(typography.muted, "text-sm")}>Created</dt>
                  <dd className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className={typography.p}>{formatDate(currentCampaign.created_at)}</span>
                  </dd>
                </div>
                <div className="flex flex-col">
                  <dt className={cn(typography.muted, "text-sm")}>Last Updated</dt>
                  <dd className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className={typography.p}>{formatDate(currentCampaign.updated_at)}</span>
                  </dd>
                </div>
                {currentCampaign.status === 'scheduled' && currentCampaign.scheduled_at && (
                  <div className="flex flex-col">
                    <dt className={cn(typography.muted, "text-sm")}>Scheduled For</dt>
                    <dd className="flex items-center gap-1.5">
                      <Send className="h-3.5 w-3.5 text-secondary" />
                      <span className={cn(typography.p, "text-secondary font-medium")}>{formatDate(currentCampaign.scheduled_at)}</span>
                    </dd>
                  </div>
                )}
                {currentCampaign.status === 'completed' && currentCampaign.completed_at && (
                  <div className="flex flex-col">
                    <dt className={cn(typography.muted, "text-sm")}>Completed At</dt>
                    <dd className="flex items-center gap-1.5">
                      <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                      <span className={cn(typography.p, "text-green-700 font-semibold")}>{formatDate(currentCampaign.completed_at)}</span>
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Audience Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <h3 className={typography.h4}>Audience</h3>
              </div>
              <Separator className="my-2" />
              <dl className="grid grid-cols-1 gap-4">
                <div className="flex flex-col">
                  <dt className={cn(typography.muted, "text-sm mb-0.5")}>Estimated Recipients</dt>
                  <dd className="flex items-center">
                    {renderEstimatedAudience()}
                  </dd>
                  {audienceSizeError && <p className={cn(typography.small, "text-destructive mt-1")}>Details: {audienceSizeError}</p>}
                </div>
                
                <div className="flex flex-col">
                  <dt className={cn(typography.muted, "text-sm mb-1")}>
                    Included Segments 
                    {audienceRulesDisplay?.include?.segmentIds && audienceRulesDisplay.include.segmentIds.length > 0 && (
                       <span className="text-xs font-normal"> (Match <span className="font-semibold">{audienceRulesDisplay.include.operator}</span>)</span>
                    )}
                  </dt>
                  <dd>
                    <div className="flex flex-wrap gap-1.5">
                      {includedSegments.length > 0
                        ? includedSegments.map(segment => (
                            <Badge 
                              key={segment.id} 
                              variant="secondary" 
                              className={cn(
                                "hover:bg-secondary/30 transition-colors duration-150 font-normal text-xs py-0.5 px-2",
                                transitions.scaleIn
                              )}
                            >
                              <Check className="h-3 w-3 mr-1 text-green-600"/>
                              {segment.name}
                            </Badge>
                          ))
                        : <span className={cn(typography.muted, "text-xs italic")}>No segments specifically included.</span>}
                    </div>
                  </dd>
                </div>

                <div className="flex flex-col">
                  <dt className={cn(typography.muted, "text-sm mb-1")}>Excluded Segments</dt>
                  <dd>
                    <div className="flex flex-wrap gap-1.5">
                      {excludedSegments.length > 0
                        ? excludedSegments.map(segment => (
                            <Badge 
                              key={segment.id} 
                              variant="outline"
                              className={cn(
                                "border-destructive/50 text-destructive-foreground hover:bg-destructive/10 transition-colors duration-150 font-normal text-xs py-0.5 px-2",
                                transitions.scaleIn
                              )}
                            >
                              <MinusCircle className="h-3 w-3 mr-1"/>
                              {segment.name}
                            </Badge>
                          ))
                        : <span className={cn(typography.muted, "text-xs italic")}>No segments excluded.</span>}
                    </div>
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sending Progress Section - NEW */}
      {(currentCampaign.status === 'sending' || currentCampaign.status === 'sent') && (
        <Card className={cn(cardStyles.elevated, "mt-6")}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Send className="h-5 w-5 text-primary animate-pulse" />
              <CardTitle className={typography.h3}>Sending Progress</CardTitle>
            </div>
            <CardDescription>
              Live update of emails being processed through the queue.
            </CardDescription>
          </CardHeader>
          <CardContent className={spacing.card}>
            {sendingStatsLoading && !sendingStats && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-3 text-muted-foreground">Loading progress...</p>
              </div>
            )}
            {sendingStatsError && (
              <div className="text-destructive text-sm p-4 border border-destructive/30 bg-destructive/10 rounded-md">
                <AlertTriangle className="inline h-4 w-4 mr-2" /> Could not load sending progress: {sendingStatsError}
              </div>
            )}
            {sendingStats && (
              <div className="space-y-5">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className={cn(typography.p, "font-medium")}>
                      Overall Progress (Processed / Targeted)
                    </span>
                    <span className={cn(typography.p, "font-semibold text-primary")}>
                      {sendingStats.processedCount.toLocaleString()} / {sendingStats.totalQueued.toLocaleString()}
                    </span>
                  </div>
                  <Progress 
                    value={(sendingStats.totalQueued > 0 ? (sendingStats.processedCount / sendingStats.totalQueued) * 100 : 0)} 
                    className="h-3 rounded-full bg-primary/20" 
                  />
                  {sendingStats.campaignStatus === 'sent' && sendingStats.pendingCount === 0 && sendingStats.retryingCount === 0 && sendingStats.processedCount === sendingStats.totalQueued && (
                     <p className={cn(typography.small, "text-green-600 mt-1.5 flex items-center")}><CheckCircle className="h-4 w-4 mr-1.5"/>All targeted emails have been processed by the queue.</p>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 text-sm">
                  <div className="p-3 border rounded-md bg-background">
                    <dt className={cn(typography.muted, "text-sm mb-0.5")}>Targeted</dt>
                    <dd className={cn(typography.h3, "font-bold")}>{sendingStats.totalQueued.toLocaleString()}</dd>
                  </div>
                  <div className="p-3 border rounded-md bg-background">
                    <dt className={cn(typography.muted, "text-sm mb-0.5")}>Processed by Queue</dt>
                    <dd className={cn(typography.h3, "font-bold text-green-600")}>{sendingStats.processedCount.toLocaleString()}</dd>
                  </div>
                  <div className="p-3 border rounded-md bg-background">
                    <dt className={cn(typography.muted, "text-sm mb-0.5")}>Waiting in Queue</dt>
                    <dd className={cn(typography.h3, "font-bold text-blue-600")}>{sendingStats.pendingCount.toLocaleString()}</dd>
                  </div>
                  <div className="p-3 border rounded-md bg-background">
                    <dt className={cn(typography.muted, "text-sm mb-0.5")}>Pending Retry</dt>
                    <dd className={cn(typography.h3, "font-bold text-amber-600")}>{sendingStats.retryingCount.toLocaleString()}</dd>
                  </div>
                  <div className="p-3 border rounded-md bg-background">
                    <dt className={cn(typography.muted, "text-sm mb-0.5")}>Failed (No Retry)</dt>
                    <dd className={cn(typography.h3, "font-bold text-destructive")}>{sendingStats.failedPermanentCount.toLocaleString()}</dd>
                  </div>
                </div>
                {currentCampaign.status_message && (
                  <div className="p-3 border-l-4 border-primary bg-primary/5 rounded-r-md mt-4">
                    <p className={cn(typography.small, "text-primary/90")}>
                      <span className="font-semibold">Campaign Status Message:</span> {currentCampaign.status_message}
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* NEW: Campaign Performance Metrics Section */}
      <Card className={cn(cardStyles.elevated, "mt-6")}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <CardTitle className={typography.h3}>Performance Metrics</CardTitle>
          </div>
          <CardDescription>
            Key performance indicators for this campaign.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {analyticsLoading && (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary/70" />
              <p className={cn(typography.muted, "ml-3")}>Loading performance data...</p>
            </div>
          )}
          {!analyticsLoading && !campaignAnalytics && (
            <div className="text-center py-10">
              <Info className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className={cn(typography.muted)}>
                Performance data is not yet available for this campaign or could not be loaded.
              </p>
            </div>
          )}
          {!analyticsLoading && campaignAnalytics && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <MetricCard 
                title="Delivered"
                value={(campaignAnalytics.total_delivered ?? 0).toLocaleString()}
                icon={<CheckCircle className="h-5 w-5 text-green-500" />}
              />
              <MetricCard 
                title="Total Opens"
                value={(campaignAnalytics.total_opens ?? 0).toLocaleString()}
                rate={`${(campaignAnalytics.open_rate ?? 0).toFixed(1)}% Open Rate`}
                icon={<Eye className="h-5 w-5 text-blue-500" />}
              />
              <MetricCard 
                title="Total Clicks"
                value={(campaignAnalytics.total_clicks ?? 0).toLocaleString()}
                rate={`${(campaignAnalytics.click_rate ?? 0).toFixed(1)}% Click-to-Open Rate`}
                icon={<Check className="h-5 w-5 text-indigo-500" />}
              />
               <MetricCard 
                title="Bounces"
                value={(campaignAnalytics.total_bounces ?? 0).toLocaleString()}
                rate={`${(campaignAnalytics.bounce_rate ?? 0).toFixed(1)}% Bounce Rate`}
                icon={<AlertTriangle className="h-5 w-5 text-orange-500" />}
              />
              <MetricCard 
                title="Spam Complaints"
                value={((campaignAnalytics as any).total_spam_complaints ?? campaignAnalytics.total_complaints ?? 0).toLocaleString()}
                icon={<AlertTriangle className="h-5 w-5 text-red-500" />}
              />
              {/* Add more MetricCards as needed, e.g., for total_sent, unsubscribe_rate if available */}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Audience Section - REMAINS UNCHANGED */}
      <Card className={cn(cardStyles.elevated, "mt-6")}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <CardTitle className={typography.h3}>Audience</CardTitle>
          </div>
          <CardDescription>
            Details about the audience for this campaign.
          </CardDescription>
        </CardHeader>
        <CardContent className={spacing.card}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            {/* Audience Details */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                <h3 className={typography.h4}>Audience Details</h3>
              </div>
              <Separator className="my-2" />
              <dl className="grid grid-cols-1 gap-3">
                <div className="flex flex-col">
                  <dt className={cn(typography.muted, "text-sm")}>Estimated Recipients</dt>
                  <dd className="flex items-center">
                    {renderEstimatedAudience()}
                  </dd>
                  {audienceSizeError && <p className={cn(typography.small, "text-destructive mt-1")}>Details: {audienceSizeError}</p>}
                </div>
              </dl>
            </div>

            {/* Audience Segments */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <h3 className={typography.h4}>Audience Segments</h3>
              </div>
              <Separator className="my-2" />
              <dl className="grid grid-cols-1 gap-4">
                <div className="flex flex-col">
                  <dt className={cn(typography.muted, "text-sm mb-1")}>
                    Included Segments 
                    {audienceRulesDisplay?.include?.segmentIds && audienceRulesDisplay.include.segmentIds.length > 0 && (
                       <span className="text-xs font-normal"> (Match <span className="font-semibold">{audienceRulesDisplay.include.operator}</span>)</span>
                    )}
                  </dt>
                  <dd>
                    <div className="flex flex-wrap gap-1.5">
                      {includedSegments.length > 0
                        ? includedSegments.map(segment => (
                            <Badge 
                              key={segment.id} 
                              variant="secondary" 
                              className={cn(
                                "hover:bg-secondary/30 transition-colors duration-150 font-normal text-xs py-0.5 px-2",
                                transitions.scaleIn
                              )}
                            >
                              <Check className="h-3 w-3 mr-1 text-green-600"/>
                              {segment.name}
                            </Badge>
                          ))
                        : <span className={cn(typography.muted, "text-xs italic")}>No segments specifically included.</span>}
                    </div>
                  </dd>
                </div>

                <div className="flex flex-col">
                  <dt className={cn(typography.muted, "text-sm mb-1")}>Excluded Segments</dt>
                  <dd>
                    <div className="flex flex-wrap gap-1.5">
                      {excludedSegments.length > 0
                        ? excludedSegments.map(segment => (
                            <Badge 
                              key={segment.id} 
                              variant="outline"
                              className={cn(
                                "border-destructive/50 text-destructive-foreground hover:bg-destructive/10 transition-colors duration-150 font-normal text-xs py-0.5 px-2",
                                transitions.scaleIn
                              )}
                            >
                              <MinusCircle className="h-3 w-3 mr-1"/>
                              {segment.name}
                            </Badge>
                          ))
                        : <span className={cn(typography.muted, "text-xs italic")}>No segments excluded.</span>}
                    </div>
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string;
  rate?: string;
  variant?: 'default' | 'success' | 'warning';
  icon?: React.ReactNode;
}

function MetricCard({ title, value, rate, variant = 'default', icon }: MetricCardProps) {
  const getVariantClasses = () => {
    switch (variant) {
      case 'success':
        return 'bg-success/10 text-success-foreground';
      case 'warning':
        return 'bg-warning/10 text-warning-foreground';
      default:
        return 'bg-muted/30';
    }
  };

  return (
    <div className={cn("p-4 rounded-lg shadow-sm", getVariantClasses(), transitions.hover)}>
      <div className="flex items-center justify-between mb-1">
        <h4 className="text-sm font-medium">{title}</h4>
        {icon && <div className="text-muted-foreground/70">{icon}</div>}
      </div>
      <p className="text-2xl font-bold">{value}</p>
      {rate && <p className="text-xs text-muted-foreground">{rate}</p>}
    </div>
  );
} 