'use client';

import { EmailCampaign } from '@/lib/supabase/data-access/campaign-management';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Loader2 } from 'lucide-react';

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
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="ml-2 text-muted-foreground">Loading campaign details...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Campaign Overview</CardTitle>
          <CardDescription>
            Summary of your campaign settings and status.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium">Details</h4>
              <Separator className="my-2" />
              <dl className="space-y-2 text-sm">
                <div>
                  <dt className="text-muted-foreground">Name:</dt>
                  <dd>{currentCampaign.name}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Subject:</dt>
                  <dd>{currentCampaign.subject || 'Not set'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Status:</dt>
                  <dd>{getStatusBadge(currentCampaign.status)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Created At:</dt>
                  <dd>{formatDate(currentCampaign.created_at)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Last Updated:</dt>
                  <dd>{formatDate(currentCampaign.updated_at)}</dd>
                </div>
                {currentCampaign.status === 'scheduled' && currentCampaign.scheduled_at && (
                  <div>
                    <dt className="text-muted-foreground">Scheduled For:</dt>
                    <dd>{formatDate(currentCampaign.scheduled_at)}</dd>
                  </div>
                )}
              </dl>
            </div>
            <div>
              <h4 className="font-medium">Audience</h4>
              <Separator className="my-2" />
              <dl className="space-y-2 text-sm">
                <div>
                  <dt className="text-muted-foreground">Estimated Recipients:</dt>
                  <dd>{estimatedAudienceSize?.toLocaleString() || 'N/A'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Segments:</dt>
                  <dd>
                    {campaignSegments && campaignSegments.length > 0
                      ? campaignSegments.map(segment => (
                          <Badge key={segment.id} variant="secondary" className="mr-1 mb-1">
                            {segment.name}
                          </Badge>
                        ))
                      : 'No segments selected'}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Performance Metrics</CardTitle>
          <CardDescription>
            Key performance indicators for this campaign.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {analyticsLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <p className="ml-2 text-muted-foreground">Loading analytics...</p>
            </div>
          ) : campaignAnalytics ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 text-sm">
              <div className="bg-muted/50 p-3 rounded-md">
                <p className="text-muted-foreground">Sent</p>
                <p className="text-xl font-semibold">{campaignAnalytics.total_sent?.toLocaleString() || '0'}</p>
              </div>
              <div className="bg-muted/50 p-3 rounded-md">
                <p className="text-muted-foreground">Opens</p>
                <p className="text-xl font-semibold">{campaignAnalytics.unique_opens?.toLocaleString() || '0'}</p>
                {campaignAnalytics.open_rate !== undefined && (
                  <p className="text-xs text-muted-foreground">({(campaignAnalytics.open_rate * 100).toFixed(1)}% rate)</p>
                )}
              </div>
              <div className="bg-muted/50 p-3 rounded-md">
                <p className="text-muted-foreground">Clicks</p>
                <p className="text-xl font-semibold">{campaignAnalytics.unique_clicks?.toLocaleString() || '0'}</p>
                {campaignAnalytics.click_rate !== undefined && (
                  <p className="text-xs text-muted-foreground">({(campaignAnalytics.click_rate * 100).toFixed(1)}% rate)</p>
                )}
              </div>
              <div className="bg-muted/50 p-3 rounded-md">
                <p className="text-muted-foreground">Bounces</p>
                <p className="text-xl font-semibold">{campaignAnalytics.total_bounces?.toLocaleString() || '0'}</p>
                {campaignAnalytics.bounce_rate !== undefined && (
                  <p className="text-xs text-muted-foreground">({(campaignAnalytics.bounce_rate * 100).toFixed(1)}% rate)</p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-6">No analytics data available for this campaign yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 