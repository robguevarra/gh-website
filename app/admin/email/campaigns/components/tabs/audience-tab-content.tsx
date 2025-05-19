'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Loader2, Users, PlusCircle, X, Search, Filter, BarChart, UserPlus, UserMinus } from 'lucide-react';
import { AudienceWarning } from '../audience-warning';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { 
  cardStyles, 
  buttonStyles, 
  typography, 
  transitions, 
  spacing,
  dataViz 
} from '../ui-utils';

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

export interface CampaignSegmentFromStore {
  id: string; 
  segment_id: string; 
  segment: {
    id: string; 
    name: string;
    description?: string | null;
  };
}

export interface AvailableSegmentFromStore {
  id: string;
  name: string;
  description?: string | null;
  user_count?: number | null;
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
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [addingSegment, setAddingSegment] = useState<string | null>(null);
  const [removingSegment, setRemovingSegment] = useState<string | null>(null);

  const handleAddSegment = async (segmentId: string) => {
    if (currentCampaignId) {
      try {
        setAddingSegment(segmentId);
        await addCampaignSegment(currentCampaignId, segmentId);
      } catch (error) {
        console.error('Error adding segment:', error);
      } finally {
        setAddingSegment(null);
      }
    }
  };

  const handleRemoveSegment = async (campaignSegmentId: string) => {
    if (currentCampaignId) {
      try {
        setRemovingSegment(campaignSegmentId);
        await removeCampaignSegment(currentCampaignId, campaignSegmentId);
      } catch (error) {
        console.error('Error removing segment:', error);
      } finally {
        setRemovingSegment(null);
      }
    }
  };

