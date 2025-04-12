'use client';

import { useState, useEffect, useCallback } from 'react';
import useSWR from 'swr';
import type { DriveItem, BreadcrumbSegment } from '@/lib/google-drive/driveApiUtils';

export interface UseGoogleDriveDataOptions {
  initialFolderId?: string;
}

export interface UseGoogleDriveDataResult {
  items: DriveItem[];
  breadcrumbs: BreadcrumbSegment[];
  isLoading: boolean;
  hasError: boolean;
  currentFolderId: string | null;
  navigateToFolder: (folderId: string | null) => void;
  refreshData: () => Promise<void>;
}

/**
 * Hook for fetching folder contents and breadcrumbs from Google Drive API endpoint.
 */
export const useGoogleDriveFiles = (options: UseGoogleDriveDataOptions = {}): UseGoogleDriveDataResult => {
  // Determine the initial folder ID inside the function body
  const { initialFolderId: inputFolderId } = options;
  const defaultRootId = process.env.NEXT_PUBLIC_GOOGLE_DRIVE_ROOT_FOLDER_ID || null;
  // Use provided ID, otherwise fallback to ENV var or null
  const resolvedInitialFolderId = inputFolderId ?? defaultRootId;

  const [items, setItems] = useState<DriveItem[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbSegment[]>([]);
  const [hasError, setHasError] = useState(false);
  // Initialize state with the resolved ID
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(resolvedInitialFolderId);

  // Create a cache key based on the current folder ID
  const cacheKey = currentFolderId ? `/api/google-drive?folderId=${currentFolderId}` : '/api/google-drive'; // Fetch root if no ID

  const fetchDriveData = useCallback(async (url: string) => {
    // Reset error state before fetch
    setHasError(false);

    try {
      const response = await fetch(url);

      if (!response.ok) {
        console.error(`[useGoogleDriveFiles] Fetch failed with status: ${response.status}`);
        throw new Error(`Failed to fetch data: ${response.statusText}`);
      }

      const result = await response.json();
      return result; // Return the fetched data

    } catch (fetchError: any) {
      console.error('[useGoogleDriveFiles] fetchDriveData error:', fetchError.message || fetchError);
      setHasError(true);
      // Re-throw the error so SWR can catch it and populate its 'error' state
      throw fetchError; 
    }
  }, []); // Dependencies removed as we don't need local state like isLoading here

  const { data, error, mutate, isValidating } = useSWR<
    { items: DriveItem[], breadcrumbs: BreadcrumbSegment[] }, 
    Error
  >(
    cacheKey, 
    fetchDriveData, 
    {
      revalidateOnFocus: false,
      revalidateOnMount: true,
      revalidateOnReconnect: false,
      refreshWhenHidden: false,
      refreshWhenOffline: false,
      dedupingInterval: 5000,
      shouldRetryOnError: false,
      keepPreviousData: true,
    }
  );

  // Determine loading state: 
  // It's loading if there's no data AND no error yet, OR if SWR is validating (re-fetching)
  const isLoading = (!data && !error) || isValidating;

  useEffect(() => {
    if (data) {
      setItems(data.items || []);
      setBreadcrumbs(data.breadcrumbs || []);
      // Reset error if data is successfully loaded
      if (hasError) setHasError(false);
    } 
    // SWR sets its 'error' state if fetchDriveData throws an error
    if (error && !hasError) {
      setHasError(true);
    }
    // Only trigger error state update if the error state changes
  }, [data, error, hasError]);

  const navigateToFolder = useCallback((folderId: string | null) => {
    // Check if the target folder ID is different from the current one
    if (folderId !== currentFolderId) {
      setCurrentFolderId(folderId); // Accept string or null
    }
  }, [currentFolderId]); // Dependency remains currentFolderId

  const refreshData = useCallback(async () => {
    // Don't set isLoading manually, SWR will handle it via isValidating
    await mutate(); // Revalidate the data for the current cacheKey
  }, [mutate]); // Removed cacheKey dependency as mutate captures it

  return {
    items,
    breadcrumbs,
    isLoading, // Return the derived loading state
    hasError, // Return error state derived from SWR error or fetch issues
    currentFolderId,
    navigateToFolder,
    refreshData,
  };
};
