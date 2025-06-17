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
        // First get the unified profile to access membership_level_id
        const { data: unifiedProfile, error: unifiedProfileError } = await supabase
          .from('unified_profiles')
          .select('membership_level_id')
          .eq('id', userId)
          .single();
          
        if (unifiedProfileError) {
          console.error('Error fetching unified profile:', unifiedProfileError);
        }
        
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
        
        // Get membership level data if available
        let membershipLevel = null;
        if (unifiedProfile?.membership_level_id) {
          const { data: membershipData, error: membershipError } = await supabase
            .from('membership_levels')
            .select('id, name, commission_rate')
            .eq('id', unifiedProfile.membership_level_id)
            .single();
            
          if (!membershipError && membershipData) {
            membershipLevel = membershipData;
          } else if (membershipError) {
            console.error('Error fetching membership level:', membershipError);
          }
        }
        
        // Transform database model to UI model
        const profile: AffiliateProfile = {
          id: data.id,
          userId: data.user_id,
          slug: data.slug,
          commissionRate: data.commission_rate, // Keep for backward compatibility
          isMember: data.is_member,
          status: data.status,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
          display_name: data.display_name,
          bio: data.bio,
          website: data.website,
          payout_method: data.payout_method,
          payout_details: data.payout_details,
          email_notifications: data.email_notifications,
          marketing_materials: data.marketing_materials
        };
        
        // Add membership level data if available
        if (membershipLevel) {
          profile.membershipLevel = {
            id: membershipLevel.id,
            name: membershipLevel.name,
            commissionRate: membershipLevel.commission_rate
          };
        }
        
        // Get user details if needed
        if (data.user_id) {
          try {
            const { data: userData, error: userError } = await supabase
              .from('unified_profiles')
              .select('email, first_name, last_name')
              .eq('id', data.user_id)
              .single();
              
            if (!userError && userData) {
              profile.user = {
                email: userData.email,
                name: `${userData.first_name || ''} ${userData.last_name || ''}`.trim(),
              };
            }
          } catch (userError) {
            console.error('Error fetching user details:', userError);
          }
        }
        
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
        let startDate: string | null;
        let endDate: string | null;
        
        if (dateRange === 'custom') {
          startDate = customStartDate;
          endDate = customEndDate;
        } else if (dateRange === 'all') {
          // For "All Time", don't set date restrictions
          startDate = null;
          endDate = null;
        } else {
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
            default:
              // Default to all time if dateRange is not recognized
              startDate = null;
              endDate = null;
              break;
          }
        }
        
        // Fetch affiliate profile if we don't have it
        if (!state.affiliateProfile) {
          await state.loadAffiliateProfile(userId);
        }
        
        // Get fresh state after profile loading
        const currentState = get();
        
        // Check if profile loading failed - if so, user is not an affiliate
        if (currentState.hasProfileError) {
          console.log('User is not an affiliate, skipping metrics loading');
          set({
            isLoadingMetrics: false,
            hasMetricsError: false,
            metrics: null
          });
          return;
        }
        
        const affiliateId = currentState.affiliateProfile?.id;
        
        if (!affiliateId) {
          console.log('No affiliate profile available, skipping metrics loading');
          set({
            isLoadingMetrics: false,
            hasMetricsError: false,
            metrics: null
          });
          return;
        }
        
        // Validate that we have valid dates before making API call (except for "All Time")
        if (dateRange !== 'all' && (!startDate || !endDate)) {
          throw new Error('Invalid date range: start_date and end_date are required');
        }

        // Make API request to get metrics - using the format expected by our API
        const requestBody: any = {
          referral_link_id: referralLinkId || undefined,
          group_by: 'day' // Default to daily grouping
        };
        
        // Only add date_range if we have specific dates (not "All Time")
        if (startDate && endDate) {
          requestBody.date_range = {
            start_date: startDate,
            end_date: endDate
          };
        }
        
        const response = await fetch('/api/affiliate/metrics', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
          throw new Error(`Error fetching metrics: ${response.statusText}`);
        }
        
        const responseData = await response.json();
        
        // Add comprehensive logging for debugging
        console.log('📊 STORE ACTIONS DEBUG - Metrics API Response:');
        console.log('- Raw API Response:', responseData);
        console.log('- Summary Data:', responseData.summary);
        console.log('- Data Points Count:', responseData.data_points?.length || 0);
        
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
        
        console.log('🔄 STORE ACTIONS DEBUG - Transformed Metrics:');
        console.log('- Total Clicks:', transformedMetrics.totalClicks);
        console.log('- Total Conversions:', transformedMetrics.totalConversions);
        console.log('- Total Earnings:', transformedMetrics.totalEarnings);
        console.log('- Conversion Rate:', transformedMetrics.conversionRate);
        console.log('- Average Order Value:', transformedMetrics.averageOrderValue);
        console.log('- Earnings Per Click:', transformedMetrics.earningsPerClick);
        console.log('- Daily Data Points:', transformedMetrics.timeRanges.daily.length);
        
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
        
        // Get fresh state after profile loading
        const currentState = get();
        
        // Check if profile loading failed - if so, user is not an affiliate
        if (currentState.hasProfileError) {
          console.log('User is not an affiliate, skipping referral links loading');
          set({
            isLoadingReferralLinks: false,
            hasReferralLinksError: false,
            referralLinks: []
          });
          return;
        }
        
        const profile = currentState.affiliateProfile;
        
        if (!profile || !profile.slug) {
          console.log('No affiliate profile or slug available, skipping referral links loading');
          set({
            isLoadingReferralLinks: false,
            hasReferralLinksError: false,
            referralLinks: []
          });
          return;
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
        // Call API endpoint to get payout transactions and projections
        const response = await fetch('/api/affiliate/payouts', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          throw new Error(`Error fetching payouts: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Add comprehensive logging for debugging
        console.log('💰 STORE ACTIONS DEBUG - Payouts API Response:');
        console.log('- Raw API Response:', data);
        console.log('- Transactions Count:', data.transactions?.length || 0);
        console.log('- Raw Transactions:', data.transactions);
        console.log('- Projection Data:', data.projection);
        
        // Transform API response to UI model
        const transactions: PayoutTransaction[] = data.transactions.map((transaction: any) => ({
          id: transaction.id,
          amount: transaction.amount,
          status: transaction.status,
          created_at: transaction.created_at,
          processed_at: transaction.processed_at,
          reference: transaction.reference,
          type: 'Payment', // Default type
          datePending: transaction.created_at,
          dateCleared: transaction.processed_at,
          datePaid: transaction.status === 'paid' ? transaction.processed_at : null,
          paymentMethod: transaction.payout_method,
          paymentDetails: transaction.batch_id ? { batch_id: transaction.batch_id } : {},
          notes: transaction.processing_notes,
          fee_amount: transaction.fee_amount,
          net_amount: transaction.net_amount,
          xendit_disbursement_id: transaction.xendit_disbursement_id
        }));
        
        console.log('🔄 STORE ACTIONS DEBUG - Transformed Payouts:');
        console.log('- Transactions Count:', transactions.length);
        console.log('- Transformed Transactions:', transactions);
        
        // Update state with transactions
        set({
          payoutTransactions: transactions,
          isLoadingPayouts: false,
          lastPayoutsLoadTime: Date.now()
        });
        
        // Update projection data if available
        if (data.projection) {
          set({
            payoutProjection: {
              thisMonth: data.projection.pending_amount || 0,
              nextMonth: data.projection.estimated_next_payout || 0,
              nextPayout: data.projection.estimated_next_payout || 0,
              nextPayoutDate: data.projection.next_payout_date,
              estimatedNextAmount: data.projection.estimated_next_payout || 0,
              estimatedPayoutDate: data.projection.next_payout_date,
              pendingConversions: 0, // Will be calculated from other data
              minimumPayoutThreshold: data.projection.threshold_amount || 100,
              progressToThreshold: Math.min(100, ((data.projection.pending_amount || 0) / (data.projection.threshold_amount || 100)) * 100)
            }
          });
        }
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
        
        // Get fresh state after profile loading
        const currentState = get();
        
        // Check if profile loading failed - if so, user is not an affiliate
        if (currentState.hasProfileError) {
          console.log('User is not an affiliate, skipping payout projection loading');
          return;
        }
        
        const affiliateId = currentState.affiliateProfile?.id;
        
        if (!affiliateId) {
          console.log('No affiliate profile available, skipping payout projection loading');
          return;
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
