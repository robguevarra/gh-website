/**
 * Campaign Management Store
 * 
 * Zustand store for managing campaign state in the UI
 */

import { create } from 'zustand';
import { 
  EmailCampaign, 
  CampaignTemplate,
  CampaignSegment,
  CampaignAnalytics,
  UserSegment
} from '@/lib/supabase/data-access/campaign-management';

interface CampaignState {
  // Campaign list state
  campaigns: EmailCampaign[];
  totalCampaigns: number;
  campaignsLoading: boolean;
  campaignsError: string | null;
  
  // Current campaign state
  currentCampaign: EmailCampaign | null;
  currentCampaignLoading: boolean;
  currentCampaignError: string | null;
  
  // Campaign templates state
  campaignTemplates: CampaignTemplate[];
  templatesLoading: boolean;
  templatesError: string | null;
  
  // Campaign segments state
  campaignSegments: (CampaignSegment & { segment: UserSegment })[];
  segmentsLoading: boolean;
  segmentsError: string | null;
  
  // Campaign analytics state
  campaignAnalytics: CampaignAnalytics | null;
  analyticsLoading: boolean;
  analyticsError: string | null;
  
  // Available segments for selection
  availableSegments: UserSegment[];
  availableSegmentsLoading: boolean;
  availableSegmentsError: string | null;

  // Estimated audience size
  estimatedAudienceSize: number | null;
  audienceSizeLoading: boolean;
  audienceSizeError: string | null;
  
  // Actions
  fetchCampaigns: (params?: { status?: string; limit?: number; offset?: number }) => Promise<void>;
  fetchCampaign: (id: string) => Promise<void>;
  createCampaign: (campaign: Partial<EmailCampaign>) => Promise<EmailCampaign>;
  updateCampaign: (id: string, updates: Partial<EmailCampaign>) => Promise<EmailCampaign>;
  updateCampaignFields: (payload: { id: string; changes: Partial<EmailCampaign> }) => void;
  deleteCampaign: (id: string) => Promise<void>;
  scheduleCampaign: (id: string, scheduledAt: string) => Promise<EmailCampaign>;
  sendTestEmail: (id: string, testEmails: string[]) => Promise<{ success: boolean }>;
  sendCampaign: (id: string) => Promise<{ success: boolean }>;
  fetchCampaignTemplates: (campaignId: string) => Promise<void>;
  fetchCampaignSegments: (campaignId: string) => Promise<void>;
  fetchCampaignAnalytics: (campaignId: string, refresh?: boolean) => Promise<void>;
  fetchAvailableSegments: () => Promise<void>;
  addCampaignSegment: (campaignId: string, segmentId: string) => Promise<void>;
  removeCampaignSegment: (campaignId: string, segmentId: string) => Promise<void>;
  fetchEstimatedAudienceSize: (campaignId: string) => Promise<void>;
  resetState: () => void;
}

