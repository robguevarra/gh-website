'use client';

import { useState } from 'react';
import { Segment } from '@/lib/hooks/use-segment-store';
import { SegmentPreviewResult } from '@/lib/segmentation/engine';
import { Metadata } from 'next';
import { SegmentForm } from '@/components/admin/segment-form';
import { SegmentList } from '@/components/admin/segment-list';
import { SegmentPreview } from '@/components/admin/segment-preview';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, ArrowLeft, Users, Tag } from 'lucide-react';
import Link from 'next/link';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { refreshAudiences } from '../wizard/actions';
import { useToast } from '@/components/ui/use-toast';

export default function EmailSegmentationPage() {
  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'edit' | 'preview'>('list');
  const [currentSegment, setCurrentSegment] = useState<Segment | null>(null);
  const [previewData, setPreviewData] = useState<SegmentPreviewResult | null>(null);
  const { toast } = useToast();

  // Handle creating a new segment
  const handleCreate = () => {
    setCurrentSegment(null);
    setActiveTab('create');
  };

  // Handle editing a segment
  const handleEdit = (segment: Segment) => {
    setCurrentSegment(segment);
    setActiveTab('edit');
  };

  // Handle previewing a segment
  const handlePreview = (segment: Segment, preview: SegmentPreviewResult) => {
    setCurrentSegment(segment);
    setPreviewData(preview);
    setActiveTab('preview');
  };

  // Handle form success
  const handleFormSuccess = async () => {
    // Trigger audience refresh to calculate counts for the new/updated segment
    try {
      await refreshAudiences()
      toast({
        title: "Refreshing Audience Data",
        description: "Recalculating segment counts in the background...",
      })
    } catch (error) {
      console.error("Failed to trigger audience refresh:", error)
      // Don't block navigation on refresh error
    }
    setActiveTab('list');
  };

  // Handle returning to the list
  const handleBackToList = () => {
    setActiveTab('list');
  };

  return (
    <div className="container py-6 space-y-6">
      <Breadcrumb className="mb-6">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/admin">Admin</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/admin/email">Email</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink>Segmentation</BreadcrumbLink>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Segmentation</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage user segments for targeted email campaigns
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Link href="/admin/tag-management">
            <Button variant="outline" size="sm">
              <Tag className="h-4 w-4 mr-2" />
              Manage Tags
            </Button>
          </Link>
        </div>
      </div>

      {activeTab === 'list' ? (
        <div className="space-y-6">
          <div className="flex justify-end">
            <Button onClick={handleCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Create Segment
            </Button>
          </div>

          <SegmentList
            onEdit={handleEdit}
            onPreview={handlePreview}
          />
        </div>
      ) : activeTab === 'create' ? (
        <div className="space-y-6">
          <Button
            variant="outline"
            className="mb-4"
            onClick={handleBackToList}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Segments
          </Button>

          <SegmentForm
            onSuccess={handleFormSuccess}
            onCancel={handleBackToList}
          />
        </div>
      ) : activeTab === 'edit' && currentSegment ? (
        <div className="space-y-6">
          <Button
            variant="outline"
            className="mb-4"
            onClick={handleBackToList}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Segments
          </Button>

          <SegmentForm
            segment={currentSegment}
            onSuccess={handleFormSuccess}
            onCancel={handleBackToList}
          />
        </div>
      ) : activeTab === 'preview' && currentSegment ? (
        <div className="space-y-6">
          <Button
            variant="outline"
            className="mb-4"
            onClick={handleBackToList}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Segments
          </Button>

          <SegmentPreview
            segment={currentSegment}
            initialPreview={previewData || undefined}
            onClose={handleBackToList}
          />
        </div>
      ) : null}
    </div>
  );
}