  // Filter available segments based on search query
  const filteredAvailableSegments = availableSegments?.filter(segment => {
    // Skip segments that are already added to the campaign
    const alreadyAdded = campaignSegments?.some(cs => cs.segment_id === segment.id);
    if (alreadyAdded) return false;
    
    // Apply search filter if there's a query
    if (!searchQuery) return true;
    return segment.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
           segment.description?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Calculate total audience size from all segments if not provided by estimatedAudienceSize
  const segmentsTotalAudience = campaignSegments?.reduce((total, segment) => {
    // If the segments have user counts, add them up
    const segmentCount = availableSegments?.find(s => s.id === segment.segment_id)?.user_count || 0;
    return total + segmentCount;
  }, 0) || 0;

  // Use either estimated audience or calculated total
  const audienceSize = estimatedAudienceSize ?? segmentsTotalAudience;

  return (
    <div className={cn("space-y-6", transitions.fadeIn)}>
      {/* Audience Overview Card */}
      <Card className={cardStyles.dashboard}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-semibold">Audience Overview</CardTitle>
              <CardDescription>
                Target your campaign based on user segments
              </CardDescription>
            </div>
            <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center">
              <Users className="h-6 w-6 text-primary" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Audience Size Visualization */}
            <div className="flex flex-col gap-2">
              <h4 className={cn(typography.h4, "flex items-center gap-1.5")}>
                <BarChart className="h-4 w-4 text-primary" />
                Estimated Audience
              </h4>
              
              <div className={cn("p-4 rounded-lg border", cardStyles.metrics)}>
                {segmentsLoading || availableSegmentsLoading ? (
                  <div className="flex flex-col items-center justify-center py-3">
                    <Loader2 className="h-8 w-8 animate-spin text-primary/60 mb-2" />
                    <p className={typography.muted}>Calculating audience size...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-baseline justify-between">
                      <span className={typography.subtle}>Total recipients</span>
                      <span className={cn("text-2xl font-bold text-primary", 
                        audienceSize > 0 ? transitions.fadeIn : "")}>
                        {audienceSize?.toLocaleString() || 0}
                      </span>
                    </div>
                    
                    {audienceSize > 0 && (
                      <div className="space-y-2">
                        <div className={dataViz.barChart}>
                          <div 
                            className={cn("h-full bg-primary transition-all duration-500 rounded-full", transitions.fadeIn)} 
                            style={{ width: '100%' }}
                          />
                        </div>
                        <div className="flex justify-between items-center text-xs text-muted-foreground">
                          <span>Selected segments: {campaignSegments?.length || 0}</span>
                        </div>
                      </div>
                    )}
                    
                    {audienceSize === 0 && !segmentsLoading && !availableSegmentsLoading && (
                      <p className={cn(typography.subtle, "text-center py-2")}>
                        No segments selected. Add segments below to build your audience.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Audience Warning */}
              <AudienceWarning size={audienceSize} />
            </div>
            
            {/* Selected Segments */}
            <div className="flex flex-col gap-2">
              <h4 className={cn(typography.h4, "flex items-center gap-1.5")}>
                <Users className="h-4 w-4 text-primary" />
                Selected Segments
              </h4>

              <div className={cn("rounded-lg border overflow-hidden", cardStyles.plain)}>
                {segmentsLoading ? (
                  <div className="flex items-center justify-center p-4">
                    <Loader2 className="h-5 w-5 animate-spin mr-2 text-primary/60" />
                    <span className={typography.subtle}>Loading segments...</span>
                  </div>
                ) : segmentsError ? (
                  <div className="p-4 text-destructive">
                    Error loading segments: {segmentsError}
                  </div>
                ) : campaignSegments && campaignSegments.length > 0 ? (
                  <div className="overflow-y-auto max-h-[300px]">
                    <ul className="divide-y">
                      {campaignSegments.map(cs => (
                        <li 
                          key={cs.id} 
                          className={cn(
                            "flex items-center justify-between p-3 hover:bg-muted/40 relative overflow-hidden",
                            removingSegment === cs.segment_id && "opacity-60",
                            transitions.hover
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "w-2 h-2 rounded-full bg-primary shrink-0",
                              transitions.pulse
                            )} />
                            <div>
                              <p className="font-medium">
                                {cs.segment?.name || 'Unnamed Segment'}
                              </p>
                              {cs.segment?.description && (
                                <p className={typography.subtle}>
                                  {cs.segment.description}
                                </p>
                              )}
                            </div>
                          </div>
                          
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleRemoveSegment(cs.segment_id)}
                            disabled={removingSegment === cs.segment_id}
                            className="shrink-0 text-muted-foreground hover:text-destructive"
                          >
                            {removingSegment === cs.segment_id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <X className="h-4 w-4" />
                            )}
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-3 p-6 border-dashed border-2 m-3 rounded-md">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                      <UserPlus className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className={typography.muted}>No segments selected</p>
                    <p className={cn(typography.subtle, "text-center")}>
                      Add segments from below to define your audience
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Available Segments Card */}
      <Card className={cardStyles.dashboard}>
        <CardHeader className="pb-3">
          <CardTitle className="text-xl font-semibold">Available Segments</CardTitle>
          <CardDescription>
            Add segments to target specific groups of users
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search and Filter */}
          <div className="flex items-center gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search segments..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          
          {/* Segments List */}
          <div className={cn("rounded-lg border overflow-hidden", cardStyles.plain)}>
            {availableSegmentsLoading ? (
              <div className="flex items-center justify-center p-6">
                <Loader2 className="h-5 w-5 animate-spin mr-2 text-primary/60" />
                <span className={typography.subtle}>Loading available segments...</span>
              </div>
            ) : availableSegmentsError ? (
              <div className="p-4 text-destructive">
                Error: {availableSegmentsError}
              </div>
            ) : filteredAvailableSegments && filteredAvailableSegments.length > 0 ? (
              <div className="overflow-y-auto max-h-[300px]">
                <ul className="divide-y">
                  {filteredAvailableSegments.map(segment => (
                    <li 
                      key={segment.id} 
                      className={cn(
                        "flex items-center justify-between p-3 hover:bg-muted/20 relative",
                        addingSegment === segment.id && "opacity-60",
                        transitions.hover
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-secondary/10 flex items-center justify-center shrink-0">
                          <Users className="h-4 w-4 text-secondary" />
                        </div>
                        <div>
                          <p className="font-medium">
                            {segment.name}
                          </p>
                          {segment.description && (
                            <p className={typography.subtle}>
                              {segment.description}
                            </p>
                          )}
                          {segment.user_count !== undefined && segment.user_count !== null && (
                            <p className={cn(typography.subtle, "flex items-center gap-1 mt-1")}>
                              <UserPlus className="h-3 w-3" />
                              <span>{segment.user_count.toLocaleString()} users</span>
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <Button 
                        variant="outline" 
                        size="sm"
                        className={cn(buttonStyles.secondary, "shrink-0")}
                        onClick={() => handleAddSegment(segment.id)}
                        disabled={addingSegment === segment.id}
                      >
                        {addingSegment === segment.id ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                            Adding...
                          </>
                        ) : (
                          <>
                            <PlusCircle className="h-3.5 w-3.5 mr-1" />
                            Add
                          </>
                        )}
                      </Button>
                    </li>
                  ))}
                </ul>
                
                {searchQuery && filteredAvailableSegments.length === 0 && (
                  <div className="p-6 text-center">
                    <p className={typography.muted}>No matching segments found</p>
                    <p className={typography.subtle}>Try adjusting your search terms</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 text-center">
                {searchQuery ? (
                  <p className={typography.muted}>No matching segments found</p>
                ) : availableSegments?.length === 0 ? (
                  <p className={typography.muted}>No segments available to add</p>
                ) : (
                  <p className={typography.muted}>All available segments have been added</p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 