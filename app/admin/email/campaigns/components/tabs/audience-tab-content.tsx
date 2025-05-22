'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Users, PlusCircle, X, Search, Filter, BarChart, UserPlus, UserMinus, Save } from 'lucide-react';
import { AudienceWarning } from '../audience-warning';
import { useState, ChangeEvent } from 'react';
import { cn } from '@/lib/utils';
import { 
  cardStyles, 
  buttonStyles, 
  typography, 
  transitions, 
  spacing,
  dataViz,
  inputStyles
} from '../ui-utils';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';

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

export interface SegmentRules {
  version: number;
  include: {
    operator: 'AND' | 'OR';
    segmentIds: string[];
  };
  exclude: {
    segmentIds: string[];
  };
}

export interface AudienceTabContentProps {
  currentCampaignId: string | undefined;
  segmentRules: SegmentRules;
  segmentsLoading: boolean;
  segmentsError: string | null;
  availableSegments: AvailableSegmentFromStore[] | null;
  availableSegmentsLoading: boolean;
  availableSegmentsError: string | null;
  estimatedAudienceSize: number | null;
  setIncludeOperator: (operator: 'AND' | 'OR') => void;
  addIncludeSegmentId: (segmentId: string) => void;
  removeIncludeSegmentId: (segmentId: string) => void;
  addExcludeSegmentId: (segmentId: string) => void;
  removeExcludeSegmentId: (segmentId: string) => void;
  getSegmentDetails: (segmentId: string) => AvailableSegmentFromStore | undefined;
  saveSegmentRules: () => Promise<void>;
}

