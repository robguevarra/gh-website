import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { subscriptionTrackingMiddleware, performanceMiddleware } from './middleware';
import { batchMiddleware } from './batch-middleware';
import { equalityMiddleware } from './equality-middleware';
import { createActions } from './actions';

// Import types
import {
  AffiliateProfile,
  AffiliateMetrics,
  ReferralLink,
  PayoutTransaction,
  PayoutProjection,
  ConversionRecord,
  FilterState,
  DateRangeFilter,
} from './types';

/**
 * Clean up old localStorage data with invalid date ranges
 */
function cleanupOldPersistedData() {
  try {
    const storedData = localStorage.getItem('affiliate-dashboard-storage');
    if (storedData) {
      const parsed = JSON.parse(storedData);
      if (parsed?.state?.filterState?.dateRange && 
          !['thisMonth', 'last3Months', 'all'].includes(parsed.state.filterState.dateRange)) {
        console.log('🔄 Clearing old affiliate dashboard data with invalid date range:', parsed.state.filterState.dateRange);
        localStorage.removeItem('affiliate-dashboard-storage');
      }
    }
  } catch (error) {
    console.warn('Failed to clean up old affiliate dashboard data:', error);
    // If there's any error parsing, just clear it to be safe
    localStorage.removeItem('affiliate-dashboard-storage');
  }
}

// Clean up old data before creating the store
if (typeof window !== 'undefined') {
  cleanupOldPersistedData();
}

/**
 * Affiliate Dashboard Store
 *
 * This store manages all state related to the affiliate dashboard experience,
 * including affiliate profile, performance metrics, referral links, and payouts.
 *
 * State Management Patterns:
 * 1. State Isolation - Each component only subscribes to the state it needs
 * 2. Performance Optimization - Custom hooks with memoized selectors prevent unnecessary re-renders
 * 3. Persistence - Critical state is persisted in localStorage
 * 4. Performance Monitoring - Development mode includes performance tracking
 */
export interface AffiliateDashboardStore {
  // Profile State
  affiliateProfile: AffiliateProfile | null;
  isLoadingProfile: boolean;
  hasProfileError: boolean;
  lastProfileLoadTime: number | null;

  // Metrics State
  metrics: AffiliateMetrics | null;
  isLoadingMetrics: boolean;
  hasMetricsError: boolean;
  lastMetricsLoadTime: number | null;

  // Referral Links State
  referralLinks: ReferralLink[];
  isLoadingReferralLinks: boolean;
  hasReferralLinksError: boolean;
  selectedReferralLinkId: string | null;
  lastReferralLinksLoadTime: number | null;

  // QR Code State
  showQRModal: boolean;
  selectedLinkForQR: string | null;
  
  // Payouts State
  payoutTransactions: PayoutTransaction[];
  isLoadingPayouts: boolean;
  hasPayoutsError: boolean;
  payoutProjection: PayoutProjection | null;
  lastPayoutsLoadTime: number | null;

  // Conversions State
  conversions: ConversionRecord[];
  isLoadingConversions: boolean;
  hasConversionsError: boolean;
  lastConversionsLoadTime: number | null;

  // Filters and UI State
  filterState: FilterState;
  activeDashboardTab: 'overview' | 'links' | 'payouts' | 'settings';
  expandedSections: Record<string, boolean>;
  dateRangeOptions: Array<{
    id: DateRangeFilter;
    label: string;
  }>;

  // Data Loading Actions
  loadAffiliateProfile: (userId: string, force?: boolean) => Promise<void>;
  loadAffiliateMetrics: (userId: string, options?: {
    dateRange?: DateRangeFilter;
    startDate?: string;
    endDate?: string;
    referralLinkId?: string | null;
  }, force?: boolean) => Promise<void>;
  loadReferralLinks: (userId: string, force?: boolean) => Promise<void>;
  loadPayoutTransactions: (userId: string, force?: boolean) => Promise<void>;
  loadPayoutProjection: (userId: string, force?: boolean) => Promise<void>;
  loadConversions: (userId: string, force?: boolean) => Promise<void>;
  createReferralLink: (userId: string, linkData: {
    name: string;
    utmSource: string;
    utmMedium: string;
    utmCampaign: string;
    utmContent?: string | null;
  }) => Promise<ReferralLink | null>;
  
