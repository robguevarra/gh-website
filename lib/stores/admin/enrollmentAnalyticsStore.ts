import { create } from 'zustand';
import { formatISO } from 'date-fns';
import { useSharedDashboardFiltersStore } from './sharedDashboardFiltersStore';
import { isEqual } from 'lodash';
import type { DateRange } from 'react-day-picker'; // Needed for filter types

// --- Types --- (Copied/adapted from component and API routes)
type Granularity = 'day' | 'week' | 'month';
type FunnelSource = 'all' | 'organic_tag';

interface EnrollmentSummaryData {
  totalEnrollments: number;
  activeEnrollments: number;
  totalEnrollmentsPrevPeriod: number;
  activeEnrollmentsPrevPeriod: number;
  totalTrendPercentage: number | null;
  activeTrendPercentage: number | null;
}

interface TrendDataPoint {
  date: string;
  count: number;
}

interface FunnelStage {
  stageName: string;
  count: number;
}
interface EnrollmentFunnelData {
  source: string;
  stages: FunnelStage[];
}

interface SegmentationGroup {
  segmentName: string;
  count: number;
}
interface EnrollmentSegmentationData {
  dateRange: { startDate: string; endDate: string };
  segmentationType: string;
  groups: SegmentationGroup[];
}

interface EnrollmentDetail {
  enrollmentId: string;
  userId: string;
  userEmail: string | null;
  userName: string | null;
  enrolledAt: string;
  status: string;
  sourceTags: string[] | null;
}
interface EnrollmentDetailsApiResponse {
  enrollments: EnrollmentDetail[];
  totalCount: number;
  page: number;
  pageSize: number;
}

interface CheckResult {
  isEnrolled: boolean;
  paymentDate: string | null;
}

// --- Filter Structure Types ---
interface BaseFilters {
  dateRange: DateRange | undefined;
}
interface TrendFilters extends BaseFilters {
  granularity: Granularity;
}
interface FunnelFilters extends BaseFilters {
  funnelSource: FunnelSource;
}
interface DetailsFilters extends BaseFilters {
  detailsPage: number;
  detailsPageSize: number;
  detailsSearchTerm: string;
}

// --- State Interface ---
interface EnrollmentAnalyticsState {
  // Filters (Local to this section)
  granularity: Granularity;
  funnelSource: FunnelSource;
  detailsSearchTerm: string;
  detailsPage: number;
  detailsPageSize: number;
  checkEmail: string;

  // Data
  summaryData: EnrollmentSummaryData | null;
  trendsData: TrendDataPoint[] | null;
  funnelData: EnrollmentFunnelData | null;
  segmentationData: EnrollmentSegmentationData | null;
  detailsData: EnrollmentDetail[];
  detailsTotalCount: number;
  checkResult: CheckResult | null;

  // Loading States (Granular)
  isLoadingSummary: boolean;
  isLoadingTrends: boolean;
  isLoadingFunnel: boolean;
  isLoadingSegmentation: boolean;
  isLoadingDetails: boolean;
  isLoadingCheck: boolean;

  // Error States (Granular)
  summaryError: string | null;
  trendsError: string | null;
  funnelError: string | null;
  segmentationError: string | null;
  detailsError: string | null;
  checkError: string | null;
  
  // Last Fetched Filters State
  lastFetchedSummaryFilters: BaseFilters | null;
  lastFetchedTrendsFilters: TrendFilters | null;
  lastFetchedFunnelFilters: FunnelFilters | null;
  lastFetchedSegmentationFilters: BaseFilters | null; // Only depends on date for now
  lastFetchedDetailsFilters: DetailsFilters | null;
}

// --- Actions Interface ---
interface EnrollmentAnalyticsActions {
  // Filter Setters (These now primarily just update state, fetch is triggered by component effect)
  setGranularity: (granularity: Granularity) => void;
  setFunnelSource: (source: FunnelSource) => void;
  setDetailsSearchTerm: (term: string) => void;
  setDetailsPage: (page: number) => void;
  setDetailsPageSize: (size: number) => void;
  setCheckEmail: (email: string) => void;

  // Fetch Actions (Now smarter with filter checks)
  fetchSummary: () => Promise<void>;
  fetchTrends: () => Promise<void>;
  fetchFunnel: () => Promise<void>;
  fetchSegmentation: () => Promise<void>;
  fetchDetails: () => Promise<void>;
  performCheck: () => Promise<void>;

  // Removed initialize, component effect triggers specific fetches
}

