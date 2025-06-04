/**
 * Custom hooks for accessing specific slices of the affiliate dashboard store
 * These hooks use selectors to prevent unnecessary re-renders
 *
 * State Management Patterns:
 * 1. Selector Functions - Use selector functions to access only the state needed
 * 2. State Isolation - Each hook accesses only the state it needs
 * 3. Performance Monitoring - Development-mode tracking to identify bottlenecks
 * 4. Equality Checking - Uses shallow equality checking for state comparison
 */

import { useEffect, useRef, useMemo } from 'react'

// Import the affiliate dashboard store and types
import { useAffiliateDashboardStore } from '@/lib/stores/affiliate-dashboard'
import { AffiliateProfile, AffiliateMetrics, ReferralLink, PayoutTransaction, PayoutProjection, UpdateProfileData } from '@/lib/stores/affiliate-dashboard/types'

/**
 * Enhanced performance monitoring function that logs renders in development
 * with detailed information about the component and render cause
 */
const logRender = (hookName: string): void => {
  if (process.env.NODE_ENV === 'development') {
    // Use a ref to track render count across renders
    const renderCount = useRef(0)
    renderCount.current++

    // Get the component stack trace to identify which component is using this hook
    const stackTrace = new Error().stack || ''
    const callerComponent = stackTrace.split('\n')
      .slice(2, 3) // Get the caller component from the stack trace
      .map(line => line.trim())
      .join('')

    // Track previous state to detect changes
    const prevStateRef = useRef<any>(null)

    // Get current state
    const currentState = useAffiliateDashboardStore.getState()

    // Compare with previous state if available
    if (prevStateRef.current) {
      const changedKeys = Object.keys(currentState as Record<string, any>).filter(key => {
        // Skip functions
        if (typeof (currentState as Record<string, any>)[key] === 'function') return false
        return JSON.stringify((currentState as Record<string, any>)[key]) !== JSON.stringify((prevStateRef.current as Record<string, any>)[key])
      })
    }

    // Update previous state reference
    prevStateRef.current = { ...currentState }

    // Log warning if components render too many times
    if (renderCount.current > 5) {
      console.warn(`[WARNING] ${hookName} has rendered ${renderCount.current} times. This may indicate a performance issue.`)
      console.warn(`[WARNING] Component: ${callerComponent}`)
    }

    // Use effect for cleanup only
    useEffect(() => {
      // Return cleanup function to help with debugging
      return () => {
        console.log(`[Performance] ${hookName} unmounted after ${renderCount.current} renders`)
      }
    }, []) // Empty dependency array to ensure this only runs once
  }
}

/**
 * Hook for affiliate profile data
 */
export function useAffiliateProfileData() {
  // Monitor hook performance in development
  logRender('useAffiliateProfileData')

  // Get state values using individual selectors to prevent unnecessary re-renders
  const affiliateProfile = useAffiliateDashboardStore(state => state.affiliateProfile)
  const isLoadingProfile = useAffiliateDashboardStore(state => state.isLoadingProfile)
  const hasProfileError = useAffiliateDashboardStore(state => state.hasProfileError)

  // Get actions separately as they don't need to trigger re-renders
  const loadAffiliateProfile = useAffiliateDashboardStore(state => state.loadAffiliateProfile)
  const setAffiliateProfile = useAffiliateDashboardStore(state => state.setAffiliateProfile)

  // Custom profile update action
  const updateAffiliateProfile = async (profileData: UpdateProfileData): Promise<void> => {
    if (!affiliateProfile?.id) {
      throw new Error('No affiliate ID available')
    }

    try {
      // Call API to update profile
      const response = await fetch('/api/affiliate/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: affiliateProfile.id,
          ...profileData
        })
      })

      if (!response.ok) {
        throw new Error(`Error updating profile: ${response.statusText}`)
      }

      const data = await response.json()

      // Update profile in store
      setAffiliateProfile({
        ...affiliateProfile,
        ...profileData
      })

      return data
    } catch (error) {
      console.error('Error updating profile:', error)
      throw error
    }
  }

  // Use useMemo to return a stable object reference
  return useMemo(() => ({
    affiliateProfile,
    isLoadingProfile,
    hasProfileError,
    loadAffiliateProfile,
    setAffiliateProfile,
    updateAffiliateProfile
  }), [affiliateProfile, isLoadingProfile, hasProfileError, loadAffiliateProfile, setAffiliateProfile])
}

