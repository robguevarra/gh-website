'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Loader2 } from 'lucide-react';
import { AudienceWarning } from '../audience-warning'; // Assuming path

// Re-using basic AudienceSegment type, ensure this matches what useCampaignStore provides
// If the store provides a more complex type (e.g., with a nested `segment` object), adjust accordingly.
export interface AudienceSegment {
  id: string;
  name: string;
  // If the actual segment data is nested, e.g., segment.segment.name, this type and its usage below needs adjustment.
  // For now, assuming `name` is a direct property of items in `campaignSegments` and `availableSegments`.
  // Based on previous linter fixes, it seems campaignSegments items are { id: string, segment: { id: string, name: string } }
  // Let's adjust this type and usage if that's the case.
}

// More accurate segment type based on previous fixes
interface CampaignSegmentFromStore {
    id: string; // This is the campaign_segment link ID
    segment_id: string; // Foreign key to segments table
    segment: {
        id: string; // Actual segment ID
        name: string;
        description?: string | null;
    };
}

interface AvailableSegmentFromStore {
    id: string; // Actual segment ID
    name: string;
    description?: string | null;
}

export interface AudienceTabContentProps {
  currentCampaignId: string | undefined;
  campaignSegments: CampaignSegmentFromStore[] | null;
  segmentsLoading: boolean;
  segmentsError: string | null;
  availableSegments: AvailableSegmentFromStore[] | null;
  availableSegmentsLoading: boolean;
  availableSegmentsError: string | null;
  addCampaignSegment: (campaignId: string, segmentId: string) => Promise<void>;
  removeCampaignSegment: (campaignId: string, campaignSegmentId: string) => Promise<void>; // campaignSegmentId is the ID of the link record
  estimatedAudienceSize: number | null;
}

export function AudienceTabContent({
  currentCampaignId,
  campaignSegments,
  segmentsLoading,
  segmentsError,
  availableSegments,
  availableSegmentsLoading,
  availableSegmentsError,
  addCampaignSegment,
  removeCampaignSegment,
  estimatedAudienceSize,
}: AudienceTabContentProps) {

  const handleAddSegment = (segmentId: string) => {
    if (currentCampaignId) {
      addCampaignSegment(currentCampaignId, segmentId);
    }
  };

  const handleRemoveSegment = (campaignSegmentId: string) => {
    if (currentCampaignId) {
      // Note: The removeCampaignSegment from store might expect the ID of the campaign_segments junction table record,
      // which is `segment.id` from the campaignSegments array.
      removeCampaignSegment(currentCampaignId, campaignSegmentId);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Audience Targeting</CardTitle>
        <CardDescription>
          Select user segments to target with this campaign.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h4 className="text-lg font-medium mb-2">Included Segments</h4>
          {segmentsLoading && <p><Loader2 className="inline h-4 w-4 mr-2 animate-spin"/>Loading segments...</p>}
          {segmentsError && <p className="text-red-500">Error loading segments: {segmentsError}</p>}
          {campaignSegments && campaignSegments.length > 0 ? (
            <ul className="space-y-2">
              {campaignSegments.map(cs => (
                <li key={cs.id} className="flex items-center justify-between p-2 border rounded-md">
                  <span>{cs.segment?.name || 'Unnamed Segment'}</span>
                  <Button variant="ghost" size="sm" onClick={() => handleRemoveSegment(cs.id)}> 
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            !segmentsLoading && <p className="text-sm text-muted-foreground">No segments are currently targeted by this campaign.</p>
          )}
        </div>
        <Separator />
        <div>
          <h4 className="text-lg font-medium mb-2">Add Segments</h4>
          {availableSegmentsLoading && <p><Loader2 className="inline h-4 w-4 mr-2 animate-spin"/>Loading available segments...</p>}
          {availableSegmentsError && <p className="text-red-500">Error: {availableSegmentsError}</p>}
          {availableSegments && availableSegments.length > 0 ? (
            <ul className="space-y-2 max-h-60 overflow-y-auto border rounded-md p-2">
              {availableSegments
                .filter(as => !campaignSegments?.find(cs => cs.segment_id === as.id))
                .map(segment => (
                  <li key={segment.id} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-md">
                    <span>{segment.name}{segment.description ? ` (${segment.description})` : ''}</span>
                    <Button variant="outline" size="sm" onClick={() => handleAddSegment(segment.id)}>
                      Add
                    </Button>
                  </li>
                ))}
              {availableSegments.filter(as => !campaignSegments?.find(cs => cs.segment_id === as.id)).length === 0 && !availableSegmentsLoading && (
                  <p className="text-sm text-muted-foreground p-2">All available segments are already added.</p>
              )}
            </ul>
          ) : (
            !availableSegmentsLoading && <p className="text-sm text-muted-foreground">No additional segments available to add.</p>
          )}
        </div>
        <AudienceWarning size={estimatedAudienceSize || undefined} />
      </CardContent>
    </Card>
  );
} 