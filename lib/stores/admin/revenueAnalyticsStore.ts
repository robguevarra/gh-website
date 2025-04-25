import { create } from 'zustand';
// REMOVE: DateRange type import no longer needed here
// import { DateRange } from 'react-day-picker';
// IMPORT: Shared store to read its state
import { useSharedDashboardFiltersStore } from './sharedDashboardFiltersStore';

// Types matching API responses (adjust if API types differ)
interface RevenueSummary {
  totalRevenue: number;
  totalTransactions: number;
  averageTransactionValue: number;
}

interface RevenueTrendPoint {
  date: string;
  revenue: number;
}

interface ProductRevenue {
  product_identifier: string;
  product_name: string;
  source_platform: 'xendit' | 'shopify';
  total_revenue: number;
  units_sold: number;
  average_transaction_value: number;
}

interface PaymentMethodRevenue {
  payment_method: string;
  source_platform: 'xendit' | 'shopify';
  total_revenue: number;
  transaction_count: number;
}

type Granularity = 'daily' | 'weekly' | 'monthly';
type SourcePlatformFilter = 'all' | 'xendit' | 'shopify';

interface RevenueAnalyticsState {
  // Data
  summary: RevenueSummary | null;
  trends: RevenueTrendPoint[];
  byProduct: ProductRevenue[];
  byPaymentMethod: PaymentMethodRevenue[];

  // Filters
  // REMOVE: dateRange filter managed by shared store
  // dateRange?: DateRange;
  granularity: Granularity;
  sourcePlatform: SourcePlatformFilter;

  // Status
  isLoading: boolean;
  error: string | null;

  // Actions
  // UPDATE: setFilters no longer handles dateRange
  setFilters: (filters: Partial<{ granularity: Granularity; sourcePlatform: SourcePlatformFilter }>) => void;
  fetchAllRevenueData: () => Promise<void>;
}

export const useRevenueAnalyticsStore = create<RevenueAnalyticsState>((set, get) => ({
  // Initial State
  summary: null,
  trends: [],
  byProduct: [],
  byPaymentMethod: [],
  // REMOVE: dateRange initial state
  // dateRange: undefined, 
  granularity: 'daily',
  sourcePlatform: 'all',
  isLoading: false,
  error: null,

  // Actions
  setFilters: (filters) => {
    // Only set granularity and sourcePlatform
    set((state) => ({ 
      ...state, 
      ...(filters.granularity !== undefined && { granularity: filters.granularity }),
      ...(filters.sourcePlatform !== undefined && { sourcePlatform: filters.sourcePlatform }),
    }));
    // REMOVE: Fetch trigger moved to component effect
    // queueMicrotask(() => get().fetchAllRevenueData()); 
  },

  fetchAllRevenueData: async () => {
    set({ isLoading: true, error: null });
    // READ: Granularity/source from local state, Date range from shared store
    const { granularity, sourcePlatform } = get();
    const { dateRange: sharedDateRange } = useSharedDashboardFiltersStore.getState();

    // VALIDATE: Ensure shared date range is valid
    if (!sharedDateRange?.from) {
        const errorMsg = "Cannot fetch revenue data: Shared date range is missing or invalid.";
        console.error(errorMsg, sharedDateRange);
        set({ isLoading: false, error: errorMsg });
        return;
    }
    const effectiveStartDate = sharedDateRange.from;
    // Use start date if end date is missing (though shared store initializes both)
    const effectiveEndDate = sharedDateRange.to || effectiveStartDate; 
    
    // REMOVE: Old date range logic with default fallback
    // try {
    //   // --- Determine Date Range (with default) ---
    //   let effectiveStartDate: Date;
    //   let effectiveEndDate: Date;
    // 
    //   if (dateRange?.from && dateRange?.to) {
    //     effectiveStartDate = dateRange.from;
    //     effectiveEndDate = dateRange.to;
    //   } else {
    //     // Default to the last 30 days if no range is set
    //     effectiveEndDate = new Date();
    //     effectiveStartDate = new Date();
    //     effectiveStartDate.setDate(effectiveEndDate.getDate() - 30);
    //   }
    //   // Ensure dates are at start/end of day for consistent filtering
    //   effectiveStartDate.setHours(0, 0, 0, 0);
    //   effectiveEndDate.setHours(23, 59, 59, 999);
    //   // -------------------------------------------

    try {
      // Build query parameters using validated shared dates
      const params = new URLSearchParams();
      params.set('startDate', effectiveStartDate.toISOString());
      params.set('endDate', effectiveEndDate.toISOString());
      params.set('granularity', granularity); // For trends endpoint
      if (sourcePlatform !== 'all') params.set('sourcePlatform', sourcePlatform);

      const trendsParams = new URLSearchParams(params); // Trends needs granularity
      const commonParams = new URLSearchParams(params); // Others don't
      commonParams.delete('granularity');

      // Fetch all data concurrently
      const [summaryRes, trendsRes, byProductRes, byPaymentMethodRes] = await Promise.all([
          fetch(`/api/admin/revenue/summary?${commonParams.toString()}`),
          fetch(`/api/admin/revenue/trends?${trendsParams.toString()}`),
          fetch(`/api/admin/revenue/by-product?${commonParams.toString()}`),
          fetch(`/api/admin/revenue/by-payment-method?${commonParams.toString()}`),
      ]);

      // Check for errors in responses
      if (!summaryRes.ok || !trendsRes.ok || !byProductRes.ok || !byPaymentMethodRes.ok) {
        const errors = await Promise.all([
            summaryRes.ok ? null : summaryRes.json().catch(() => ({ error: 'Failed to parse summary error' })),
            trendsRes.ok ? null : trendsRes.json().catch(() => ({ error: 'Failed to parse trends error' })),
            byProductRes.ok ? null : byProductRes.json().catch(() => ({ error: 'Failed to parse by-product error' })),
            byPaymentMethodRes.ok ? null : byPaymentMethodRes.json().catch(() => ({ error: 'Failed to parse by-payment-method error' })),
        ]);
        const combinedError = errors.filter(e => e).map(e => e.error || 'Unknown API Error').join('; ');
        throw new Error(`Failed to fetch revenue data: ${combinedError || 'Network or parsing error'}`);
      }

      // Parse JSON data
      const [summaryData, trendsData, byProductData, byPaymentMethodData] = await Promise.all([
        summaryRes.json(),
        trendsRes.json(),
        byProductRes.json(),
        byPaymentMethodRes.json(),
      ]);

      // Update state
      set({
        summary: summaryData,
        trends: trendsData,
        byProduct: byProductData,
        byPaymentMethod: byPaymentMethodData,
        isLoading: false,
        error: null,
      });

    } catch (error: any) {
      console.error("Error fetching revenue data:", error);
      set({ isLoading: false, error: error.message || 'An unknown error occurred' });
    }
  },
})); 