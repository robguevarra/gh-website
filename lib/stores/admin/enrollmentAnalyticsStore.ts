import { create } from 'zustand';
import { formatISO } from 'date-fns';
import { DateRange } from '@/components/admin/date-range-picker'; // Assuming this path is correct

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

// --- State Interface ---
interface EnrollmentAnalyticsState {
  // Filters
  dateRange: DateRange;
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

  // Loading States
  isLoadingSummary: boolean;
  isLoadingTrends: boolean;
  isLoadingFunnel: boolean;
  isLoadingSegmentation: boolean;
  isLoadingDetails: boolean;
  isLoadingCheck: boolean;

  // Error States
  summaryError: string | null;
  trendsError: string | null;
  funnelError: string | null;
  segmentationError: string | null;
  detailsError: string | null;
  checkError: string | null;
}

// --- Actions Interface ---
interface EnrollmentAnalyticsActions {
  // Filter Setters
  setDateRange: (range: DateRange) => void;
  setGranularity: (granularity: Granularity) => void;
  setFunnelSource: (source: FunnelSource) => void;
  setDetailsSearchTerm: (term: string) => void;
  setDetailsPage: (page: number) => void;
  setDetailsPageSize: (size: number) => void;
  setCheckEmail: (email: string) => void;

  // Fetch Actions (trigger based on filter changes)
  fetchSummary: () => Promise<void>;
  fetchTrends: () => Promise<void>;
  fetchFunnel: () => Promise<void>;
  fetchSegmentation: () => Promise<void>;
  fetchDetails: () => Promise<void>;
  performCheck: () => Promise<void>;

  // Initialization
  initialize: () => void; // To fetch initial data
}