/**
 * Hook for affiliate metrics data
 */
export function useAffiliateMetricsData() {
  // Monitor hook performance in development
  logRender('useAffiliateMetricsData')

  // Get state values using individual selectors
  const metrics = useAffiliateDashboardStore(state => state.metrics)
  const isLoadingMetrics = useAffiliateDashboardStore(state => state.isLoadingMetrics)
  const hasMetricsError = useAffiliateDashboardStore(state => state.hasMetricsError)
  const filterState = useAffiliateDashboardStore(state => state.filterState)
  const dateRangeOptions = useAffiliateDashboardStore(state => state.dateRangeOptions)

  // Get actions separately
  const loadAffiliateMetrics = useAffiliateDashboardStore(state => state.loadAffiliateMetrics)
  const setFilterDateRange = useAffiliateDashboardStore(state => state.setFilterDateRange)
  const setFilterCustomDateRange = useAffiliateDashboardStore(state => state.setFilterCustomDateRange)
  const setFilterReferralLinkId = useAffiliateDashboardStore(state => state.setFilterReferralLinkId)
  const getCurrentDateRangeLabel = useAffiliateDashboardStore(state => state.getCurrentDateRangeLabel)
  const getFilteredMetrics = useAffiliateDashboardStore(state => state.getFilteredMetrics)

  // Use useMemo to return a stable object reference
  return useMemo(() => ({
    metrics,
    isLoadingMetrics,
    hasMetricsError,
    filterState,
    dateRangeOptions,
    loadAffiliateMetrics,
    setFilterDateRange,
    setFilterCustomDateRange,
    setFilterReferralLinkId,
    getCurrentDateRangeLabel,
    getFilteredMetrics
  }), [
    metrics,
    isLoadingMetrics,
    hasMetricsError,
    filterState,
    dateRangeOptions,
    loadAffiliateMetrics,
    setFilterDateRange,
    setFilterCustomDateRange,
    setFilterReferralLinkId,
    getCurrentDateRangeLabel,
    getFilteredMetrics
  ])
}

/**
 * Hook for referral links data
 */
export function useReferralLinksData() {
  // Monitor hook performance in development
  logRender('useReferralLinksData')

  // Get state values using individual selectors
  const referralLinks = useAffiliateDashboardStore(state => state.referralLinks)
  const isLoadingReferralLinks = useAffiliateDashboardStore(state => state.isLoadingReferralLinks)
  const hasReferralLinksError = useAffiliateDashboardStore(state => state.hasReferralLinksError)
  const selectedReferralLinkId = useAffiliateDashboardStore(state => state.selectedReferralLinkId)
  const showQRModal = useAffiliateDashboardStore(state => state.showQRModal)
  const selectedLinkForQR = useAffiliateDashboardStore(state => state.selectedLinkForQR)

  // Get actions separately
  const loadReferralLinks = useAffiliateDashboardStore(state => state.loadReferralLinks)
  const setSelectedReferralLinkId = useAffiliateDashboardStore(state => state.setSelectedReferralLinkId)
  const createReferralLink = useAffiliateDashboardStore(state => state.createReferralLink)
  const setShowQRModal = useAffiliateDashboardStore(state => state.setShowQRModal)
  const setSelectedLinkForQR = useAffiliateDashboardStore(state => state.setSelectedLinkForQR)
  const getReferralLinkById = useAffiliateDashboardStore(state => state.getReferralLinkById)

  // Use useMemo to return a stable object reference
  return useMemo(() => ({
    referralLinks,
    isLoadingReferralLinks,
    hasReferralLinksError,
    selectedReferralLinkId,
    showQRModal,
    selectedLinkForQR,
    loadReferralLinks,
    setSelectedReferralLinkId,
    createReferralLink,
    setShowQRModal,
    setSelectedLinkForQR,
    getReferralLinkById
  }), [
    referralLinks,
    isLoadingReferralLinks,
    hasReferralLinksError,
    selectedReferralLinkId,
    showQRModal,
    selectedLinkForQR,
    loadReferralLinks,
    setSelectedReferralLinkId,
    createReferralLink,
    setShowQRModal,
    setSelectedLinkForQR,
    getReferralLinkById
  ])
}

