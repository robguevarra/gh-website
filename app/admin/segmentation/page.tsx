'use client';

import { useState } from 'react';
import { Segment } from '@/lib/hooks/use-segment-store';
import { SegmentPreviewResult } from '@/lib/segmentation/engine';

import { SegmentForm } from '@/components/admin/segment-form';
import { SegmentList } from '@/components/admin/segment-list';
import { SegmentPreview } from '@/components/admin/segment-preview';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, ArrowLeft } from 'lucide-react';

export default function SegmentationPage() {
  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'edit' | 'preview'>('list');
  const [currentSegment, setCurrentSegment] = useState<Segment | null>(null);
  const [previewData, setPreviewData] = useState<SegmentPreviewResult | null>(null);
  
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
  const handleFormSuccess = () => {
    setActiveTab('list');
  };
  
  // Handle returning to the list
  const handleBackToList = () => {
    setActiveTab('list');
  };
  
  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">User Segmentation</h1>
        <p className="text-muted-foreground mt-2">
          Create and manage user segments for targeted email campaigns and content personalization.
        </p>
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
