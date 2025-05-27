/**
 * User Preferences - Local Storage Utilities
 * 
 * This module provides utilities for persisting user preferences
 * related to dashboard display settings and onboarding state.
 */

// Storage keys
const WELCOME_MODAL_KEY = 'gh_welcome_modal_shown'
const ONBOARDING_TOUR_KEY = 'gh_onboarding_tour_shown'
const ANNOUNCEMENT_KEY = 'gh_announcement_dismissed'

/**
 * Interface for dashboard UI state preferences
 */
export interface DashboardUIPreferences {
  showWelcomeModal: boolean
  showOnboarding: boolean
  showAnnouncement: boolean
}

/**
 * Check if welcome modal has been shown
 */
export function hasSeenWelcomeModal(): boolean {
  if (typeof window === 'undefined') return false
  
  return localStorage.getItem(WELCOME_MODAL_KEY) === 'true'
}

/**
 * Mark welcome modal as shown
 */
export function markWelcomeModalShown(): void {
  if (typeof window === 'undefined') return
  
  localStorage.setItem(WELCOME_MODAL_KEY, 'true')
}

/**
 * Check if onboarding tour has been shown
 */
export function hasSeenOnboardingTour(): boolean {
  if (typeof window === 'undefined') return false
  
  return localStorage.getItem(ONBOARDING_TOUR_KEY) === 'true'
}

/**
 * Mark onboarding tour as shown
 */
export function markOnboardingTourShown(): void {
  if (typeof window === 'undefined') return
  
  localStorage.setItem(ONBOARDING_TOUR_KEY, 'true')
}

/**
 * Check if announcement has been dismissed
 */
export function hasAnnouncementBeenDismissed(): boolean {
  if (typeof window === 'undefined') return false
  
  return localStorage.getItem(ANNOUNCEMENT_KEY) === 'true'
}

/**
 * Mark announcement as dismissed
 */
export function markAnnouncementDismissed(): void {
  if (typeof window === 'undefined') return
  
  localStorage.setItem(ANNOUNCEMENT_KEY, 'true')
}

/**
 * Get dashboard UI preferences from localStorage
 */
export function getDashboardUIPreferences(): DashboardUIPreferences {
  // Set default values for first-time users
  const defaults: DashboardUIPreferences = {
    showWelcomeModal: true,
    showOnboarding: false, // Will be set to true after welcome modal closes
    showAnnouncement: true
  }
  
  if (typeof window === 'undefined') return defaults
  
  return {
    showWelcomeModal: !hasSeenWelcomeModal(),
    showOnboarding: !hasSeenOnboardingTour() && hasSeenWelcomeModal(),
    showAnnouncement: !hasAnnouncementBeenDismissed()
  }
}

/**
 * Reset all user preferences (for testing)
 */
export function resetAllPreferences(): void {
  if (typeof window === 'undefined') return
  
  localStorage.removeItem(WELCOME_MODAL_KEY)
  localStorage.removeItem(ONBOARDING_TOUR_KEY)
  localStorage.removeItem(ANNOUNCEMENT_KEY)
}