// --- Store Implementation ---
export const useEnrollmentAnalyticsStore = create<EnrollmentAnalyticsState & EnrollmentAnalyticsActions>()((set, get) => ({
  // Initial State
  granularity: 'day',
  funnelSource: 'all',
  detailsSearchTerm: '',
  detailsPage: 1,
  detailsPageSize: 10,
  checkEmail: '',

  summaryData: null,
  trendsData: null,
  funnelData: null,
  segmentationData: null,
  detailsData: [],
  detailsTotalCount: 0,
  checkResult: null,

  // Set initial loading to false
  isLoadingSummary: false,
  isLoadingTrends: false,
  isLoadingFunnel: false,
  isLoadingSegmentation: false,
  isLoadingDetails: false,
  isLoadingCheck: false,

  summaryError: null,
  trendsError: null,
  funnelError: null,
  segmentationError: null,
  detailsError: null,
  checkError: null,

  // Initialize last fetched filters to null
  lastFetchedSummaryFilters: null,
  lastFetchedTrendsFilters: null,
  lastFetchedFunnelFilters: null,
  lastFetchedSegmentationFilters: null,
  lastFetchedDetailsFilters: null,

  // Actions
  setGranularity: (granularity) => set({ granularity }), // Just update state
  setFunnelSource: (source) => set({ funnelSource: source }), // Just update state
  setDetailsSearchTerm: (term) => {
      set({ detailsSearchTerm: term, detailsPage: 1 }); 
      get().fetchDetails(); // Fetch details immediately on search change
  },
  setDetailsPage: (page) => {
      set({ detailsPage: page });
      get().fetchDetails(); // Fetch details immediately on page change
  },
  setDetailsPageSize: (size) => {
      set({ detailsPageSize: size, detailsPage: 1 });
      get().fetchDetails(); // Fetch details immediately on size change
  },
  setCheckEmail: (email) => set({ checkEmail: email, checkError: null, checkResult: null }),

  // --- Smart Fetch Actions ---

  fetchSummary: async () => {
    const { dateRange } = useSharedDashboardFiltersStore.getState();
    const currentFilters: BaseFilters = { dateRange };
    const { lastFetchedSummaryFilters, isLoadingSummary } = get();

    if (isLoadingSummary) return; // Already loading
    if (lastFetchedSummaryFilters && isEqual(currentFilters, lastFetchedSummaryFilters)) {
        console.log("EnrollmentStore: Summary filters unchanged, skipping fetch.");
        return; // Filters match, skip fetch
    }
    if (!dateRange?.from) {
        console.warn("EnrollmentStore: Skipping summary fetch, date range missing.");
        // Maybe clear error state if needed: set({ summaryError: null }); 
        return;
    }

    console.log("EnrollmentStore: Fetching summary...");
    set({ isLoadingSummary: true, summaryError: null });
    const startDate = dateRange.from;
    const endDate = dateRange.to || startDate;

    try {
      const params = new URLSearchParams();
      params.append('startDate', formatISO(startDate));
      params.append('endDate', formatISO(endDate));
      const response = await fetch(`/api/admin/enrollments/summary?${params.toString()}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch summary');
      set({ summaryData: data, isLoadingSummary: false, lastFetchedSummaryFilters: currentFilters });
    } catch (error) {
      console.error("Error fetching enrollment summary:", error);
      set({ summaryError: error instanceof Error ? error.message : 'Unknown error', isLoadingSummary: false, lastFetchedSummaryFilters: null });
    }
  },

  fetchTrends: async () => {
    const { dateRange } = useSharedDashboardFiltersStore.getState();
    const { granularity } = get(); // Get local granularity
    const currentFilters: TrendFilters = { dateRange, granularity };
    const { lastFetchedTrendsFilters, isLoadingTrends } = get();

    if (isLoadingTrends) return;
    if (lastFetchedTrendsFilters && isEqual(currentFilters, lastFetchedTrendsFilters)) {
        console.log("EnrollmentStore: Trend filters unchanged, skipping fetch.");
        return;
    }
     if (!dateRange?.from) {
        console.warn("EnrollmentStore: Skipping trends fetch, date range missing.");
        return;
    }

    console.log("EnrollmentStore: Fetching trends...");
    set({ isLoadingTrends: true, trendsError: null });
    const startDate = dateRange.from;
    const endDate = dateRange.to || startDate;

    try {
      const params = new URLSearchParams();
      params.append('startDate', formatISO(startDate));
      params.append('endDate', formatISO(endDate));
      params.append('granularity', granularity);
      const response = await fetch(`/api/admin/enrollments/trends?${params.toString()}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch trends');
      set({ trendsData: data, isLoadingTrends: false, lastFetchedTrendsFilters: currentFilters });
    } catch (error) {
      console.error("Error fetching enrollment trends:", error);
      set({ trendsError: error instanceof Error ? error.message : 'Unknown error', isLoadingTrends: false, lastFetchedTrendsFilters: null });
    }
  },

  fetchFunnel: async () => {
      const { dateRange } = useSharedDashboardFiltersStore.getState();
      const { funnelSource } = get(); // Get local funnel source
      const currentFilters: FunnelFilters = { dateRange, funnelSource };
      const { lastFetchedFunnelFilters, isLoadingFunnel } = get();

      if (isLoadingFunnel) return;
      if (lastFetchedFunnelFilters && isEqual(currentFilters, lastFetchedFunnelFilters)) {
          console.log("EnrollmentStore: Funnel filters unchanged, skipping fetch.");
          return;
      }
       if (!dateRange?.from) {
          console.warn("EnrollmentStore: Skipping funnel fetch, date range missing.");
          return;
      }

      console.log("EnrollmentStore: Fetching funnel...");
      set({ isLoadingFunnel: true, funnelError: null });
      const startDate = dateRange.from;
      const endDate = dateRange.to || startDate;

      try {
          const params = new URLSearchParams();
          params.append('startDate', formatISO(startDate));
          params.append('endDate', formatISO(endDate));
          params.append('source', funnelSource);
          const response = await fetch(`/api/admin/enrollments/funnel?${params.toString()}`);
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || 'Failed to fetch funnel');
          set({ funnelData: data, isLoadingFunnel: false, lastFetchedFunnelFilters: currentFilters });
      } catch (error) {
          console.error("Error fetching enrollment funnel:", error);
          set({ funnelError: error instanceof Error ? error.message : 'Unknown error', isLoadingFunnel: false, lastFetchedFunnelFilters: null });
      }
  },

  fetchSegmentation: async () => {
      const { dateRange } = useSharedDashboardFiltersStore.getState();
      const currentFilters: BaseFilters = { dateRange }; // Depends only on date for now
      const { lastFetchedSegmentationFilters, isLoadingSegmentation } = get();

      if (isLoadingSegmentation) return;
      if (lastFetchedSegmentationFilters && isEqual(currentFilters, lastFetchedSegmentationFilters)) {
          console.log("EnrollmentStore: Segmentation filters unchanged, skipping fetch.");
          return;
      }
       if (!dateRange?.from) {
          console.warn("EnrollmentStore: Skipping segmentation fetch, date range missing.");
          return;
      }

      console.log("EnrollmentStore: Fetching segmentation...");
      set({ isLoadingSegmentation: true, segmentationError: null });
      const startDate = dateRange.from;
      const endDate = dateRange.to || startDate;

      try {
          const params = new URLSearchParams();
          params.append('startDate', formatISO(startDate));
          params.append('endDate', formatISO(endDate));
          const response = await fetch(`/api/admin/enrollments/segmentation?${params.toString()}`);
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || 'Failed to fetch segmentation');
          set({ segmentationData: data, isLoadingSegmentation: false, lastFetchedSegmentationFilters: currentFilters });
      } catch (error) {
          console.error("Error fetching enrollment segmentation:", error);
          set({ segmentationError: error instanceof Error ? error.message : 'Unknown error', isLoadingSegmentation: false, lastFetchedSegmentationFilters: null });
      }
  },

  fetchDetails: async () => {
      const { dateRange } = useSharedDashboardFiltersStore.getState();
      const { detailsPage, detailsPageSize, detailsSearchTerm } = get();
      const currentFilters: DetailsFilters = { dateRange, detailsPage, detailsPageSize, detailsSearchTerm };
      const { lastFetchedDetailsFilters, isLoadingDetails } = get();

      if (isLoadingDetails) return;
      // Skip if details filters are exactly the same
      if (lastFetchedDetailsFilters && isEqual(currentFilters, lastFetchedDetailsFilters)) {
         console.log("EnrollmentStore: Details filters unchanged, skipping fetch.");
         return;
      }
       if (!dateRange?.from) {
          console.warn("EnrollmentStore: Skipping details fetch, date range missing.");
          return;
      }

      console.log("EnrollmentStore: Fetching details...");
      set({ isLoadingDetails: true, detailsError: null });
      const startDate = dateRange.from;
      const endDate = dateRange.to || startDate;

      try {
          const params = new URLSearchParams();
          params.append('startDate', formatISO(startDate));
          params.append('endDate', formatISO(endDate));
          params.append('page', detailsPage.toString());
          params.append('limit', detailsPageSize.toString());
          if (detailsSearchTerm) params.append('search', detailsSearchTerm);

          const response = await fetch(`/api/admin/enrollments/details?${params.toString()}`);
          const data: EnrollmentDetailsApiResponse = await response.json();
          if (!response.ok) throw new Error((data as any).error || 'Failed to fetch details');
          set({
              detailsData: data.enrollments,
              detailsTotalCount: data.totalCount,
              isLoadingDetails: false,
              detailsError: null,
              lastFetchedDetailsFilters: currentFilters // Store filters on success
          });
      } catch (error) {
          console.error("Error fetching enrollment details:", error);
          set({ detailsError: error instanceof Error ? error.message : 'Unknown error', isLoadingDetails: false, lastFetchedDetailsFilters: null });
      }
  },
  
  performCheck: async () => {
      set({ isLoadingCheck: true, checkError: null, checkResult: null });
      const { checkEmail } = get();
      if (!checkEmail) {
          set({ isLoadingCheck: false, checkError: 'Email address is required.' });
          return;
      }
      try {
          const params = new URLSearchParams({ email: checkEmail });
          const response = await fetch(`/api/admin/enrollments/check-status?${params.toString()}`);
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || 'Failed to check status');
          set({ checkResult: data, isLoadingCheck: false });
      } catch (error) {
          console.error("Error checking enrollment status:", error);
          set({ checkError: error instanceof Error ? error.message : 'Unknown error', isLoadingCheck: false });
      }
  },

})); 