  // Clear user state action
  clearAffiliateState: () => void;

  // Profile actions
  setAffiliateProfile: (profile: AffiliateProfile | null) => void;
  setIsLoadingProfile: (isLoading: boolean) => void;
  setHasProfileError: (hasError: boolean) => void;

  // Metrics actions
  setMetrics: (metrics: AffiliateMetrics | null) => void;
  setIsLoadingMetrics: (isLoading: boolean) => void;
  setHasMetricsError: (hasError: boolean) => void;

  // Referral Links actions
  setReferralLinks: (links: ReferralLink[]) => void;
  setIsLoadingReferralLinks: (isLoading: boolean) => void;
  setHasReferralLinksError: (hasError: boolean) => void;
  setSelectedReferralLinkId: (id: string | null) => void;

  // QR Code actions
  setShowQRModal: (show: boolean) => void;
  setSelectedLinkForQR: (id: string | null) => void;

  // Payouts actions
  setPayoutTransactions: (transactions: PayoutTransaction[]) => void;
  setIsLoadingPayouts: (isLoading: boolean) => void;
  setHasPayoutsError: (hasError: boolean) => void;
  setPayoutProjection: (projection: PayoutProjection | null) => void;

  // Conversions actions
  setConversions: (conversions: ConversionRecord[]) => void;
  setIsLoadingConversions: (isLoading: boolean) => void;
  setHasConversionsError: (hasError: boolean) => void;

  // Filter and UI actions
  setFilterDateRange: (dateRange: DateRangeFilter) => void;
  setFilterCustomDateRange: (startDate: string | null, endDate: string | null) => void;
  setFilterReferralLinkId: (id: string | null) => void;
  setActiveDashboardTab: (tab: 'overview' | 'links' | 'payouts' | 'settings') => void;
  toggleSection: (sectionId: string) => void;

  // Utility functions
  getFilteredMetrics: () => AffiliateMetrics | null;
  getReferralLinkById: (id: string) => ReferralLink | undefined;
  getCurrentDateRangeLabel: () => string;
}

/**
 * Define and create the affiliate dashboard store with middlewares
 */
