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
import { SegmentRules } from '@/types/campaigns';

// Add segment_rules to EmailCampaign type if it's not already part of it from backend
// For now, we'll manage it within the store's representation of currentCampaign
interface StoreEmailCampaign extends EmailCampaign {
  segment_rules?: SegmentRules; // Optional because it might not come from DB initially for old campaigns
}

interface CampaignState {
  // Campaign list state
  campaigns: EmailCampaign[];
  totalCampaigns: number;
  campaignsLoading: boolean;
  campaignsError: string | null;

  // Current campaign state
  currentCampaign: StoreEmailCampaign | null;
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
  updateCampaignFields: (payload: { id: string; changes: Partial<StoreEmailCampaign> }) => void;
  deleteCampaign: (id: string) => Promise<void>;
  scheduleCampaign: (id: string, scheduledAt: string) => Promise<EmailCampaign>;
  sendTestEmail: (id: string, testEmails: string[]) => Promise<{ success: boolean }>;
  sendCampaign: (id: string) => Promise<{ success: boolean; message?: string; details?: { queuedCount: number } }>;
  retryFailedJobs: (campaignId: string) => Promise<{ retried: number }>;
  fetchCampaignTemplates: (campaignId: string) => Promise<void>;
  fetchCampaignSegments: (campaignId: string) => Promise<void>;
  fetchCampaignAnalytics: (campaignId: string, refresh?: boolean) => Promise<void>;
  fetchAvailableSegments: () => Promise<void>;
  addCampaignSegment: (campaignId: string, segmentId: string) => Promise<void>;
  removeCampaignSegment: (campaignId: string, segmentId: string) => Promise<void>;
  fetchEstimatedAudienceSize: (campaignId: string) => Promise<void>;
  resetState: () => void;
  setIncludeOperator: (operator: 'AND' | 'OR') => void;
  addIncludeSegmentId: (segmentId: string) => void;
  removeIncludeSegmentId: (segmentId: string) => void;
  addExcludeSegmentId: (segmentId: string) => void;
  removeExcludeSegmentId: (segmentId: string) => void;
  getSegmentDetails: (segmentId: string) => UserSegment | undefined;
  saveSegmentRules: () => Promise<void>;
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
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch campaign');
      }

      const data = await response.json();
      const campaignData = data.campaign as StoreEmailCampaign;

      if (!campaignData.segment_rules) {
        campaignData.segment_rules = {
          version: 1,
          include: { operator: 'OR', segmentIds: [] },
          exclude: { segmentIds: [] },
        };
      }

      set({
        currentCampaign: campaignData,
        currentCampaignLoading: false
      });
      // After setting currentCampaign and ensuring segment_rules are initialized, fetch audience size.
      if (campaignData.id) { // Ensure campaignData.id is valid
        get().fetchEstimatedAudienceSize(campaignData.id);
      }
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

  updateCampaignFields: (payload: { id: string; changes: Partial<StoreEmailCampaign> }) => {
    const { id, changes } = payload;
    set((state) => {
      if (state.currentCampaign && state.currentCampaign.id === id) {
        const updatedCampaign = {
          ...state.currentCampaign,
          ...changes,
          segment_rules: changes.segment_rules !== undefined ? changes.segment_rules : state.currentCampaign.segment_rules
        } as StoreEmailCampaign;
        return {
          currentCampaign: updatedCampaign,
        };
      }
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

  sendCampaign: async (id: string) => {
    try {
      const response = await fetch(`/api/admin/campaigns/${id}/send`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to send campaign');
      }

      return data;
    } catch (error: any) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(String(error || 'An unknown error occurred while sending campaign'));
    }
  },

  retryFailedJobs: async (campaignId: string) => {
    try {
      const response = await fetch(`/api/admin/campaigns/${campaignId}/retry`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to retry campaign');
      }

      // Refresh analytics to show updated counts (e.g. fewer failed, more pending if we tracked pending)
      // Actually analytics usually tracks 'sent', 'failed', 'bounced'.
      // If we move them to pending, they might temporarily disappear from 'failed' count if we refresh.
      await get().fetchCampaignAnalytics(campaignId, true);

      return data;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to retry failed jobs');
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
    const { currentCampaign } = get();
    if (!currentCampaign || !currentCampaign.segment_rules) {
      console.warn('[fetchEstimatedAudienceSize] No current campaign or segment rules available.');
      set({ estimatedAudienceSize: 0, audienceSizeLoading: false, audienceSizeError: null });
      return;
    }

    set({ audienceSizeLoading: true, audienceSizeError: null });

    try {
      const response = await fetch(`/api/admin/campaigns/estimate-audience`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(currentCampaign.segment_rules),
      });

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

      if (!response.ok) {
        let errorData = { error: 'Failed to remove segment. Server returned an error.' };
        let parsedJsonError: any = null;
        // let rawResponseText: string | null = null; // Removed as it's not strictly necessary with robust JSON parsing

        try {
          // It's generally safe to call .json() directly on the response.
          // If it fails, the catch block will handle it.
          // Cloning is only necessary if you need to read the body multiple times, which we don't here for the error path.
          parsedJsonError = await response.json();
          errorData.error = parsedJsonError.error || parsedJsonError.message || errorData.error;
        } catch (e) {
          // If JSON parsing fails, try to get text as a last resort.
          // This catch block is primarily for network errors or non-JSON responses.
          try {
            // const responseCloneForText = response.clone(); // Not needed if response.json() already consumed/failed
            const rawText = await response.text(); // Try reading the original response as text
            errorData.error = rawText || errorData.error;
            console.warn('[removeCampaignSegment] API error response was not JSON. Raw text:', rawText);
          } catch (textE) {
            console.error('[removeCampaignSegment] Failed to parse error response as JSON or text, and failed to read as text.');
          }
        }

        // The detailed logs that helped us diagnose can now be removed or commented out.
        // console.log('[removeCampaignSegment] Response Status:', response.status);
        // console.log('[removeCampaignSegment] Parsed JSON Error from Server:', parsedJsonError);
        // console.log('[removeCampaignSegment] Raw Response Text (if JSON parse failed):', rawResponseText);
        // console.log('[removeCampaignSegment] Final errorData object:', JSON.stringify(errorData));
        // console.log('[removeCampaignSegment] Final errorData.error string:', errorData.error);

        // This log is still useful for a concise error summary on the client.
        console.error('[removeCampaignSegment] API Error to be thrown:', { status: response.status, message: errorData.error });
        throw new Error(errorData.error);
      }

      // Handle successful responses, including 204 No Content which has no body
      let responseData = {}; // Default to empty object for non-JSON responses
      if (response.status !== 204) { // 204 No Content means success but no body
        try {
          responseData = await response.json();
        } catch (e) {
          // If JSON parsing fails for a successful response (should not happen with 200/201 usually)
          // Log it but don't necessarily throw an error if it was a 2xx status.
          console.warn('[removeCampaignSegment] Successful response but failed to parse JSON body:', e);
        }
      }

      console.log('[removeCampaignSegment] Success:', { status: response.status, responseData });

      // Refresh campaign segments and then fetch audience estimate
      await get().fetchCampaignSegments(campaignId);
      await get().fetchEstimatedAudienceSize(campaignId);

      // @ts-ignore TODO: Fix this type error if responseData can have a message property
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

  // New actions for segment_rules
  setIncludeOperator: (operator) => {
    set((state) => {
      if (state.currentCampaign && state.currentCampaign.segment_rules) {
        const updatedRules = {
          ...state.currentCampaign.segment_rules,
          include: {
            ...state.currentCampaign.segment_rules.include,
            operator: operator,
          },
        };
        return {
          currentCampaign: {
            ...state.currentCampaign,
            segment_rules: updatedRules,
          },
        };
      }
      return {};
    });
    // Fetch audience size after updating rules
    if (get().currentCampaign?.id) {
      get().fetchEstimatedAudienceSize(get().currentCampaign!.id);
    }
    // TODO: Consider calling a debounced saveSegmentRules action here
  },

  addIncludeSegmentId: (segmentId) => {
    set((state) => {
      if (
        state.currentCampaign &&
        state.currentCampaign.segment_rules &&
        state.currentCampaign.segment_rules.include && // Check for include object
        Array.isArray(state.currentCampaign.segment_rules.include.segmentIds) // Check if segmentIds is an array
      ) {
        // Avoid duplicates
        if (state.currentCampaign.segment_rules.include.segmentIds.includes(segmentId)) {
          return {};
        }
        const updatedRules = {
          ...state.currentCampaign.segment_rules,
          include: {
            ...state.currentCampaign.segment_rules.include,
            segmentIds: [...state.currentCampaign.segment_rules.include.segmentIds, segmentId],
          },
        };
        return {
          currentCampaign: {
            ...state.currentCampaign,
            segment_rules: updatedRules,
          },
        };
      } else if (state.currentCampaign) {
        // If segment_rules or its substructure is missing, initialize it properly
        const initializedRules: SegmentRules = {
          version: state.currentCampaign.segment_rules?.version || 1,
          include: {
            operator: state.currentCampaign.segment_rules?.include?.operator || 'OR',
            segmentIds: [segmentId]
          },
          exclude: {
            segmentIds: state.currentCampaign.segment_rules?.exclude?.segmentIds || []
          },
        };
        return {
          currentCampaign: {
            ...state.currentCampaign,
            segment_rules: initializedRules,
          }
        }
      }
      return {};
    });
    if (get().currentCampaign?.id) {
      get().fetchEstimatedAudienceSize(get().currentCampaign!.id);
    }
    // TODO: Consider calling a debounced saveSegmentRules action here
  },

  removeIncludeSegmentId: (segmentId) => {
    set((state) => {
      if (
        state.currentCampaign &&
        state.currentCampaign.segment_rules &&
        state.currentCampaign.segment_rules.include && // Check for include object
        Array.isArray(state.currentCampaign.segment_rules.include.segmentIds) // Check if segmentIds is an array
      ) {
        const updatedRules = {
          ...state.currentCampaign.segment_rules,
          include: {
            ...state.currentCampaign.segment_rules.include,
            segmentIds: state.currentCampaign.segment_rules.include.segmentIds.filter(id => id !== segmentId),
          },
        };
        return {
          currentCampaign: {
            ...state.currentCampaign,
            segment_rules: updatedRules,
          },
        };
      }
      // If structure is missing, there's nothing to remove, so return current state
      return {};
    });
    if (get().currentCampaign?.id) {
      get().fetchEstimatedAudienceSize(get().currentCampaign!.id);
    }
    // TODO: Consider calling a debounced saveSegmentRules action here
  },

  addExcludeSegmentId: (segmentId) => {
    set((state) => {
      if (
        state.currentCampaign &&
        state.currentCampaign.segment_rules &&
        state.currentCampaign.segment_rules.exclude && // Check for exclude object
        Array.isArray(state.currentCampaign.segment_rules.exclude.segmentIds) // Check if segmentIds is an array
      ) {
        // Avoid duplicates
        if (state.currentCampaign.segment_rules.exclude.segmentIds.includes(segmentId)) {
          return {};
        }
        const updatedRules = {
          ...state.currentCampaign.segment_rules,
          exclude: {
            ...state.currentCampaign.segment_rules.exclude,
            segmentIds: [...state.currentCampaign.segment_rules.exclude.segmentIds, segmentId],
          },
        };
        return {
          currentCampaign: {
            ...state.currentCampaign,
            segment_rules: updatedRules,
          },
        };
      } else if (state.currentCampaign) {
        // If segment_rules or its substructure is missing, initialize it properly
        const initializedRules: SegmentRules = {
          version: state.currentCampaign.segment_rules?.version || 1,
          include: {
            operator: state.currentCampaign.segment_rules?.include?.operator || 'OR',
            segmentIds: state.currentCampaign.segment_rules?.include?.segmentIds || []
          },
          exclude: {
            segmentIds: [segmentId]
          },
        };
        return {
          currentCampaign: {
            ...state.currentCampaign,
            segment_rules: initializedRules,
          }
        }
      }
      return {};
    });
    if (get().currentCampaign?.id) {
      get().fetchEstimatedAudienceSize(get().currentCampaign!.id);
    }
    // TODO: Consider calling a debounced saveSegmentRules action here
  },

  removeExcludeSegmentId: (segmentId) => {
    set((state) => {
      if (
        state.currentCampaign &&
        state.currentCampaign.segment_rules &&
        state.currentCampaign.segment_rules.exclude && // Check for exclude object
        Array.isArray(state.currentCampaign.segment_rules.exclude.segmentIds) // Check if segmentIds is an array
      ) {
        const updatedRules = {
          ...state.currentCampaign.segment_rules,
          exclude: {
            ...state.currentCampaign.segment_rules.exclude,
            segmentIds: state.currentCampaign.segment_rules.exclude.segmentIds.filter(id => id !== segmentId),
          },
        };
        return {
          currentCampaign: {
            ...state.currentCampaign,
            segment_rules: updatedRules,
          },
        };
      }
      // If structure is missing, there's nothing to remove, so return current state
      return {};
    });
    if (get().currentCampaign?.id) {
      get().fetchEstimatedAudienceSize(get().currentCampaign!.id);
    }
    // TODO: Consider calling a debounced saveSegmentRules action here
  },

  getSegmentDetails: (segmentId: string) => {
    const state = get();
    return state.availableSegments.find(segment => segment.id === segmentId);
  },

  saveSegmentRules: async () => {
    const { currentCampaign, updateCampaign: storeUpdateCampaign } = get();
    if (currentCampaign && currentCampaign.segment_rules) {
      try {
        console.log(`[useCampaignStore] Saving segment rules for campaign ${currentCampaign.id}:`, currentCampaign.segment_rules);
        // The store's updateCampaign already handles API calls and state updates
        await storeUpdateCampaign(currentCampaign.id, { segment_rules: currentCampaign.segment_rules });
        // TODO: Consider adding a toast notification for success
        console.log(`[useCampaignStore] Segment rules saved successfully for campaign ${currentCampaign.id}`);
      } catch (error: any) {
        // TODO: Consider adding a toast notification for error
        console.error(`[useCampaignStore] Failed to save segment rules for campaign ${currentCampaign.id}:`, error.message);
        throw error; // Re-throw to allow UI to handle it if necessary
      }
    }
  },
}));
