import { create } from 'zustand';
import { DateRange } from 'react-day-picker';
import { isEqual } from 'lodash-es'; // Re-enable import

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
  loadingStates: {
    summary: boolean;
    channel: boolean;
    details: boolean;
  };
  errorStates: {
    summary: string | null;
    channel: string | null;
    details: string | null;
  };
  lastFetchedFilters: MarketingFiltersState | null;
}

// --- Data Actions ---
interface MarketingDataActions {
  fetchMarketingSummary: (currentFilters: MarketingFiltersState) => Promise<void>;
  fetchMarketingByChannel: (currentFilters: MarketingFiltersState) => Promise<void>;
  fetchFacebookDetails: (currentFilters: MarketingFiltersState) => Promise<void>;
  fetchAllMarketingData: (currentFilters: MarketingFiltersState) => Promise<void>;
}

// --- Combined Store Type ---
// Ensure this type combines all state and action interfaces correctly
type MarketingAnalyticsStore = MarketingFiltersState & MarketingFiltersActions & MarketingDataState & MarketingDataActions;

// --- Helper function for API calls ---
// Defined within the store or imported from a utility file
const fetchApiData = async (endpoint: string, params: Record<string, string | undefined>): Promise<any> => {
  const url = new URL(endpoint, window.location.origin);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.append(key, value);
    }
  });

  const response = await fetch(url.toString());
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
  setFilters: (filters) => set((state: MarketingAnalyticsStore) => ({ ...state, ...filters })), // Add state type

  // Data State
  summaryData: null,
  channelData: null,
  facebookDetailsData: null,
  loadingStates: { summary: false, channel: false, details: false },
  errorStates: { summary: null, channel: null, details: null },
  lastFetchedFilters: null,

  // Data Actions
  fetchMarketingSummary: async (currentFilters: MarketingFiltersState) => {
    if (get().loadingStates.summary) return;
    // Uncomment caching logic
    if (isEqual(currentFilters, get().lastFetchedFilters)) {
      console.log('Skipping summary fetch: filters match last fetch');
      return;
    }
    set((state: MarketingAnalyticsStore) => ({ loadingStates: { ...state.loadingStates, summary: true }, errorStates: { ...state.errorStates, summary: null } }));
    try {
      const params = { 
        startDate: currentFilters.dateRange?.from?.toISOString(),
        endDate: currentFilters.dateRange?.to?.toISOString(),
      };
      const data = await fetchApiData('/api/admin/marketing/summary', params);
      set({ summaryData: data, lastFetchedFilters: currentFilters }); // Re-enable caching part
    } catch (error: any) {
      console.error('Failed to fetch marketing summary:', error);
      set((state: MarketingAnalyticsStore) => ({ errorStates: { ...state.errorStates, summary: error.message }, lastFetchedFilters: null })); // Re-enable caching part (reset on error)
    } finally {
      set((state: MarketingAnalyticsStore) => ({ loadingStates: { ...state.loadingStates, summary: false } }));
    }
  },

  fetchMarketingByChannel: async (currentFilters: MarketingFiltersState) => {
    if (get().loadingStates.channel) return;
    // Uncomment caching logic
    if (isEqual(currentFilters, get().lastFetchedFilters)) {
      console.log('Skipping channel fetch: filters match last fetch');
      return;
    }
    set((state: MarketingAnalyticsStore) => ({ loadingStates: { ...state.loadingStates, channel: true }, errorStates: { ...state.errorStates, channel: null } }));
    try {
      const params = { 
        startDate: currentFilters.dateRange?.from?.toISOString(),
        endDate: currentFilters.dateRange?.to?.toISOString(),
      };
      const data = await fetchApiData('/api/admin/marketing/by-channel', params);
      set({ channelData: data, lastFetchedFilters: currentFilters }); // Re-enable caching part
    } catch (error: any) {
      console.error('Failed to fetch marketing by channel:', error);
      set((state: MarketingAnalyticsStore) => ({ errorStates: { ...state.errorStates, channel: error.message }, lastFetchedFilters: null })); // Re-enable caching part (reset on error)
    } finally {
      set((state: MarketingAnalyticsStore) => ({ loadingStates: { ...state.loadingStates, channel: false } }));
    }
  },

  fetchFacebookDetails: async (currentFilters: MarketingFiltersState) => {
    if (get().loadingStates.details) return;
    // Uncomment caching logic
    if (isEqual(currentFilters, get().lastFetchedFilters)) {
      console.log('Skipping details fetch: filters match last fetch');
      return;
    }
    set((state: MarketingAnalyticsStore) => ({ loadingStates: { ...state.loadingStates, details: true }, errorStates: { ...state.errorStates, details: null } }));
    try {
      const params = { 
        startDate: currentFilters.dateRange?.from?.toISOString(),
        endDate: currentFilters.dateRange?.to?.toISOString(),
      };
      const data = await fetchApiData('/api/admin/marketing/facebook/details', params);
      set({ facebookDetailsData: data, lastFetchedFilters: currentFilters }); // Re-enable caching part
    } catch (error: any) {
      console.error('Failed to fetch facebook details:', error);
      set((state: MarketingAnalyticsStore) => ({ errorStates: { ...state.errorStates, details: error.message }, lastFetchedFilters: null })); // Re-enable caching part (reset on error)
    } finally {
      set((state: MarketingAnalyticsStore) => ({ loadingStates: { ...state.loadingStates, details: false } }));
    }
  },

  fetchAllMarketingData: async (currentFilters: MarketingFiltersState) => {
    // Uncomment caching logic
    if (isEqual(currentFilters, get().lastFetchedFilters)) {
        console.log('Skipping fetchAll: filters match last successful fetch');
        return;
    }
    await Promise.all([
      get().fetchMarketingSummary(currentFilters),
      get().fetchMarketingByChannel(currentFilters),
      get().fetchFacebookDetails(currentFilters),
    ]);
    // Note: lastFetchedFilters is updated individually
  },
}));
