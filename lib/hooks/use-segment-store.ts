import { create } from 'zustand';
import { SegmentRules, SegmentPreviewResult } from '@/lib/segmentation/engine';

export interface Segment {
  id: string;
  name: string;
  description?: string;
  rules: SegmentRules;
  created_at: string;
  updated_at: string;
}

interface SegmentState {
  // Segments
  segments: Segment[];
  isLoadingSegments: boolean;
  segmentsError: string | null;
  
  // Current segment
  currentSegment: Segment | null;
  isLoadingCurrentSegment: boolean;
  currentSegmentError: string | null;
  
  // Segment preview
  segmentPreview: SegmentPreviewResult | null;
  isLoadingPreview: boolean;
  previewError: string | null;
  
  // Actions
  fetchSegments: () => Promise<void>;
  fetchSegmentById: (id: string) => Promise<void>;
  createSegment: (segment: Omit<Segment, 'id' | 'created_at' | 'updated_at'>) => Promise<Segment | null>;
  updateSegment: (id: string, updates: Partial<Omit<Segment, 'id' | 'created_at' | 'updated_at'>>) => Promise<Segment | null>;
  deleteSegment: (id: string) => Promise<boolean>;
  fetchSegmentPreview: (id: string, limit?: number, offset?: number) => Promise<void>;
  resetCurrentSegment: () => void;
}

export const useSegmentStore = create<SegmentState>((set, get) => ({
  // Segments
  segments: [],
  isLoadingSegments: false,
  segmentsError: null,
  
  // Current segment
  currentSegment: null,
  isLoadingCurrentSegment: false,
  currentSegmentError: null,
  
  // Segment preview
  segmentPreview: null,
  isLoadingPreview: false,
  previewError: null,
  
  // Actions
  fetchSegments: async () => {
    set({ isLoadingSegments: true, segmentsError: null });
    try {
      const response = await fetch('/api/admin/segments');
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch segments');
      }
      const { data } = await response.json();
      set({ segments: data, isLoadingSegments: false });
    } catch (error) {
      console.error('Error fetching segments:', error);
      set({ 
        segmentsError: error instanceof Error ? error.message : 'Failed to fetch segments',
        isLoadingSegments: false
      });
    }
  },
  
  fetchSegmentById: async (id: string) => {
    set({ isLoadingCurrentSegment: true, currentSegmentError: null });
    try {
      const response = await fetch(`/api/admin/segments/${id}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch segment');
      }
      const { data } = await response.json();
      set({ currentSegment: data, isLoadingCurrentSegment: false });
    } catch (error) {
      console.error(`Error fetching segment ${id}:`, error);
      set({ 
        currentSegmentError: error instanceof Error ? error.message : 'Failed to fetch segment',
        isLoadingCurrentSegment: false
      });
    }
  },
  
  createSegment: async (segment) => {
    try {
      const response = await fetch('/api/admin/segments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(segment),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create segment');
      }
      
      const { data } = await response.json();
      
      // Update the segments list
      const segments = get().segments;
      set({ segments: [...segments, data] });
      
      return data;
    } catch (error) {
      console.error('Error creating segment:', error);
      return null;
    }
  },
  
  updateSegment: async (id, updates) => {
    try {
      const response = await fetch(`/api/admin/segments/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update segment');
      }
      
      const { data } = await response.json();
      
      // Update the segments list and current segment
      const segments = get().segments.map(segment => 
        segment.id === id ? data : segment
      );
      
      set({ 
        segments,
        currentSegment: data
      });
      
      return data;
    } catch (error) {
      console.error(`Error updating segment ${id}:`, error);
      return null;
    }
  },
  
  deleteSegment: async (id: string) => {
    try {
      const response = await fetch(`/api/admin/segments/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete segment');
      }
      
      // Update the segments list
      const segments = get().segments.filter(segment => segment.id !== id);
      set({ segments });
      
      // Reset current segment if it was the deleted one
      if (get().currentSegment?.id === id) {
        set({ currentSegment: null });
      }
      
      return true;
    } catch (error) {
      console.error(`Error deleting segment ${id}:`, error);
      return false;
    }
  },
  
  fetchSegmentPreview: async (id: string, limit = 10, offset = 0) => {
    set({ isLoadingPreview: true, previewError: null });
    try {
      const response = await fetch(`/api/admin/segments/${id}/preview?limit=${limit}&offset=${offset}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch segment preview');
      }
      const { data } = await response.json();
      set({ segmentPreview: data, isLoadingPreview: false });
    } catch (error) {
      console.error(`Error fetching segment preview for ${id}:`, error);
      set({ 
        previewError: error instanceof Error ? error.message : 'Failed to fetch segment preview',
        isLoadingPreview: false
      });
    }
  },
  
  resetCurrentSegment: () => {
    set({ 
      currentSegment: null,
      currentSegmentError: null,
      segmentPreview: null,
      previewError: null
    });
  },
}));
