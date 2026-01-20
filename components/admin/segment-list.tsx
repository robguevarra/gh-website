'use client';

import { useEffect, useState } from 'react';
import { useSegmentStore, Segment } from '@/lib/hooks/use-segment-store';
import { SegmentPreviewResult } from '@/lib/segmentation/engine';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Users, Search, Tag, Edit, Trash2, Eye } from 'lucide-react';

interface SegmentListProps {
  onEdit?: (segment: Segment) => void;
  onPreview?: (segment: Segment, preview: SegmentPreviewResult) => void;
  hideHeader?: boolean;
}

export function SegmentList({ onEdit, onPreview, hideHeader = false }: SegmentListProps) {
  const { segments, isLoadingSegments, segmentsError, fetchSegments, deleteSegment, fetchSegmentPreview, segmentPreview, isLoadingPreview } = useSegmentStore();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [segmentToDelete, setSegmentToDelete] = useState<Segment | null>(null);
  const [segmentToPreview, setSegmentToPreview] = useState<Segment | null>(null);

  // Fetch segments on mount
  useEffect(() => {
    fetchSegments();
  }, [fetchSegments]);

  // Filter segments based on search term
  const filteredSegments = segments.filter(segment =>
    segment.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (segment.description && segment.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Handle segment deletion
  const handleDelete = async (segment: Segment) => {
    const success = await deleteSegment(segment.id);
    if (success) {
      toast({
        title: 'Segment deleted',
        description: `Successfully deleted segment "${segment.name}"`,
      });
    } else {
      toast({
        title: 'Error',
        description: 'Failed to delete segment',
        variant: 'destructive',
      });
    }
    setSegmentToDelete(null);
  };

  // Handle segment preview
  const handlePreview = async (segment: Segment) => {
    setSegmentToPreview(segment);
    await fetchSegmentPreview(segment.id);
    if (segmentPreview && onPreview) {
      onPreview(segment, segmentPreview);
    }
  };

  return (
    <div className="space-y-6">
      {!hideHeader && (
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">User Segments</h2>
          <div className="relative w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search segments..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* When header is hidden, show search bar standalone if needed or rely on parent? 
          For now, let's keep search accessible even if header title is hidden, 
          OR assume the parent handles search. 
          Actually, the plan said "hideHeader". The search bar is useful.
          Let's adjust: If hideHeader is true, maybe we just want to hide the title but keep search?
          The instruction implies hiding the whole block. 
          Let's verify usage. In StudioAudience check if I want search.
          Yes, I usually want search.
          Let's change logic: If hideHeader, just render search bar? 
          Or maybe split them. 
          For saftey/simplicity towards the prompt "hideHeader", I will assume it hides the H2.
          Let's keep the Search bar visible if hideHeader is true, but maybe styled differently?
          
          Actually, looking at the code, it's a flex container.
          Let's JUST hide the H2 if hideHeader is true.
      */}
      <div className="flex items-center justify-between">
        {!hideHeader && <h2 className="text-2xl font-bold">User Segments</h2>}
        <div className={hideHeader ? "w-full" : "relative w-64"}>
          {/* If header hidden, maybe search should be full width or just aligned? 
               Let's keep it simple. Only hide H2.
           */}
          <div className="relative w-full max-w-sm ml-auto">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search segments..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {isLoadingSegments ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-72" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full" />
              </CardContent>
              <CardFooter>
                <Skeleton className="h-10 w-32" />
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : segmentsError ? (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{segmentsError}</p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => fetchSegments()}>Retry</Button>
          </CardFooter>
        </Card>
      ) : filteredSegments.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No segments found</CardTitle>
            <CardDescription>
              {searchTerm ? `No segments match "${searchTerm}"` : 'Create your first segment to get started'}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredSegments.map((segment) => (
            <Card key={segment.id} className="flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="truncate">{segment.name}</span>
                </CardTitle>
                <CardDescription>
                  {segment.description ? (
                    <span className="line-clamp-2">{segment.description}</span>
                  ) : (
                    <span className="text-muted-foreground italic">No description</span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <div className="space-y-2">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Tag className="mr-2 h-4 w-4" />
                    <span>
                      {segment.rules.operator === 'AND' ? 'Match ALL' : 'Match ANY'} of {segment.rules.conditions.length} tags
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {segment.rules.conditions.slice(0, 5).map((condition, index) => {
                      if (condition.type === 'tag') {
                        return (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {condition.tagId}
                          </Badge>
                        );
                      }
                      return null;
                    })}
                    {segment.rules.conditions.length > 5 && (
                      <Badge variant="outline" className="text-xs">
                        +{segment.rules.conditions.length - 5} more
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between border-t p-4">
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handlePreview(segment)}
                    disabled={isLoadingPreview && segmentToPreview?.id === segment.id}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  {onEdit && (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => onEdit(segment)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <AlertDialog open={segmentToDelete?.id === segment.id} onOpenChange={(open) => !open && setSegmentToDelete(null)}>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="text-destructive"
                      onClick={() => setSegmentToDelete(segment)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Segment</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete the segment "{segment.name}"? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={() => handleDelete(segment)}
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
