'use client';

import { useCallback, useRef } from 'react';
import { batch } from '@/lib/stores/student-dashboard/batch-middleware';

/**
 * Custom hook for debounced batching of state updates
 * 
 * This hook combines debouncing and batching to optimize state updates
 * that happen frequently, such as search inputs or filters.
 * 
 * @param delay - The debounce delay in milliseconds (default: 300ms)
 * @returns A function to debounce and batch state updates
 * 
 * @example
 * ```tsx
 * const debouncedBatch = useDebouncedBatch(500);
 * 
 * // Handle search input changes
 * const handleSearchChange = (e) => {
 *   const value = e.target.value;
 *   
 *   // This will only run once after 500ms of inactivity
 *   debouncedBatch(() => {
 *     setSearchQuery(value);
 *     setIsSearching(true);
 *     loadSearchResults(value);
 *   });
 * };
 * ```
 */
export function useDebouncedBatch(delay: number = 300) {
  // Use a ref to store the timeout ID
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Return a memoized function to debounce and batch updates
  return useCallback((callback: () => void) => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Set a new timeout
    timeoutRef.current = setTimeout(() => {
      // Batch the updates when the timeout expires
      batch(callback);
      
      // Clear the timeout ref
      timeoutRef.current = null;
    }, delay);
  }, [delay]);
}
