/**
 * Performance Utilities
 * 
 * This module provides utilities for monitoring and optimizing performance
 * in the application, particularly for data-heavy admin pages.
 */

import { cache } from 'react';
import { UserSearchParams } from '@/types/admin-types';

// Cache key generator for user search
export const getUserSearchCacheKey = (params: UserSearchParams): string => {
  return `user-search:${JSON.stringify(params)}`;
};

// Cache duration in seconds
const CACHE_DURATION = {
  SHORT: 60, // 1 minute
  MEDIUM: 300, // 5 minutes
  LONG: 3600, // 1 hour
};

/**
 * Performance monitoring wrapper for server functions
 * Logs execution time and can be used to identify slow operations
 */
export const withPerformanceMonitoring = async <T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<T> => {
  const startTime = performance.now();
  
  try {
    const result = await operation();
    
    const endTime = performance.now();
    const executionTime = endTime - startTime;
    
    // Log performance metrics
    console.log(`[Performance] ${operationName}: ${executionTime.toFixed(2)}ms`);
    
    // Log warning if operation is slow
    if (executionTime > 1000) {
      console.warn(`[Performance Warning] ${operationName} took ${executionTime.toFixed(2)}ms to complete`);
    }
    
    return result;
  } catch (error) {
    const endTime = performance.now();
    console.error(`[Performance Error] ${operationName} failed after ${(endTime - startTime).toFixed(2)}ms:`, error);
    throw error;
  }
};

/**
 * Cached version of the user search function
 * Uses React's cache function to avoid redundant database queries
 */
export const createCachedUserSearch = <T>(
  searchFunction: (params: UserSearchParams) => Promise<T>
) => {
  return cache(async (params: UserSearchParams): Promise<T> => {
    return await withPerformanceMonitoring(
      () => searchFunction(params),
      `cachedUserSearch:${getUserSearchCacheKey(params)}`
    );
  });
};

/**
 * Determines if a request should use cached data based on headers
 */
export const shouldUseCache = (headers: Headers): boolean => {
  // Don't use cache for requests that explicitly want fresh data
  if (headers.get('x-refresh-data') === 'true') {
    return false;
  }
  
  // Use cache by default for GET requests
  return true;
};

/**
 * Optimizes page size based on device type
 * Returns smaller page sizes for mobile devices to improve performance
 */
export const getOptimizedPageSize = (userAgent?: string | null): number => {
  if (!userAgent) return 10; // Default page size
  
  // Check if mobile device
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  
  if (isMobile) {
    return 5; // Smaller page size for mobile
  }
  
  return 10; // Default page size for desktop
};
