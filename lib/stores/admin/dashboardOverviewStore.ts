import { create } from 'zustand';
import { toast } from 'sonner';
import type { DateRange } from 'react-day-picker';
import { isEqual } from 'lodash'; // Import isEqual for deep comparison

// Re-define necessary types from the component/API or import them if shared
type SummaryMetrics = { /* ... full type definition ... */ };
type TrendPoint = { date: string; count?: number; amount?: number };
type RecentEnrollment = { /* ... full type definition ... */ };
type RecentPayment = { /* ... full type definition ... */ };

type OverviewData = {
  summaryMetrics: any; // Use specific type if available
  enrollmentTrends: TrendPoint[];
  revenueTrends: TrendPoint[];
  recentActivity: {
    enrollments: any[]; // Use specific type if available
    payments: any[]; // Use specific type if available
  };
  performanceSummaries: any; // Use specific type if available
  trendGranularity?: string;
};

// Define filter structure for comparison
interface OverviewFilters {
  dateRange: DateRange | undefined;
  granularity: string;
}

// Define State and Actions
interface DashboardOverviewState {
  data: OverviewData | null;
  isLoading: boolean;
  error: string | null;
  // Store the filters used for the last successful fetch
  lastFetchedFilters: OverviewFilters | null; 
  fetchOverview: (dateRange: DateRange | undefined, granularity: string) => Promise<void>;
}

export const useDashboardOverviewStore = create<DashboardOverviewState>((set, get) => ({
  data: null,
  isLoading: false, // Start with false, set true only when fetching
  error: null,
  lastFetchedFilters: null, // Initialize as null

  fetchOverview: async (dateRange, granularity) => {
    const currentFilters: OverviewFilters = { dateRange, granularity };
    const { lastFetchedFilters, isLoading } = get();

    // Prevent fetch if already loading
    if (isLoading) {
        console.log("DashboardOverviewStore: Already loading, skipping fetch.");
        return;
    }

    // Always fetch when requested - remove the filter comparison that was preventing refreshes
    console.log("DashboardOverviewStore: Fetching data for filters:", currentFilters);

    // --- Proceed with fetch --- 
    console.log("DashboardOverviewStore: Fetching new data...");
    set({ isLoading: true, error: null });

    if (!dateRange?.from || !granularity) {
        console.warn("DashboardOverviewStore: Skipping fetch, missing date range or granularity.");
        set({ isLoading: false, error: "Missing date range or granularity", lastFetchedFilters: null }); // Reset filters on error?
        return;
    }

    try {
      const params = new URLSearchParams();
      params.append('startDate', dateRange.from.toISOString());
      const endDate = dateRange.to || dateRange.from;
      params.append('endDate', endDate.toISOString());
      params.append('granularity', granularity);

      const response = await fetch(`/api/admin/dashboard/overview?${params.toString()}`);
      
      if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Failed to fetch dashboard overview (${response.status})`);
      }
      
      const json: OverviewData = await response.json();
      // Update data AND the last fetched filters on success
      set({ data: json, isLoading: false, error: null, lastFetchedFilters: currentFilters });

    } catch (error: any) {
      console.error("Error fetching dashboard overview:", error);
      toast.error(error.message || "Failed to load dashboard overview");
      // Reset last fetched filters on error so next attempt retries?
      set({ data: null, isLoading: false, error: error.message || 'Unknown error', lastFetchedFilters: null }); 
    }
  },
}));

// Helper function to copy types (or import from a shared location)
// This avoids repeating large type definitions if they exist elsewhere.
// For brevity here, using 'any' as placeholders - replace with actual types. 