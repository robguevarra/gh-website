'use client';

import { useCourseStore } from '@/lib/stores/course';
import { useStudentDashboardStore } from '@/lib/stores/student-dashboard';

/**
 * Utility functions for managing view transitions between admin and student views
 * These functions help prevent conflicts when switching between different views
 */

/**
 * Clears caches that might conflict when transitioning to the admin view
 * Call this when mounting admin components
 */
export function prepareForAdminView() {
  // Get the course store instance
  const courseStore = useCourseStore.getState();
  
  // Clear any potentially conflicting cache
  if (courseStore.clearCache) {
    console.log('🧹 [ViewTransition] Clearing course store cache for admin view');
    courseStore.clearCache();
  }
  
  // Clear session storage items that might be stale
  if (typeof window !== 'undefined') {
    // We don't want to clear the admin store itself, just check for any old format stores
    const oldStoreKey = 'course-store';
    if (sessionStorage.getItem(oldStoreKey)) {
      console.log('🧹 [ViewTransition] Removing legacy course store from session storage');
      sessionStorage.removeItem(oldStoreKey);
    }
  }
}

/**
 * Clears caches that might conflict when transitioning to the student view
 * Call this when mounting student dashboard components
 */
export function prepareForStudentView() {
  // Get the dashboard store instance
  const dashboardStore = useStudentDashboardStore.getState();
  
  // Clear any potentially conflicting cache in the admin store
  const courseStore = useCourseStore.getState();
  if (courseStore.clearCache) {
    console.log('🧹 [ViewTransition] Clearing course store cache for student view');
    courseStore.clearCache();
  }
  
  // Clear session storage items that might be stale
  if (typeof window !== 'undefined') {
    // We don't want to clear the student dashboard store, just check for any old format stores
    const oldStoreKey = 'course-store';
    if (sessionStorage.getItem(oldStoreKey)) {
      console.log('🧹 [ViewTransition] Removing legacy course store from session storage');
      sessionStorage.removeItem(oldStoreKey);
    }
  }
}

/**
 * Checks if there are any potential conflicts between admin and student views
 * @returns Object with conflict information
 */
export function checkViewConflicts() {
  if (typeof window === 'undefined') {
    return { hasConflicts: false };
  }
  
  const adminStoreKey = 'admin-course-editor-store';
  const studentStoreKey = 'student-dashboard-storage';
  
  const hasAdminStore = !!sessionStorage.getItem(adminStoreKey);
  const hasStudentStore = !!localStorage.getItem(studentStoreKey);
  const hasLegacyStore = !!sessionStorage.getItem('course-store');
  
  return {
    hasConflicts: hasLegacyStore,
    hasAdminStore,
    hasStudentStore,
    hasLegacyStore
  };
}