export const useAffiliateDashboardStore = create<AffiliateDashboardStore>()(
  // Apply tracking middleware in development
  subscriptionTrackingMiddleware(
  // Apply performance middleware
  performanceMiddleware(
  // Apply equality checking to prevent unnecessary updates
  equalityMiddleware(
  // Apply batch processing for related state updates
  batchMiddleware(
  // Apply persistence for selected state values
  persist(
    // Set closure with store implementation
    (set, get, api) => ({
      // Initial state values
      affiliateProfile: null,
      isLoadingProfile: false,
      hasProfileError: false,
      lastProfileLoadTime: null,

      metrics: null,
      isLoadingMetrics: false,
      hasMetricsError: false,
      lastMetricsLoadTime: null,

      referralLinks: [],
      isLoadingReferralLinks: false,
      hasReferralLinksError: false,
      selectedReferralLinkId: null,
      lastReferralLinksLoadTime: null,

      showQRModal: false,
      selectedLinkForQR: null,

      payoutTransactions: [],
      isLoadingPayouts: false,
      hasPayoutsError: false,
      payoutProjection: null,
      lastPayoutsLoadTime: null,

      filterState: {
        dateRange: 'all',
        customStartDate: null,
        customEndDate: null,
        referralLinkId: null,
        utm: {
          source: null,
          medium: null,
          campaign: null,
          content: null
        }
      },
      activeDashboardTab: 'overview',
      expandedSections: {
        'performance-metrics': true,
        'top-links': true,
        'recent-payouts': true
      },
      dateRangeOptions: [
        { id: 'thisMonth', label: 'This Month' },
        { id: 'last3Months', label: 'Last 3 Months' },
        { id: 'all', label: 'All Time' }
      ],

      // Import all actions from actions.ts
      ...createActions(set, get, api),

      // Add setters for each state value that needs direct access
      setAffiliateProfile: (profile) => set({ affiliateProfile: profile }),
      setIsLoadingProfile: (isLoading) => set({ isLoadingProfile: isLoading }),
      setHasProfileError: (hasError) => set({ hasProfileError: hasError }),

      setMetrics: (metrics) => set({ metrics }),
      setIsLoadingMetrics: (isLoading) => set({ isLoadingMetrics: isLoading }),
      setHasMetricsError: (hasError) => set({ hasMetricsError: hasError }),

      setReferralLinks: (links) => set({ referralLinks: links }),
      setIsLoadingReferralLinks: (isLoading) => set({ isLoadingReferralLinks: isLoading }),
      setHasReferralLinksError: (hasError) => set({ hasReferralLinksError: hasError }),
      setSelectedReferralLinkId: (id) => set({ selectedReferralLinkId: id }),

      setShowQRModal: (show) => set({ showQRModal: show }),
      setSelectedLinkForQR: (id) => set({ selectedLinkForQR: id }),

      setPayoutTransactions: (transactions) => set({ payoutTransactions: transactions }),
      setIsLoadingPayouts: (isLoading) => set({ isLoadingPayouts: isLoading }),
      setHasPayoutsError: (hasError) => set({ hasPayoutsError: hasError }),
      setPayoutProjection: (projection) => set({ payoutProjection: projection }),

      setFilterDateRange: (dateRange) => set((state) => ({
        filterState: {
          ...state.filterState,
          dateRange
        }
      })),

      setFilterCustomDateRange: (startDate, endDate) => set((state) => ({
        filterState: {
          ...state.filterState,
          customStartDate: startDate,
          customEndDate: endDate
        }
      })),

      setFilterReferralLinkId: (id) => set((state) => ({
        filterState: {
          ...state.filterState,
          referralLinkId: id
        }
      })),

      setActiveDashboardTab: (tab) => set({ activeDashboardTab: tab }),

      toggleSection: (sectionId) => set((state) => ({
        expandedSections: {
          ...state.expandedSections,
          [sectionId]: !state.expandedSections[sectionId]
        }
      })),

      // Utility functions
      getFilteredMetrics: () => {
        // Implementation will be in actions.ts
        // For now, just return the metrics
        return get().metrics;
      },

      getReferralLinkById: (id) => {
        return get().referralLinks.find(link => link.id === id);
      },

      getCurrentDateRangeLabel: () => {
        const { dateRange } = get().filterState;
        const option = get().dateRangeOptions.find(opt => opt.id === dateRange);
        return option?.label || 'Unknown Range';
      },

      // Implement clearAffiliateState to reset store state
      clearAffiliateState: () => set({
        affiliateProfile: null,
        metrics: null,
        referralLinks: [],
        payoutTransactions: [],
        payoutProjection: null,
        selectedReferralLinkId: null,
        lastProfileLoadTime: null,
        lastMetricsLoadTime: null,
        lastReferralLinksLoadTime: null,
        lastPayoutsLoadTime: null,
      })
    }),
    {
      name: 'affiliate-dashboard-storage',
      // Only persist non-sensitive data that improves user experience on reload
      partialize: (state) => ({
        filterState: state.filterState,
        activeDashboardTab: state.activeDashboardTab,
        expandedSections: state.expandedSections,
        selectedReferralLinkId: state.selectedReferralLinkId
      })
    }
  )))))
);