export const useCampaignStore = create<CampaignState>((set, get) => ({
  // Campaign list state
  campaigns: [],
  totalCampaigns: 0,
  campaignsLoading: false,
  campaignsError: null,
  
  // Current campaign state
  currentCampaign: null,
  currentCampaignLoading: false,
  currentCampaignError: null,
  
  // Campaign templates state
  campaignTemplates: [],
  templatesLoading: false,
  templatesError: null,
  
  // Campaign segments state
  campaignSegments: [],
  segmentsLoading: false,
  segmentsError: null,
  
  // Campaign analytics state
  campaignAnalytics: null,
  analyticsLoading: false,
  analyticsError: null,
  
  // Available segments for selection
  availableSegments: [],
  availableSegmentsLoading: false,
  availableSegmentsError: null,

  // Estimated audience size state
  estimatedAudienceSize: null,
  audienceSizeLoading: false,
  audienceSizeError: null,
  
  // Actions
  fetchCampaigns: async (params = {}) => {
    set({ campaignsLoading: true, campaignsError: null });
    
    try {
      const { status, limit = 50, offset = 0 } = params;
      
      const queryParams = new URLSearchParams();
      if (status) queryParams.append('status', status);
      queryParams.append('limit', limit.toString());
      queryParams.append('offset', offset.toString());
      
      const response = await fetch(`/api/admin/campaigns?${queryParams.toString()}`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch campaigns');
      }
      
      const data = await response.json();
      
      set({ 
        campaigns: data.campaigns, 
        totalCampaigns: data.total,
        campaignsLoading: false 
      });
    } catch (error: any) {
      set({ 
        campaignsLoading: false, 
        campaignsError: error.message || 'Failed to fetch campaigns' 
      });
    }
  },
  
  fetchCampaign: async (id: string) => {
    set({ currentCampaignLoading: true, currentCampaignError: null });
    
    try {
      const response = await fetch(`/api/admin/campaigns/${id}`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch campaign');
      }
      
      const data = await response.json();
      
      set({ 
        currentCampaign: data.campaign, 
        currentCampaignLoading: false 
      });
      
      return data.campaign;
    } catch (error: any) {
      set({ 
        currentCampaignLoading: false, 
        currentCampaignError: error.message || 'Failed to fetch campaign' 
      });
      throw error;
    }
  },
  
  createCampaign: async (campaign) => {
    try {
      const response = await fetch('/api/admin/campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(campaign),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create campaign');
      }
      
      const data = await response.json();
      
      // Refresh campaigns list
      await get().fetchCampaigns();
      
      return data.campaign;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to create campaign');
    }
  },
  
  updateCampaign: async (id, updates) => {
    try {
      const response = await fetch(`/api/admin/campaigns/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update campaign');
      }
      
      const data = await response.json();
      
      // Update current campaign if it's the one being edited
      if (get().currentCampaign?.id === id) {
        set({ currentCampaign: data.campaign });
      }
      
      // Refresh campaigns list
      await get().fetchCampaigns();
      
      return data.campaign;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to update campaign');
    }
  },
  
  updateCampaignFields: (payload) => {
    const { id, changes } = payload;
    set((state) => {
      if (state.currentCampaign && state.currentCampaign.id === id) {
        // Ensure we're updating the fields correctly, especially new ones
        const updatedCampaign = { ...state.currentCampaign, ...changes };
        return {
          currentCampaign: updatedCampaign,
        };
      }
      // If currentCampaign is null or ID doesn't match, return empty object to not change state
      return {}; 
    });
  },
  
  deleteCampaign: async (id: string) => {
    try {
      const response = await fetch(`/api/admin/campaigns/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete campaign');
      }
      
      // Reset current campaign if it's the one being deleted
      if (get().currentCampaign?.id === id) {
        set({ currentCampaign: null });
      }
      
      // Refresh campaigns list
      await get().fetchCampaigns();
    } catch (error: any) {
      throw new Error(error.message || 'Failed to delete campaign');
    }
  },
  
  scheduleCampaign: async (id, scheduledAt) => {
    try {
      const response = await fetch(`/api/admin/campaigns/${id}/schedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ scheduledAt }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to schedule campaign');
      }
      
      const data = await response.json();
      
      // Update current campaign if it's the one being scheduled
      if (get().currentCampaign?.id === id) {
        set({ currentCampaign: data.campaign });
      }
      
      // Refresh campaigns list
      await get().fetchCampaigns();
      
      return data.campaign;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to schedule campaign');
    }
  },
  
  sendTestEmail: async (id, testEmails) => {
    try {
      const response = await fetch(`/api/admin/campaigns/${id}/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ testEmails }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send test email');
      }
      
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || 'Failed to send test email');
    }
  },
  
  sendCampaign: async (id) => {
    try {
      const response = await fetch(`/api/admin/campaigns/${id}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send campaign');
      }
      
      // Refresh campaign data
      await get().fetchCampaign(id);
      
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || 'Failed to send campaign');
    }
  },
  
  fetchCampaignTemplates: async (campaignId) => {
    set({ templatesLoading: true, templatesError: null });
    
    try {
      // This would be an API call to fetch templates for a campaign
      // For now, we'll simulate it with a placeholder
      const response = await fetch(`/api/admin/campaigns/${campaignId}/templates`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch campaign templates');
      }
      
      const data = await response.json();
      
      set({ 
        campaignTemplates: data.templates, 
        templatesLoading: false 
      });
    } catch (error: any) {
      set({ 
        templatesLoading: false, 
        templatesError: error.message || 'Failed to fetch campaign templates' 
      });
    }
  },
  
  fetchCampaignSegments: async (campaignId) => {
    set({ segmentsLoading: true, segmentsError: null });
    
    try {
      // This would be an API call to fetch segments for a campaign
      // For now, we'll simulate it with a placeholder
      const response = await fetch(`/api/admin/campaigns/${campaignId}/segments`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch campaign segments');
      }
      
      const data = await response.json();
      
      set({ 
        campaignSegments: data.segments, 
        segmentsLoading: false 
      });
    } catch (error: any) {
      set({ 
        segmentsLoading: false, 
        segmentsError: error.message || 'Failed to fetch campaign segments' 
      });
    }
  },
  
  fetchCampaignAnalytics: async (campaignId, refresh = false) => {
    set({ analyticsLoading: true, analyticsError: null });
    
    try {
      const queryParams = new URLSearchParams();
      if (refresh) queryParams.append('refresh', 'true');
      
      const response = await fetch(`/api/admin/campaigns/${campaignId}/analytics?${queryParams.toString()}`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch campaign analytics');
      }
      
      const data = await response.json();
      
      set({ 
        campaignAnalytics: data.analytics, 
        analyticsLoading: false 
      });
    } catch (error: any) {
      set({ 
        analyticsLoading: false, 
        analyticsError: error.message || 'Failed to fetch campaign analytics' 
      });
    }
  },
  
  fetchAvailableSegments: async () => {
    set({ availableSegmentsLoading: true, availableSegmentsError: null });
    console.log('[useCampaignStore] Fetching available segments...');
    try {
      const response = await fetch('/api/admin/segments');
      console.log('[useCampaignStore] API response status:', response.status);
      if (!response.ok) {
        let errorPayload = { message: 'Failed to fetch available segments' };
        try {
          errorPayload = await response.json();
          console.error('[useCampaignStore] API error response payload:', errorPayload);
        } catch (e) {
          console.error('[useCampaignStore] API error response not JSON:', await response.text());
        }
        throw new Error(errorPayload.message || 'Failed to fetch available segments');
      }
      const rawData = await response.json();
      console.log('[useCampaignStore] API raw data:', rawData);
      
      // The API route returns { data: segments }
      const segmentsData = rawData.data;
      console.log('[useCampaignStore] Segments data extracted:', segmentsData);

      set({
        availableSegments: segmentsData || [], // Ensure it's an array
        availableSegmentsLoading: false,
      });
    } catch (error: any) {
      console.error('[useCampaignStore] Error in fetchAvailableSegments:', error);
      set({
        availableSegmentsLoading: false,
        availableSegmentsError: error.message,
        availableSegments: [], // Clear on error
      });
    }
  },
  
  fetchEstimatedAudienceSize: async (campaignId: string) => {
    if (!campaignId) return;
    set({ audienceSizeLoading: true, audienceSizeError: null });
    
    try {
      const response = await fetch(`/api/admin/campaigns/estimate-audience?campaignId=${campaignId}`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch estimated audience size');
      }
      
      const data = await response.json();
      
      set({ 
        estimatedAudienceSize: data.estimatedAudienceSize, 
        audienceSizeLoading: false 
      });
    } catch (error: any) {
      set({ 
        audienceSizeLoading: false, 
        audienceSizeError: error.message, 
        estimatedAudienceSize: null 
      });
    }
  },
  
  addCampaignSegment: async (campaignId, segmentId) => {
    set({ segmentsLoading: true, segmentsError: null });
    
    try {
      console.log(`[addCampaignSegment] Adding segment ${segmentId} to campaign ${campaignId}`);
      
      const response = await fetch(`/api/admin/campaigns/${campaignId}/segments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ segmentId }),
      });
      
      const responseData = await response.json();
      
      if (!response.ok) {
        console.error('[addCampaignSegment] API Error:', responseData);
        throw new Error(responseData.error || 'Failed to add segment');
      }
      
      console.log('[addCampaignSegment] Success:', responseData);
      
      // Refresh campaign segments and then fetch audience estimate
      await get().fetchCampaignSegments(campaignId);
      await get().fetchEstimatedAudienceSize(campaignId);
      
      return responseData.segment;
    } catch (error: any) {
      console.error('[addCampaignSegment] Error:', error);
      const errorMessage = error.message || 'Failed to add segment';
      set({ segmentsLoading: false, segmentsError: errorMessage });
      throw new Error(errorMessage);
    } finally {
      set({ segmentsLoading: false });
    }
  },
  
  removeCampaignSegment: async (campaignId, segmentId) => {
    set({ segmentsLoading: true, segmentsError: null });
    
    try {
      console.log(`[removeCampaignSegment] Removing segment ${segmentId} from campaign ${campaignId}`);
      
      const response = await fetch(`/api/admin/campaigns/${campaignId}/segments/${segmentId}`, {
        method: 'DELETE',
      });
      
      const responseData = await response.json();
      
      if (!response.ok) {
        console.error('[removeCampaignSegment] API Error:', responseData);
        throw new Error(responseData.error || 'Failed to remove segment');
      }
      
      console.log('[removeCampaignSegment] Success:', responseData);
      
      // Refresh campaign segments and then fetch audience estimate
      await get().fetchCampaignSegments(campaignId);
      await get().fetchEstimatedAudienceSize(campaignId);
      
      return responseData.message || 'Segment removed successfully';
    } catch (error: any) {
      console.error('[removeCampaignSegment] Error:', error);
      const errorMessage = error.message || 'Failed to remove segment';
      set({ segmentsLoading: false, segmentsError: errorMessage });
      throw new Error(errorMessage);
    } finally {
      set({ segmentsLoading: false });
    }
  },
  
  resetState: () => {
    set({
      campaigns: [],
      totalCampaigns: 0,
      campaignsLoading: false,
      campaignsError: null,
      currentCampaign: null,
      currentCampaignLoading: false,
      currentCampaignError: null,
      campaignTemplates: [],
      templatesLoading: false,
      templatesError: null,
      campaignSegments: [],
      segmentsLoading: false,
      segmentsError: null,
      campaignAnalytics: null,
      analyticsLoading: false,
      analyticsError: null,
      availableSegments: [],
      availableSegmentsLoading: false,
      availableSegmentsError: null,
      estimatedAudienceSize: null,
      audienceSizeLoading: false,
      audienceSizeError: null,
    });
  },
}));