// --- Store Implementation ---
export const useEnrollmentAnalyticsStore = create<EnrollmentAnalyticsState & EnrollmentAnalyticsActions>()((set, get) => ({
  // Initial State
  dateRange: { 
      start: new Date(new Date().getFullYear(), new Date().getMonth(), 1), 
      end: new Date() 
  },
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

  isLoadingSummary: true,
  isLoadingTrends: true,
  isLoadingFunnel: true,
  isLoadingSegmentation: true,
  isLoadingDetails: true,
  isLoadingCheck: false,

  summaryError: null,
  trendsError: null,
  funnelError: null,
  segmentationError: null,
  detailsError: null,
  checkError: null,

  // Actions
  setDateRange: (range) => {
      set({ dateRange: range, detailsPage: 1 }); // Reset page on date change
      // Trigger fetches that depend on dateRange
      get().fetchSummary();
      get().fetchTrends();
      get().fetchFunnel();
      get().fetchSegmentation();
      get().fetchDetails();
  },
  setGranularity: (granularity) => {
      set({ granularity });
      get().fetchTrends(); // Only trends depend on granularity
  },
  setFunnelSource: (source) => {
      set({ funnelSource: source });
      get().fetchFunnel(); // Only funnel depends on source
  },
  setDetailsSearchTerm: (term) => {
      // Debouncing should ideally happen in the component calling this
      set({ detailsSearchTerm: term, detailsPage: 1 }); 
      get().fetchDetails();
  },
  setDetailsPage: (page) => {
      set({ detailsPage: page });
      get().fetchDetails();
  },
  setDetailsPageSize: (size) => {
      set({ detailsPageSize: size, detailsPage: 1 }); // Reset to page 1 on size change
      get().fetchDetails();
  },
  setCheckEmail: (email) => set({ checkEmail: email, checkError: null, checkResult: null }),

  fetchSummary: async () => {
    set({ isLoadingSummary: true, summaryError: null });
    const { dateRange } = get();
    try {
      const params = new URLSearchParams();
      if (dateRange.start) params.append('startDate', formatISO(dateRange.start));
      if (dateRange.end) params.append('endDate', formatISO(dateRange.end));
      const response = await fetch(`/api/admin/enrollments/summary?${params.toString()}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch summary');
      set({ summaryData: data, isLoadingSummary: false });
    } catch (error) {
      console.error("Error fetching enrollment summary:", error);
      set({ summaryError: error instanceof Error ? error.message : 'Unknown error', isLoadingSummary: false });
    }
  },

  fetchTrends: async () => {
    set({ isLoadingTrends: true, trendsError: null });
    const { dateRange, granularity } = get();
    try {
      const params = new URLSearchParams();
      if (dateRange.start) params.append('startDate', formatISO(dateRange.start));
      if (dateRange.end) params.append('endDate', formatISO(dateRange.end));
      params.append('granularity', granularity);
      const response = await fetch(`/api/admin/enrollments/trends?${params.toString()}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch trends');
      set({ trendsData: data, isLoadingTrends: false });
    } catch (error) {
      console.error("Error fetching enrollment trends:", error);
      set({ trendsError: error instanceof Error ? error.message : 'Unknown error', isLoadingTrends: false });
    }
  },

  fetchFunnel: async () => {
      set({ isLoadingFunnel: true, funnelError: null });
      const { dateRange, funnelSource } = get();
      try {
          const params = new URLSearchParams();
          if (dateRange.start) params.append('startDate', formatISO(dateRange.start));
          if (dateRange.end) params.append('endDate', formatISO(dateRange.end));
          params.append('source', funnelSource);
          const response = await fetch(`/api/admin/enrollments/funnel?${params.toString()}`);
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || 'Failed to fetch funnel');
          set({ funnelData: data, isLoadingFunnel: false });
      } catch (error) {
          console.error("Error fetching enrollment funnel:", error);
          set({ funnelError: error instanceof Error ? error.message : 'Unknown error', isLoadingFunnel: false });
      }
  },

  fetchSegmentation: async () => {
      set({ isLoadingSegmentation: true, segmentationError: null });
      const { dateRange } = get(); // Currently only depends on date range
      try {
          const params = new URLSearchParams();
          if (dateRange.start) params.append('startDate', formatISO(dateRange.start));
          if (dateRange.end) params.append('endDate', formatISO(dateRange.end));
          params.append('type', 'bySourceTag');
          const response = await fetch(`/api/admin/enrollments/segmentation?${params.toString()}`);
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || 'Failed to fetch segmentation');
          set({ segmentationData: data, isLoadingSegmentation: false });
      } catch (error) {
          console.error("Error fetching enrollment segmentation:", error);
          set({ segmentationError: error instanceof Error ? error.message : 'Unknown error', isLoadingSegmentation: false });
      }
  },

  fetchDetails: async () => {
      set({ isLoadingDetails: true, detailsError: null });
      const { dateRange, detailsPage, detailsPageSize, detailsSearchTerm } = get();
      try {
          const params = new URLSearchParams();
          if (dateRange.start) params.append('startDate', formatISO(dateRange.start));
          if (dateRange.end) params.append('endDate', formatISO(dateRange.end));
          params.append('page', detailsPage.toString());
          params.append('pageSize', detailsPageSize.toString());
          if (detailsSearchTerm) params.append('search', detailsSearchTerm);
          const response = await fetch(`/api/admin/enrollments/details?${params.toString()}`);
          const data: EnrollmentDetailsApiResponse = await response.json();
          if (!response.ok) throw new Error((data as any).error || 'Failed to fetch details');
          set({
              detailsData: data.enrollments,
              detailsTotalCount: data.totalCount,
              detailsPage: data.page, // Update page from response
              isLoadingDetails: false
          });
      } catch (error) {
          console.error("Error fetching enrollment details:", error);
          set({ 
              detailsError: error instanceof Error ? error.message : 'Unknown error',
              isLoadingDetails: false,
              detailsData: [],
              detailsTotalCount: 0
          });
      }
  },
  
  performCheck: async () => {
      const email = get().checkEmail;
      if (!email) {
          set({ checkError: 'Please enter an email address.' });
          return;
      }
      set({ isLoadingCheck: true, checkError: null, checkResult: null });
      try {
          const params = new URLSearchParams({ email });
          const response = await fetch(`/api/admin/enrollments/check-status?${params.toString()}`);
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || 'Failed to check status');
          set({ checkResult: data, isLoadingCheck: false });
      } catch (error) {
          console.error("Error checking enrollment status:", error);
          set({ checkError: error instanceof Error ? error.message : 'Unknown error', isLoadingCheck: false });
      }
  },

  initialize: () => {
      // Fetch all necessary initial data
      get().fetchSummary();
      get().fetchTrends();
      get().fetchFunnel();
      get().fetchSegmentation();
      get().fetchDetails();
  }
})); 