/**
 * Hook for payout data
 */
export function usePayoutsData() {
  // Monitor hook performance in development
  logRender('usePayoutsData')

  // Get state values using individual selectors
  const payoutTransactions = useAffiliateDashboardStore(state => state.payoutTransactions)
  const isLoadingPayouts = useAffiliateDashboardStore(state => state.isLoadingPayouts)
  const hasPayoutsError = useAffiliateDashboardStore(state => state.hasPayoutsError)
  const payoutProjection = useAffiliateDashboardStore(state => state.payoutProjection)

  // Get actions separately
  const loadPayoutTransactions = useAffiliateDashboardStore(state => state.loadPayoutTransactions)
  const loadPayoutProjection = useAffiliateDashboardStore(state => state.loadPayoutProjection)

  // Use useMemo to return a stable object reference
  return useMemo(() => ({
    payoutTransactions,
    isLoadingPayouts,
    hasPayoutsError,
    payoutProjection,
    loadPayoutTransactions,
    loadPayoutProjection
  }), [
    payoutTransactions,
    isLoadingPayouts,
    hasPayoutsError,
    payoutProjection,
    loadPayoutTransactions,
    loadPayoutProjection
  ])
}

/**
 * Hook for UI state
 */
export function useAffiliateDashboardUI() {
  // Monitor hook performance in development
  logRender('useAffiliateDashboardUI')

  // Get state values using individual selectors
  const activeDashboardTab = useAffiliateDashboardStore(state => state.activeDashboardTab)
  const expandedSections = useAffiliateDashboardStore(state => state.expandedSections)

  // Get actions separately
  const setActiveDashboardTab = useAffiliateDashboardStore(state => state.setActiveDashboardTab)
  const toggleSection = useAffiliateDashboardStore(state => state.toggleSection)
  const clearAffiliateState = useAffiliateDashboardStore(state => state.clearAffiliateState)

  // Use useMemo to return a stable object reference
  return useMemo(() => ({
    activeDashboardTab,
    expandedSections,
    setActiveDashboardTab,
    toggleSection,
    clearAffiliateState
  }), [
    activeDashboardTab,
    expandedSections,
    setActiveDashboardTab,
    toggleSection,
    clearAffiliateState
  ])
}

/**
 * Main hook for loading all affiliate dashboard data
 */
export function useAffiliateDashboard(userId: string | null) {
  // Get loading actions
  const loadAffiliateProfile = useAffiliateDashboardStore(state => state.loadAffiliateProfile)
  const loadAffiliateMetrics = useAffiliateDashboardStore(state => state.loadAffiliateMetrics)
  const loadReferralLinks = useAffiliateDashboardStore(state => state.loadReferralLinks)
  const loadPayoutTransactions = useAffiliateDashboardStore(state => state.loadPayoutTransactions)
  const loadPayoutProjection = useAffiliateDashboardStore(state => state.loadPayoutProjection)
  
  // Effect to load all data when user ID changes
  useEffect(() => {
    const loadAllData = async () => {
      if (!userId) return

      try {
        // Load profile first as other data depends on it
        await loadAffiliateProfile(userId)
        
        // Load other data in parallel
        await Promise.all([
          loadAffiliateMetrics(userId),
          loadReferralLinks(userId),
          loadPayoutTransactions(userId),
          loadPayoutProjection(userId)
        ])
      } catch (error) {
        console.error('Error loading affiliate dashboard data:', error)
      }
    }
    
    loadAllData()
  }, [userId, loadAffiliateProfile, loadAffiliateMetrics, loadReferralLinks, loadPayoutTransactions, loadPayoutProjection])
  
  return useMemo(() => ({
    loadAllData: async (force: boolean = false) => {
      if (!userId) return
      
      try {
        // Load profile first as other data depends on it
        await loadAffiliateProfile(userId, force)
        
        // Load other data in parallel
        await Promise.all([
          loadAffiliateMetrics(userId, {}, force),
          loadReferralLinks(userId, force),
          loadPayoutTransactions(userId, force),
          loadPayoutProjection(userId, force)
        ])
      } catch (error) {
        console.error('Error loading affiliate dashboard data:', error)
      }
    }
  }), [userId, loadAffiliateProfile, loadAffiliateMetrics, loadReferralLinks, loadPayoutTransactions, loadPayoutProjection])
}
