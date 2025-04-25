import { create } from 'zustand';
import { DateRange } from 'react-day-picker';

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
  dateRange?: DateRange;
  granularity: Granularity;
  sourcePlatform: SourcePlatformFilter;

  // Status
  isLoading: boolean;
  error: string | null;

  // Actions
  setFilters: (filters: Partial<{ dateRange: DateRange; granularity: Granularity; sourcePlatform: SourcePlatformFilter }>) => void;
  fetchAllRevenueData: () => Promise<void>;
}

export const useRevenueAnalyticsStore = create<RevenueAnalyticsState>((set, get) => ({
  // Initial State
  summary: null,
  trends: [],
  byProduct: [],
  byPaymentMethod: [],
  dateRange: undefined,
  granularity: 'daily',
  sourcePlatform: 'all',
  isLoading: false,
  error: null,

  // Actions
  setFilters: (filters) => {
    set((state) => ({ ...state, ...filters }));
    // queueMicrotask(() => get().fetchAllRevenueData()); // Trigger fetch after state update
  },

  fetchAllRevenueData: async () => {
    set({ isLoading: true, error: null });
    const { dateRange, granularity, sourcePlatform } = get();

    try {
      // --- Determine Date Range (with default) ---
      let effectiveStartDate: Date;
      let effectiveEndDate: Date;

      if (dateRange?.from && dateRange?.to) {
        effectiveStartDate = dateRange.from;
        effectiveEndDate = dateRange.to;
      } else {
        // Default to the last 30 days if no range is set
        effectiveEndDate = new Date();
        effectiveStartDate = new Date();
        effectiveStartDate.setDate(effectiveEndDate.getDate() - 30);
      }
      // Ensure dates are at start/end of day for consistent filtering
      effectiveStartDate.setHours(0, 0, 0, 0);
      effectiveEndDate.setHours(23, 59, 59, 999);
      // -------------------------------------------

      // Build query parameters using effective dates
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
            summaryRes.ok ? null : summaryRes.json(),
            trendsRes.ok ? null : trendsRes.json(),
            byProductRes.ok ? null : byProductRes.json(),
            byPaymentMethodRes.ok ? null : byPaymentMethodRes.json(),
        ]);
        const combinedError = errors.filter(e => e).map(e => e.error || 'Unknown API Error').join('; ');
        throw new Error(`Failed to fetch revenue data: ${combinedError}`);
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