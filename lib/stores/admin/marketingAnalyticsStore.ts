import { create } from 'zustand';
import { DateRange } from 'react-day-picker';
import { isEqual } from 'lodash-es';

// --- Interfaces matching API responses (or component props) ---

interface MarketingSummaryData {
  totalAdSpend: string | number | null;
  totalAttributedRevenue?: string | number | null;
  overallROAS?: string | number | null;
  averageCPA?: string | number | null;
}

interface ChannelPerformanceData {
  channel: string;
  spend: number | null;
  impressions: number | null;
  clicks: number | null;
  revenue: number | null;
  enrollments: number | null;
}

interface FacebookAdDetail {
  date: string | null;
  campaign_id: string | null;
  campaign_name: string | null;
  adset_id: string | null;
  adset_name: string | null;
  ad_id: string | null;
  ad_name: string | null;
  spend: number | null;
  impressions: number | null;
  clicks: number | null;
}

interface MarketingComparisonData {
  campaign_id: string;
  campaign_name: string;
  date: string;
  fb_spend: number;
  fb_clicks: number;
  fb_impressions: number;
  visitor_count: number;
  bounce_count: number;
  conversion_count: number;
}

// --- Filters ---
interface MarketingFiltersState {
  dateRange: DateRange | undefined;
}

interface MarketingFiltersActions {
  setDateRange: (dateRange: DateRange | undefined) => void;
  setFilters: (filters: Partial<MarketingFiltersState>) => void;
}

// --- Data State ---
interface MarketingDataState {
  summaryData: MarketingSummaryData | null;
  channelData: ChannelPerformanceData[] | null;
  facebookDetailsData: FacebookAdDetail[] | null;
  comparisonData: MarketingComparisonData[] | null;
  loadingStates: {
    summary: boolean;
    channel: boolean;
    details: boolean;
    comparison: boolean;
  };
  errorStates: {
    summary: string | null;
    channel: string | null;
    details: string | null;
    comparison: string | null;
  };
  lastFetchedFilters: MarketingFiltersState | null;
}

// --- Data Actions ---
interface MarketingDataActions {
  fetchMarketingSummary: (currentFilters: MarketingFiltersState) => Promise<void>;
  fetchMarketingByChannel: (currentFilters: MarketingFiltersState) => Promise<void>;
  fetchFacebookDetails: (currentFilters: MarketingFiltersState) => Promise<void>;
  fetchComparisonData: (currentFilters: MarketingFiltersState) => Promise<void>;
  fetchAllMarketingData: (currentFilters: MarketingFiltersState) => Promise<void>;
}

// --- Combined Store Type ---
type MarketingAnalyticsStore = MarketingFiltersState & MarketingFiltersActions & MarketingDataState & MarketingDataActions;

// --- Helper function for API calls ---
const fetchApiData = async (endpoint: string, params: Record<string, string | undefined>): Promise<any> => {
  const url = new URL(endpoint, window.location.origin);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.append(key, value);
    }
  });

  const response = await fetch(url.toString(), { cache: 'no-store' });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Failed to parse error response' }));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }
  return response.json();
};

// --- Store Implementation ---
export const useMarketingAnalyticsStore = create<MarketingAnalyticsStore>((set, get) => ({
  // Filter State
  dateRange: undefined,

  // Filter Actions
  setDateRange: (dateRange) => set({ dateRange }),
  setFilters: (filters) => set((state) => ({ ...state, ...filters })),

  // Data State
  summaryData: null,
  channelData: null,
  facebookDetailsData: null,
  comparisonData: null,
  loadingStates: { summary: false, channel: false, details: false, comparison: false },
  errorStates: { summary: null, channel: null, details: null, comparison: null },
  lastFetchedFilters: null,

  // Data Actions
  fetchMarketingSummary: async (currentFilters) => {
    if (get().loadingStates.summary) return;
    set((state) => ({ loadingStates: { ...state.loadingStates, summary: true }, errorStates: { ...state.errorStates, summary: null } }));
    try {
      const params = {
        startDate: currentFilters.dateRange?.from?.toISOString(),
        endDate: currentFilters.dateRange?.to?.toISOString(),
      };
      const data = await fetchApiData('/api/admin/marketing/summary', params);
      set({ summaryData: data });
    } catch (error: any) {
      console.error('Failed to fetch marketing summary:', error);
      set((state) => ({ errorStates: { ...state.errorStates, summary: error.message } }));
    } finally {
      set((state) => ({ loadingStates: { ...state.loadingStates, summary: false } }));
    }
  },

  fetchMarketingByChannel: async (currentFilters) => {
    if (get().loadingStates.channel) return;
    set((state) => ({ loadingStates: { ...state.loadingStates, channel: true }, errorStates: { ...state.errorStates, channel: null } }));
    try {
      const params = {
        startDate: currentFilters.dateRange?.from?.toISOString(),
        endDate: currentFilters.dateRange?.to?.toISOString(),
      };
      const data = await fetchApiData('/api/admin/marketing/by-channel', params);
      set({ channelData: data });
    } catch (error: any) {
      console.error('Failed to fetch marketing by channel:', error);
      set((state) => ({ errorStates: { ...state.errorStates, channel: error.message } }));
    } finally {
      set((state) => ({ loadingStates: { ...state.loadingStates, channel: false } }));
    }
  },

  fetchFacebookDetails: async (currentFilters) => {
    if (get().loadingStates.details) return;
    set((state) => ({ loadingStates: { ...state.loadingStates, details: true }, errorStates: { ...state.errorStates, details: null } }));
    try {
      const params = {
        startDate: currentFilters.dateRange?.from?.toISOString(),
        endDate: currentFilters.dateRange?.to?.toISOString(),
      };
      const data = await fetchApiData('/api/admin/marketing/facebook/details', params);
      set({ facebookDetailsData: data });
    } catch (error: any) {
      console.error('Failed to fetch facebook details:', error);
      set((state) => ({ errorStates: { ...state.errorStates, details: error.message } }));
    } finally {
      set((state) => ({ loadingStates: { ...state.loadingStates, details: false } }));
    }
  },

  fetchComparisonData: async (currentFilters) => {
    if (get().loadingStates.comparison) return;
    set((state) => ({ loadingStates: { ...state.loadingStates, comparison: true }, errorStates: { ...state.errorStates, comparison: null } }));
    try {
      const params = {
        startDate: currentFilters.dateRange?.from?.toISOString(),
        endDate: currentFilters.dateRange?.to?.toISOString(),
      };
      const data = await fetchApiData('/api/admin/marketing/comparison', params);
      set({ comparisonData: data });
    } catch (error: any) {
      console.error('Failed to fetch comparison data:', error);
      set((state) => ({ errorStates: { ...state.errorStates, comparison: error.message } }));
    } finally {
      set((state) => ({ loadingStates: { ...state.loadingStates, comparison: false } }));
    }
  },

  fetchAllMarketingData: async (currentFilters) => {
    if (isEqual(currentFilters, get().lastFetchedFilters)) {
      console.log('Skipping fetchAll: filters match last successful fetch');
      return;
    }
    const results = await Promise.allSettled([
      get().fetchMarketingSummary(currentFilters),
      get().fetchMarketingByChannel(currentFilters),
      get().fetchFacebookDetails(currentFilters),
      get().fetchComparisonData(currentFilters),
    ]);
    const allOk = results.every(r => r.status === 'fulfilled');
    set({ lastFetchedFilters: allOk ? currentFilters : null });
  },
}));
