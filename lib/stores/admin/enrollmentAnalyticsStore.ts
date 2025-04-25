import { create } from 'zustand';
import { formatISO } from 'date-fns';
import { useSharedDashboardFiltersStore } from './sharedDashboardFiltersStore';

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
  granularity: Granularity;
  funnelSource: FunnelSource;
  detailsSearchTerm: string;
  detailsPage: number;
  detailsPageSize: number;
  checkEmail: string;

  summaryData: EnrollmentSummaryData | null;
  trendsData: TrendDataPoint[] | null;
  funnelData: EnrollmentFunnelData | null;
  segmentationData: EnrollmentSegmentationData | null;
  detailsData: EnrollmentDetail[];
  detailsTotalCount: number;
  checkResult: CheckResult | null;

  isLoadingSummary: boolean;
  isLoadingTrends: boolean;
  isLoadingFunnel: boolean;
  isLoadingSegmentation: boolean;
  isLoadingDetails: boolean;
  isLoadingCheck: boolean;

  summaryError: string | null;
  trendsError: string | null;
  funnelError: string | null;
  segmentationError: string | null;
  detailsError: string | null;
  checkError: string | null;
}

// --- Actions Interface ---
interface EnrollmentAnalyticsActions {
  setGranularity: (granularity: Granularity) => void;
  setFunnelSource: (source: FunnelSource) => void;
  setDetailsSearchTerm: (term: string) => void;
  setDetailsPage: (page: number) => void;
  setDetailsPageSize: (size: number) => void;
  setCheckEmail: (email: string) => void;

  fetchSummary: () => Promise<void>;
  fetchTrends: () => Promise<void>;
  fetchFunnel: () => Promise<void>;
  fetchSegmentation: () => Promise<void>;
  fetchDetails: () => Promise<void>;
  performCheck: () => Promise<void>;

  initialize: () => void;
}

// --- Store Implementation ---
export const useEnrollmentAnalyticsStore = create<EnrollmentAnalyticsState & EnrollmentAnalyticsActions>()((set, get) => ({
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

  setGranularity: (granularity) => {
      set({ granularity });
  },
  setFunnelSource: (source) => {
      set({ funnelSource: source });
  },
  setDetailsSearchTerm: (term) => {
      set({ detailsSearchTerm: term, detailsPage: 1 }); 
      get().fetchDetails();
  },
  setDetailsPage: (page) => {
      set({ detailsPage: page });
      get().fetchDetails();
  },
  setDetailsPageSize: (size) => {
      set({ detailsPageSize: size, detailsPage: 1 });
      get().fetchDetails();
  },
  setCheckEmail: (email) => set({ checkEmail: email, checkError: null, checkResult: null }),

  fetchSummary: async () => {
    set({ isLoadingSummary: true, summaryError: null });
    const { dateRange } = useSharedDashboardFiltersStore.getState();
    if (!dateRange?.from) {
        set({ isLoadingSummary: false, summaryError: 'Date range start date is missing.' });
        return;
    }
    const startDate = dateRange.from;
    const endDate = dateRange.to || startDate;

    try {
      const params = new URLSearchParams();
      params.append('startDate', formatISO(startDate));
      params.append('endDate', formatISO(endDate));
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
    const { dateRange } = useSharedDashboardFiltersStore.getState();
    const { granularity } = get();
    if (!dateRange?.from) {
        set({ isLoadingTrends: false, trendsError: 'Date range start date is missing.' });
        return;
    }
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
      set({ trendsData: data, isLoadingTrends: false });
    } catch (error) {
      console.error("Error fetching enrollment trends:", error);
      set({ trendsError: error instanceof Error ? error.message : 'Unknown error', isLoadingTrends: false });
    }
  },

  fetchFunnel: async () => {
      set({ isLoadingFunnel: true, funnelError: null });
      const { dateRange } = useSharedDashboardFiltersStore.getState();
      const { funnelSource } = get();
      if (!dateRange?.from) {
          set({ isLoadingFunnel: false, funnelError: 'Date range start date is missing.' });
          return;
      }
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
          set({ funnelData: data, isLoadingFunnel: false });
      } catch (error) {
          console.error("Error fetching enrollment funnel:", error);
          set({ funnelError: error instanceof Error ? error.message : 'Unknown error', isLoadingFunnel: false });
      }
  },

  fetchSegmentation: async () => {
      set({ isLoadingSegmentation: true, segmentationError: null });
      const { dateRange } = useSharedDashboardFiltersStore.getState();
      if (!dateRange?.from) {
          set({ isLoadingSegmentation: false, segmentationError: 'Date range start date is missing.' });
          return;
      }
      const startDate = dateRange.from;
      const endDate = dateRange.to || startDate;

      try {
          const params = new URLSearchParams();
          params.append('startDate', formatISO(startDate));
          params.append('endDate', formatISO(endDate));
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
      const { dateRange } = useSharedDashboardFiltersStore.getState();
      const { detailsPage, detailsPageSize, detailsSearchTerm } = get();
      if (!dateRange?.from) {
          set({ isLoadingDetails: false, detailsError: 'Date range start date is missing.' });
          return;
      }
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
              detailsError: null
          });
      } catch (error) {
          console.error("Error fetching enrollment details:", error);
          set({ detailsError: error instanceof Error ? error.message : 'Unknown error', isLoadingDetails: false });
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

  initialize: () => {
    get().fetchSummary();
    get().fetchTrends();
    get().fetchFunnel();
    get().fetchSegmentation();
    get().fetchDetails(); 
  }
})); 