/**
 * Affiliate Dashboard Store Actions
 * 
 * This file contains all the actions (state manipulations and API calls)
 * for the affiliate dashboard store.
 */
import { type StateCreator } from 'zustand';
import { type AffiliateDashboardStore } from './index';
import { createBrowserClient } from '@supabase/ssr';

// Import types
import {
  AffiliateProfile,
  AffiliateMetrics,
  ReferralLink,
  PayoutTransaction,
  PayoutProjection,
  DateRangeFilter
} from './types';

// Initialize Supabase client
const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * Create all actions for the affiliate dashboard store
 */
export const createActions = (
  set: any,
  get: any,
  api: any
): Partial<AffiliateDashboardStore> => {
  // Cache validity duration (in milliseconds)
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  return {
    /**
     * Load the affiliate profile for the specified user
     */
    loadAffiliateProfile: async (userId: string, force: boolean = false): Promise<void> => {
      const state = get();
      
      // Skip loading if data is already loading
      if (state.isLoadingProfile) {
        return;
      }
      
      // Check if we have cached data that's still valid
      const hasValidCache = !force && 
        state.affiliateProfile && 
        state.lastProfileLoadTime && 
        (Date.now() - state.lastProfileLoadTime < CACHE_DURATION);
      
      if (hasValidCache) {
        return;
      }
      
      // Set loading state
      set({ 
        isLoadingProfile: true,
        hasProfileError: false
      });
      
      try {
        // Call the API to get affiliate profile
        const { data, error } = await supabase
          .from('affiliates')
          .select('*')
          .eq('user_id', userId)
          .single();
        
        if (error) {
          throw error;
        }
        
        if (!data) {
          throw new Error('No affiliate profile found');
        }
        
        // Transform database model to UI model
        const profile: AffiliateProfile = {
          id: data.id,
          userId: data.user_id,
          slug: data.slug,
          commissionRate: data.commission_rate,
          isMember: data.is_member,
          status: data.status,
          createdAt: data.created_at,
          updatedAt: data.updated_at
        };
        
        // Update state with the loaded profile
        set({
          affiliateProfile: profile,
          isLoadingProfile: false,
          lastProfileLoadTime: Date.now()
        });
      } catch (error) {
        console.error('Error loading affiliate profile:', error);
        set({
          isLoadingProfile: false,
          hasProfileError: true
        });
      }
    },
    
    /**
     * Load affiliate metrics with optional filtering
     */
    loadAffiliateMetrics: async (
      userId: string,
      options: {
        dateRange?: DateRangeFilter;
        startDate?: string;
        endDate?: string;
        referralLinkId?: string | null;
      } = {},
      force: boolean = false
    ): Promise<void> => {
      const state = get();
      
      // Skip loading if already loading
      if (state.isLoadingMetrics) {
        return;
      }
      
      // Update filter state if options are provided
      if (options.dateRange) {
        state.setFilterDateRange(options.dateRange);
      }
      
      if (options.startDate && options.endDate) {
        state.setFilterCustomDateRange(options.startDate, options.endDate);
      }
      
      if (options.referralLinkId !== undefined) {
        state.setFilterReferralLinkId(options.referralLinkId);
      }
      
      // Check if we have valid cached data
      const hasValidCache = !force && 
        state.metrics && 
        state.lastMetricsLoadTime &&
        (Date.now() - state.lastMetricsLoadTime < CACHE_DURATION);
      
      if (hasValidCache) {
        return;
      }
      
      // Set loading state
      set({
        isLoadingMetrics: true,
        hasMetricsError: false
      });
      
      try {
        // Extract filter values from state
        const { dateRange, customStartDate, customEndDate, referralLinkId } = state.filterState;
        
        // Calculate date range based on filter
        let startDate = customStartDate;
        let endDate = customEndDate;
        
        if (dateRange !== 'custom') {
          const now = new Date();
          endDate = now.toISOString().split('T')[0];
          
          switch (dateRange) {
            case 'today':
              startDate = endDate;
              break;
            case 'yesterday':
              const yesterday = new Date(now);
              yesterday.setDate(now.getDate() - 1);
              startDate = yesterday.toISOString().split('T')[0];
              endDate = startDate;
              break;
            case '7days':
              const sevenDaysAgo = new Date(now);
              sevenDaysAgo.setDate(now.getDate() - 7);
              startDate = sevenDaysAgo.toISOString().split('T')[0];
              break;
            case '30days':
              const thirtyDaysAgo = new Date(now);
              thirtyDaysAgo.setDate(now.getDate() - 30);
              startDate = thirtyDaysAgo.toISOString().split('T')[0];
              break;
            case '90days':
              const ninetyDaysAgo = new Date(now);
              ninetyDaysAgo.setDate(now.getDate() - 90);
              startDate = ninetyDaysAgo.toISOString().split('T')[0];
              break;
          }
        }
        
        // Fetch affiliate profile if we don't have it
        if (!state.affiliateProfile) {
          await state.loadAffiliateProfile(userId);
        }
        
        const affiliateId = state.affiliateProfile?.id;
        
        if (!affiliateId) {
          throw new Error('No affiliate ID available');
        }
        
        // Make API request to get metrics - using the format expected by our API
        const response = await fetch('/api/affiliate/metrics', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            date_range: {
              start_date: startDate,
              end_date: endDate
            },
            referral_link_id: referralLinkId || undefined,
            group_by: 'day' // Default to daily grouping
          })
        });
        
        if (!response.ok) {
          throw new Error(`Error fetching metrics: ${response.statusText}`);
        }
        
        const responseData = await response.json();
        
        // Transform the snake_case API response to camelCase for the frontend
        const transformedMetrics = {
          totalClicks: responseData.summary?.total_clicks || 0,
          totalConversions: responseData.summary?.total_conversions || 0,
          totalEarnings: responseData.summary?.total_commission || 0, // Commission is earnings
          conversionRate: responseData.summary?.conversion_rate || 0,
          averageOrderValue: responseData.summary?.total_revenue && responseData.summary.total_conversions > 0 
            ? responseData.summary.total_revenue / responseData.summary.total_conversions 
            : 0,
          earningsPerClick: responseData.summary?.earnings_per_click || 0,
          timeRanges: {
            daily: (responseData.data_points || []).map((point: any) => ({
              date: point.date,
              clicks: point.clicks || 0,
              conversions: point.conversions || 0,
              earnings: point.commission || 0
            })),
            weekly: [], // We'll populate these if needed later
            monthly: []
          },
          topPerformingLinks: [], // Populate from another API call if needed
          recentActivity: [], // Populate from another API call if needed
          lastUpdated: new Date().toISOString()
        };
        
        // Log the transformation for debugging
        console.log('API response data:', responseData);
        console.log('Transformed metrics:', transformedMetrics);
        
        // Update state with transformed metrics
        set({
          metrics: transformedMetrics,
          isLoadingMetrics: false,
          lastMetricsLoadTime: Date.now()
        });
      } catch (error) {
        console.error('Error loading metrics:', error);
        set({
          isLoadingMetrics: false,
          hasMetricsError: true
        });
      }
    },
    
    /**
     * Load affiliate referral links
     */
    loadReferralLinks: async (userId: string, force: boolean = false): Promise<void> => {
      const state = get();
      
      // Skip if already loading
      if (state.isLoadingReferralLinks) {
        return;
      }
      
      // Check for valid cache
      const hasValidCache = !force && 
        state.referralLinks.length > 0 && 
        state.lastReferralLinksLoadTime &&
        (Date.now() - state.lastReferralLinksLoadTime < CACHE_DURATION);
      
      if (hasValidCache) {
        return;
      }
      
      // Set loading state
      set({
        isLoadingReferralLinks: true,
        hasReferralLinksError: false
      });
      
      try {
        // Fetch affiliate profile if we don't have it
        if (!state.affiliateProfile) {
          await state.loadAffiliateProfile(userId);
        }
        
        // We already have the affiliate info in the profile, no need for additional API calls
        // Just create a single referral link based on the affiliate slug
        const profile = state.affiliateProfile;
        
        if (!profile || !profile.slug) {
          throw new Error('No affiliate profile or slug available');
        }
        
        // Create a single referral link for Papers to Profits using the affiliate slug
        // Using type assertion to ensure TypeScript recognizes all properties
        const singleLink = {
          id: profile.id, // Use affiliate ID as the link ID
          slug: profile.slug,
          productName: 'Papers to Profits',
          fullUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/papers-to-profits?a=${profile.slug}`,
          createdAt: profile.createdAt,
          // We don't have these metrics at this time, but keeping the structure
          clicks: 0,
          conversions: 0,
          earnings: 0,
          conversionRate: 0
        } as ReferralLink;
        
        const links: ReferralLink[] = [singleLink];
        
        // Update state with the single link
        set({
          referralLinks: links,
          isLoadingReferralLinks: false,
          lastReferralLinksLoadTime: Date.now(),
          selectedReferralLinkId: links[0].id // Always select the only link
        });
      } catch (error) {
        console.error('Error creating referral link:', error);
        set({
          isLoadingReferralLinks: false,
          hasReferralLinksError: true
        });
      }
    },
    
    /**
     * Load payout transactions
     */
    loadPayoutTransactions: async (userId: string, force: boolean = false): Promise<void> => {
      const state = get();
      
      // Skip if already loading
      if (state.isLoadingPayouts) {
        return;
      }
      
      // Check for valid cache
      const hasValidCache = !force && 
        state.payoutTransactions.length > 0 && 
        state.lastPayoutsLoadTime &&
        (Date.now() - state.lastPayoutsLoadTime < CACHE_DURATION);
      
      if (hasValidCache) {
        return;
      }
      
      // Set loading state
      set({
        isLoadingPayouts: true,
        hasPayoutsError: false
      });
      
      try {
        // Fetch affiliate profile if we don't have it
        if (!state.affiliateProfile) {
          await state.loadAffiliateProfile(userId);
        }
        
        const affiliateId = state.affiliateProfile?.id;
        
        if (!affiliateId) {
          throw new Error('No affiliate ID available');
        }
        
        // Call API to get payout transactions
        const { data, error } = await supabase
          .from('affiliate_payouts')
          .select('*, affiliate_payout_items(conversion_id)')
          .eq('affiliate_id', affiliateId)
          .order('created_at', { ascending: false });
        
        if (error) {
          throw error;
        }
        
        // Transform to UI model
        const transactions: PayoutTransaction[] = data.map(payout => ({
          id: payout.id,
          amount: payout.amount,
          status: payout.status,
          datePending: payout.created_at,
          dateCleared: payout.cleared_at,
          datePaid: payout.paid_at,
          conversionIds: payout.affiliate_payout_items.map((item: any) => item.conversion_id),
          referenceId: payout.reference_id,
          notes: payout.notes
        }));
        
        // Update state with transactions
        set({
          payoutTransactions: transactions,
          isLoadingPayouts: false,
          lastPayoutsLoadTime: Date.now()
        });
        
        // Also load the payout projection
        await state.loadPayoutProjection(userId);
      } catch (error) {
        console.error('Error loading payout transactions:', error);
        set({
          isLoadingPayouts: false,
          hasPayoutsError: true
        });
      }
    },
    
    /**
     * Load payout projection data
     */
    loadPayoutProjection: async (userId: string, force: boolean = false): Promise<void> => {
      const state = get();
      
      try {
        // Fetch affiliate profile if needed
        if (!state.affiliateProfile) {
          await state.loadAffiliateProfile(userId);
        }
        
        const affiliateId = state.affiliateProfile?.id;
        
        if (!affiliateId) {
          throw new Error('No affiliate ID available');
        }
        
        // Call API to get payout projection
        const response = await fetch('/api/affiliate/payouts/projection', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ affiliateId })
        });
        
        if (!response.ok) {
          throw new Error(`Error fetching payout projection: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Update state with projection
        set({
          payoutProjection: {
            estimatedNextAmount: data.estimatedAmount,
            estimatedPayoutDate: data.estimatedDate,
            pendingConversions: data.pendingConversions,
            minimumPayoutThreshold: data.minimumThreshold,
            progressToThreshold: Math.min(100, (data.estimatedAmount / data.minimumThreshold) * 100)
          }
        });
      } catch (error) {
        console.error('Error loading payout projection:', error);
        // Don't set error state as this is a secondary feature
      }
    }
  };
};
