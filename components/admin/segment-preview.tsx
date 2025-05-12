'use client';

import { useState } from 'react';
import { useSegmentStore, Segment } from '@/lib/hooks/use-segment-store';
import { SegmentPreviewResult } from '@/lib/segmentation/engine';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Users, RefreshCw } from 'lucide-react';

interface SegmentPreviewProps {
  segment: Segment;
  initialPreview?: SegmentPreviewResult;
  onClose?: () => void;
}

export function SegmentPreview({ segment, initialPreview, onClose }: SegmentPreviewProps) {
  const { fetchSegmentPreview, segmentPreview, isLoadingPreview, previewError } = useSegmentStore();
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  
  // Use initialPreview if provided, otherwise use the one from the store
  const preview = initialPreview || segmentPreview;
  
  // Handle refreshing the preview
  const handleRefresh = async () => {
    const offset = (page - 1) * limit;
    await fetchSegmentPreview(segment.id, limit, offset);
  };
  
  // Handle pagination
  const handlePageChange = async (newPage: number) => {
    setPage(newPage);
    const offset = (newPage - 1) * limit;
    await fetchSegmentPreview(segment.id, limit, offset);
  };
  
  // Calculate total pages
  const totalPages = preview ? Math.ceil(preview.count / limit) : 0;
  
  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-xl">
          Segment Preview: {segment.name}
        </CardTitle>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={isLoadingPreview}
          >
            <RefreshCw className={`h-4 w-4 ${isLoadingPreview ? 'animate-spin' : ''}`} />
          </Button>
          {onClose && (
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoadingPreview && !preview ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : previewError ? (
          <div className="text-center py-8">
            <p className="text-destructive mb-4">{previewError}</p>
            <Button onClick={handleRefresh}>Retry</Button>
          </div>
        ) : !preview ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">No preview available</p>
            <Button onClick={handleRefresh}>Load Preview</Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span className="text-lg font-medium">
                  {preview.count} {preview.count === 1 ? 'user' : 'users'} match this segment
                </span>
              </div>
            </div>
            
            {preview.sampleUsers.length > 0 ? (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead className="text-right">ID</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.sampleUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.email}</TableCell>
                        <TableCell>{user.name || 'N/A'}</TableCell>
                        <TableCell className="text-right font-mono text-xs text-muted-foreground">
                          {user.id}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
                {totalPages > 1 && (
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => page > 1 && handlePageChange(page - 1)}
                          className={page <= 1 ? 'pointer-events-none opacity-50' : ''}
                        />
                      </PaginationItem>
                      
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        // Show pages around the current page
                        let pageNum;
                        if (totalPages <= 5) {
                          // If 5 or fewer pages, show all
                          pageNum = i + 1;
                        } else if (page <= 3) {
                          // If near the start, show first 5 pages
                          pageNum = i + 1;
                        } else if (page >= totalPages - 2) {
                          // If near the end, show last 5 pages
                          pageNum = totalPages - 4 + i;
                        } else {
                          // Otherwise show 2 before and 2 after current page
                          pageNum = page - 2 + i;
                        }
                        
                        return (
                          <PaginationItem key={pageNum}>
                            <PaginationLink
                              onClick={() => handlePageChange(pageNum)}
                              isActive={pageNum === page}
                            >
                              {pageNum}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      })}
                      
                      <PaginationItem>
                        <PaginationNext
                          onClick={() => page < totalPages && handlePageChange(page + 1)}
                          className={page >= totalPages ? 'pointer-events-none opacity-50' : ''}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                )}
              </>
            ) : (
              <div className="text-center py-8 border rounded-md">
                <p className="text-muted-foreground">No users match this segment</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
