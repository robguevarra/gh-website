'use client';

import { EmailCampaign } from '@/lib/supabase/data-access/campaign-management';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Loader2, BarChart3, Users, Mail, Clock, Calendar, Send } from 'lucide-react';
import { Typography } from '@/components/ui/typography';
import { cn } from '@/lib/utils';
import { 
  cardStyles, 
  badgeStyles, 
  typography, 
  spacing, 
  transitions 
} from '../ui-utils';

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

// Define a basic type for AudienceSegment if not already available globally
export interface AudienceSegment {
  id: string;
  name: string;
  // Add other fields as necessary
}

export interface OverviewTabContentProps {
  currentCampaign: EmailCampaign | null;
  campaignAnalytics: CampaignAnalyticsData | null;
  analyticsLoading: boolean;
  estimatedAudienceSize: number | null;
  campaignSegments: AudienceSegment[] | null;
  formatDate: (dateString: string | null) => string;
  getStatusBadge: (status: string) => JSX.Element;
}

export function OverviewTabContent({
  currentCampaign,
  campaignAnalytics,
  analyticsLoading,
  estimatedAudienceSize,
  campaignSegments,
  formatDate,
  getStatusBadge,
}: OverviewTabContentProps) {
  if (!currentCampaign) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary/70" />
        <p className={cn(typography.muted, "animate-pulse")}>Loading campaign details...</p>
      </div>
    );
  }

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
            <Badge className={cn(getStatusClass(currentCampaign.status), "text-xs px-3 py-1 rounded-full")}>
              {currentCampaign.status.charAt(0).toUpperCase() + currentCampaign.status.slice(1)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className={spacing.card}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Details Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                <h3 className={typography.h4}>Details</h3>
              </div>
              <Separator className="my-2" />
              <dl className="grid grid-cols-1 gap-3">
                <div className="flex flex-col">
                  <dt className="text-muted-foreground text-sm">Name</dt>
                  <dd className={cn(typography.p, "font-medium")}>{currentCampaign.name}</dd>
                </div>
                <div className="flex flex-col">
                  <dt className="text-muted-foreground text-sm">Subject</dt>
                  <dd className={typography.p}>{currentCampaign.subject || 'Not set'}</dd>
                </div>
                <div className="flex flex-col">
                  <dt className="text-muted-foreground text-sm">Created</dt>
                  <dd className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className={typography.p}>{formatDate(currentCampaign.created_at)}</span>
                  </dd>
                </div>
                <div className="flex flex-col">
                  <dt className="text-muted-foreground text-sm">Last Updated</dt>
                  <dd className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className={typography.p}>{formatDate(currentCampaign.updated_at)}</span>
                  </dd>
                </div>
                {currentCampaign.status === 'scheduled' && currentCampaign.scheduled_at && (
                  <div className="flex flex-col">
                    <dt className="text-muted-foreground text-sm">Scheduled For</dt>
                    <dd className="flex items-center gap-1.5">
                      <Send className="h-3.5 w-3.5 text-secondary" />
                      <span className={cn(typography.p, "text-secondary font-medium")}>{formatDate(currentCampaign.scheduled_at)}</span>
                    </dd>
                  </div>
                )}
                {currentCampaign.status === 'completed' && currentCampaign.completed_at && (
                  <div className="flex flex-col">
                    <dt className="text-muted-foreground text-sm">Completed At</dt>
                    <dd className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-green-600" />
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
              <dl className="grid grid-cols-1 gap-3">
                <div className="flex flex-col">
                  <dt className="text-muted-foreground text-sm">Estimated Recipients</dt>
                  <dd className={cn(typography.h3, "text-2xl font-semibold text-primary")}>
                    {estimatedAudienceSize ? estimatedAudienceSize.toLocaleString() : 'N/A'}
                  </dd>
                </div>
                <div className="flex flex-col">
                  <dt className="text-muted-foreground text-sm">Segments</dt>
                  <dd>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {campaignSegments && campaignSegments.length > 0
                        ? campaignSegments.map(segment => (
                            <Badge 
                              key={segment.id} 
                              variant="secondary" 
                              className={cn(
                                "hover:bg-secondary/30 transition-colors duration-150",
                                transitions.scaleIn
                              )}
                            >
                              {segment.name}
                            </Badge>
                          ))
                        : <span className="text-muted-foreground italic">No segments selected</span>}
                    </div>
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Metrics Section */}
      <Card className={cardStyles.elevated}>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <CardTitle className={typography.h3}>Performance Metrics</CardTitle>
          </div>
          <CardDescription className="mt-1">
            Key performance indicators for this campaign
          </CardDescription>
        </CardHeader>
        <CardContent>
          {analyticsLoading ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary/70" />
              <p className={cn(typography.muted, "animate-pulse")}>Loading analytics data...</p>
            </div>
          ) : campaignAnalytics ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard 
                title="Sent" 
                value={campaignAnalytics.total_sent?.toLocaleString() || '0'} 
                icon={<Send className="h-4 w-4" />}
              />
              <MetricCard 
                title="Opens" 
                value={campaignAnalytics.unique_opens?.toLocaleString() || '0'} 
                rate={campaignAnalytics.open_rate !== undefined ? `${(campaignAnalytics.open_rate * 100).toFixed(1)}%` : undefined}
                icon={<Mail className="h-4 w-4" />}
              />
              <MetricCard 
                title="Clicks" 
                value={campaignAnalytics.unique_clicks?.toLocaleString() || '0'} 
                rate={campaignAnalytics.click_rate !== undefined ? `${(campaignAnalytics.click_rate * 100).toFixed(1)}%` : undefined}
                icon={<Users className="h-4 w-4" />}
              />
              <MetricCard 
                title="Bounces" 
                value={campaignAnalytics.total_bounces?.toLocaleString() || '0'} 
                rate={campaignAnalytics.bounce_rate !== undefined ? `${(campaignAnalytics.bounce_rate * 100).toFixed(1)}%` : undefined}
                variant="warning"
                icon={<Mail className="h-4 w-4" />}
              />
            </div>
          ) : (
            <div className="bg-muted/30 rounded-lg p-6 text-center">
              <p className={typography.muted}>No analytics data available for this campaign yet.</p>
            </div>
          )}
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
        return 'bg-primary/10 border-primary/20';
      case 'warning':
        return 'bg-destructive/10 border-destructive/20';
      default:
        return 'bg-muted/50 border-border';
    }
  };

  return (
    <div className={cn(
      "rounded-lg p-4 border transition-all duration-200 hover:shadow-sm", 
      getVariantClasses(),
      transitions.hover
    )}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        {icon && <span className="text-muted-foreground">{icon}</span>}
      </div>
      <p className={cn(typography.h3, "text-2xl font-semibold")}>{value}</p>
      {rate && (
        <p className="text-xs text-muted-foreground mt-1">{rate} rate</p>
      )}
    </div>
  );
} 