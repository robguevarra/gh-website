'use client';

import { useCallback } from 'react';
import { batch } from '@/lib/stores/student-dashboard/batch-middleware';

/**
 * Custom hook for batching state updates
 * 
 * This hook provides a function to batch multiple state updates into a single update,
 * which reduces the number of re-renders caused by sequential state changes.
 * 
 * @returns A function to batch state updates
 * 
 * @example
 * ```tsx
 * const batchUpdates = useBatchUpdates();
 * 
 * // Batch multiple updates together
 * const handleSubmit = () => {
 *   batchUpdates(() => {
 *     setIsLoading(true);
 *     setData(newData);
 *     setError(null);
 *   });
 * };
 * ```
 */
export function useBatchUpdates() {
  // Return a memoized function to batch updates
  return useCallback((callback: () => void) => {
    batch(callback);
  }, []);
}