export function AudienceTabContent({
  currentCampaignId,
  segmentRules,
  segmentsLoading,
  segmentsError,
  availableSegments,
  availableSegmentsLoading,
  availableSegmentsError,
  estimatedAudienceSize,
  setIncludeOperator,
  addIncludeSegmentId,
  removeIncludeSegmentId,
  addExcludeSegmentId,
  removeExcludeSegmentId,
  getSegmentDetails,
  saveSegmentRules,
}: AudienceTabContentProps) {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSavingRules, setIsSavingRules] = useState(false);
  const [selectedAvailableSegmentId, setSelectedAvailableSegmentId] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSaveRules = async () => {
    setIsSavingRules(true);
    try {
      await saveSegmentRules();
      toast({
        title: "Audience Rules Saved",
        description: "Your audience targeting rules have been successfully saved.",
      });
    } catch (error: any) {
      toast({
        title: "Error Saving Rules",
        description: error.message || "An unexpected error occurred while saving audience rules.",
        variant: "destructive",
      });
    } finally {
      setIsSavingRules(false);
    }
  };

  const handleAddSegmentToInclude = () => {
    if (selectedAvailableSegmentId) {
      addIncludeSegmentId(selectedAvailableSegmentId);
      setSelectedAvailableSegmentId(null); // Clear selection
    }
  };

  const handleAddSegmentToExclude = () => {
    if (selectedAvailableSegmentId) {
      addExcludeSegmentId(selectedAvailableSegmentId);
      setSelectedAvailableSegmentId(null); // Clear selection
    }
  };

  // Derived list of campaign segments for display (simplified for now)
  const displayedCampaignSegments = 
    (segmentRules && 
     segmentRules.include && 
     Array.isArray(segmentRules.include.segmentIds)
    )
      ? segmentRules.include.segmentIds.map(id => getSegmentDetails(id)).filter(Boolean) as AvailableSegmentFromStore[]
      : [];

  // Filter available segments based on search query AND what's already included/excluded
  const filteredAvailableSegments = availableSegments?.filter(segment => {
    const alreadyIncluded = segmentRules && segmentRules.include && Array.isArray(segmentRules.include.segmentIds) ? segmentRules.include.segmentIds.includes(segment.id) : false;
    const alreadyExcluded = segmentRules && segmentRules.exclude && Array.isArray(segmentRules.exclude.segmentIds) ? segmentRules.exclude.segmentIds.includes(segment.id) : false;
    if (alreadyIncluded || alreadyExcluded) return false;
    
    if (!searchQuery) return true;
    return segment.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
           (segment.description && segment.description.toLowerCase().includes(searchQuery.toLowerCase()));
  });

  const audienceSize = estimatedAudienceSize ?? 0; // Default to 0 if null

  return (
    <div className={cn("space-y-6", transitions.fadeIn)}>
      {/* Audience Overview Card */}
      <Card className={cardStyles.dashboard}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-semibold">Audience Overview</CardTitle>
              <CardDescription>
                Configure and review your campaign's target audience.
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
                      <span className={cn("text-2xl font-bold text-primary", audienceSize > 0 ? transitions.fadeIn : "")}>
                        {audienceSize?.toLocaleString() || '-'} {/* Show dash if 0 or not calculated yet*/}
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
                      </div>
                    )}
                    {audienceSize === 0 && !segmentsLoading && !availableSegmentsLoading && (
                      <p className={cn(typography.subtle, "text-center py-2")}>
                        Configure your audience below to see an estimate.
                      </p>
                    )}
                  </div>
                )}
              </div>
              <AudienceWarning size={audienceSize} />
            </div>

            {/* Human Readable Summary (Placeholder - to be implemented with logic) */}
            <div className="flex flex-col gap-2">
                <h4 className={cn(typography.h4, "flex items-center gap-1.5")}>
                    <Filter className="h-4 w-4 text-primary" />
                    Current Rules
                </h4>
                <div className={cn("p-4 rounded-lg border min-h-[100px]", cardStyles.plain, typography.subtle)}>
                    <p>Include if: {(segmentRules && segmentRules.include && Array.isArray(segmentRules.include.segmentIds) && segmentRules.include.segmentIds.length > 0) 
                        ? segmentRules.include.segmentIds.map(id => getSegmentDetails(id)?.name || id).join(` ${segmentRules.include.operator} `) 
                        : "No segments selected"}
                    </p>
                    {(segmentRules && segmentRules.exclude && Array.isArray(segmentRules.exclude.segmentIds) && segmentRules.exclude.segmentIds.length > 0) && (
                        <p className="mt-2">Exclude if: {segmentRules.exclude.segmentIds.map(id => getSegmentDetails(id)?.name || id).join(' OR ')}</p>
                    )}
                </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Included Audiences Configuration */}
      <Card className={cardStyles.dashboard}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" /> 
            Define Included Audience
          </CardTitle>
          <CardDescription>
            Select segments and specify if recipients must match ANY (OR) or ALL (AND) of them.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="include-segment-select">Selected segments to include:</Label>
            {!(segmentRules && segmentRules.include && Array.isArray(segmentRules.include.segmentIds) && segmentRules.include.segmentIds.length > 0) ? (
              <p className={cn(typography.small, "text-muted-foreground mt-1")}>No segments added to the inclusion list yet.</p>
            ) : (
              <ul className="list-disc list-inside mt-2 space-y-1">
                {segmentRules.include.segmentIds.map(id => {
                  const segment = getSegmentDetails(id);
                  return (
                    <li key={`include-${id}`} className="flex items-center justify-between text-sm">
                      <span>{segment?.name || id}</span>
                      <Button variant="ghost" size="sm" onClick={() => removeIncludeSegmentId(id)} className="p-1 h-auto">
                        <X className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {(segmentRules && segmentRules.include && Array.isArray(segmentRules.include.segmentIds) && segmentRules.include.segmentIds.length > 0) && (
            <>
              <div className="mb-3">
                <Label className="block mb-1">Matching Logic for Included Segments:</Label>
                <Tabs 
                  defaultValue={segmentRules.include.operator} 
                  onValueChange={(value) => setIncludeOperator(value as 'AND' | 'OR')}
                  className="w-full md:w-[280px] mt-1"
                >
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="OR">Match ANY (OR)</TabsTrigger>
                    <TabsTrigger value="AND">Match ALL (AND)</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              
              <h4 className="text-sm font-medium mb-2">Currently Included Segments ({segmentRules.include.operator}):</h4>
              <ScrollArea className="max-h-[200px] rounded-md border">
                {!(segmentRules && segmentRules.include && Array.isArray(segmentRules.include.segmentIds) && segmentRules.include.segmentIds.length > 0) ? (
                  <p className={cn(typography.muted, "p-3 text-center")}>No segments selected for inclusion.</p>
                ) : (
                  <ul className="space-y-px divide-y divide-border">
                    {segmentRules.include.segmentIds.map(segmentId => {
                      const segmentDetails = getSegmentDetails(segmentId);
                      return (
                        <li key={`include-${segmentId}`} className="flex items-center justify-between p-2 hover:bg-muted/40">
                          <span className="text-sm font-medium">{segmentDetails?.name || segmentId}</span>
                          <Button variant="ghost" size="icon" onClick={() => removeIncludeSegmentId(segmentId)} title="Remove segment from inclusion list">
                            <X className="h-4 w-4" />
                          </Button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </ScrollArea>
            </>
          )}
          {!(segmentRules && segmentRules.include && Array.isArray(segmentRules.include.segmentIds) && segmentRules.include.segmentIds.length > 0) && (
             <p className={cn(typography.muted, "p-3 text-center border rounded-md")}>No segments added for inclusion yet. Select from "Available Segments" below.</p>
          )}
        </CardContent>
      </Card>

      {/* Excluded Audiences Configuration */}
      <Card className={cardStyles.dashboard}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserMinus className="h-5 w-5 text-destructive" /> 
            Define Excluded Audience
          </CardTitle>
          <CardDescription>
            Select segments to explicitly exclude from the campaign, regardless of inclusion rules.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="exclude-segment-select">Selected segments to exclude:</Label>
            {!(segmentRules && segmentRules.exclude && Array.isArray(segmentRules.exclude.segmentIds) && segmentRules.exclude.segmentIds.length > 0) ? (
              <p className={cn(typography.small, "text-muted-foreground mt-1")}>No segments added to the exclusion list yet.</p>
            ) : (
              <ul className="list-disc list-inside mt-2 space-y-1">
                {segmentRules.exclude.segmentIds.map(id => {
                  const segment = getSegmentDetails(id);
                  return (
                    <li key={`exclude-${id}`} className="flex items-center justify-between text-sm">
                      <span>{segment?.name || id}</span>
                      <Button variant="ghost" size="sm" onClick={() => removeExcludeSegmentId(id)} className="p-1 h-auto">
                        <X className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Available Segments List and Actions */}
      <Card className={cardStyles.dashboard}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-primary" />
            Available Segments
          </CardTitle>
          <CardDescription>Select a segment below and then add it to your inclusion or exclusion rules.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Label htmlFor="segment-search">Search available segments:</Label>
            <div className="relative mt-1">
              <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                id="segment-search"
                type="text" 
                placeholder="Search by name or description..." 
                value={searchQuery} 
                onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)} 
                className={cn(inputStyles.default, "pl-9")} // Use inputStyles.default
              />
            </div>
          </div>

          {availableSegmentsLoading && (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary/60" />
              <p className={cn(typography.muted, "ml-3")}>Loading available segments...</p>
            </div>
          )}
          {availableSegmentsError && (
            <p className={cn(typography.error, "text-center py-4")}>{availableSegmentsError}</p>
          )}

          {!availableSegmentsLoading && !availableSegmentsError && filteredAvailableSegments && (
            filteredAvailableSegments.length === 0 ? (
              <p className={cn(typography.muted, "text-center py-4")}>No available segments match your search or all segments have been added.</p>
            ) : (
              <ScrollArea className="h-[250px] border rounded-md p-1">
                <ul className="space-y-1 p-2">
                  {filteredAvailableSegments.map(segment => (
                    <li 
                      key={segment.id} 
                      onClick={() => setSelectedAvailableSegmentId(segment.id)}
                      className={cn(
                        "p-2.5 rounded-md cursor-pointer text-sm",
                        transitions.hover,
                        typography.p,
                        selectedAvailableSegmentId === segment.id 
                          ? "bg-primary/15 text-primary ring-2 ring-primary/50 font-medium"
                          : "hover:bg-muted/70"
                      )}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="font-medium block">{segment.name}</span>
                          {segment.description && <span className={cn(typography.small, "text-muted-foreground")}>{segment.description}</span>}
                        </div>
                        {segment.user_count !== undefined && segment.user_count !== null && (
                           <Badge variant="secondary" className={cn(typography.small, "font-mono")}>{segment.user_count.toLocaleString()} users</Badge>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            )
          )}
          <div className="mt-4 flex flex-col sm:flex-row gap-3 justify-end">
            <Button 
              onClick={handleAddSegmentToInclude} 
              disabled={!selectedAvailableSegmentId || segmentsLoading}
              variant="outline"
              className={cn(buttonStyles.outline, transitions.hover)}
            >
              <UserPlus className="mr-2 h-4 w-4" /> Add to Include List
            </Button>
            <Button 
              onClick={handleAddSegmentToExclude} 
              disabled={!selectedAvailableSegmentId || segmentsLoading}
              variant="outline"
              className={cn(buttonStyles.outline, "border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive-foreground", transitions.hover)}
            >
              <UserMinus className="mr-2 h-4 w-4" /> Add to Exclude List
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons and Estimated Audience */}
      <div className="mt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <Button 
            onClick={handleSaveRules}
            disabled={isSavingRules || segmentsLoading || availableSegmentsLoading}
            className={cn(buttonStyles.primary, "w-full sm:w-auto", transitions.hover)}
          >
            {isSavingRules ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Audience Rules
          </Button>
        </div>
        <div className={cn(typography.p, "text-right")}>
          Estimated Audience:
          <span className={cn("text-2xl font-bold text-primary ml-2", audienceSize > 0 ? transitions.fadeIn : "")}>
            {audienceSize?.toLocaleString() || '-'} {/* Show dash if 0 or not calculated yet*/}
          </span>
        </div>
      </div>
    </div>
  );
} 