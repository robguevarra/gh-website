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
  navigateToFolder: (folderId: string) => void;
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
  console.log('[useGoogleDriveFiles] Resolved Initial Folder ID:', resolvedInitialFolderId);

  const [items, setItems] = useState<DriveItem[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbSegment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  // Initialize state with the resolved ID
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(resolvedInitialFolderId);

  // Create a cache key based on the current folder ID
  const cacheKey = currentFolderId ? `/api/google-drive?folderId=${currentFolderId}` : '/api/google-drive'; // Fetch root if no ID
  console.log('[useGoogleDriveFiles] Cache Key:', cacheKey);

  const fetchDriveData = useCallback(async (url: string) => {
    console.log('[useGoogleDriveFiles] fetchDriveData called with URL:', url);
    // This early return might be problematic if isLoading isn't reset correctly
    // Commenting out for now to ensure fetch always tries
    // if (isLoading) {
    //   console.log('[useGoogleDriveFiles] fetchDriveData returning early due to isLoading=true');
    //   return { items, breadcrumbs }; // Need to ensure items/breadcrumbs are correct here if we re-enable
    // }

    setIsLoading(true);
    setHasError(false);

    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch Google Drive data: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (!data || !Array.isArray(data.items) || !Array.isArray(data.breadcrumbs)) {
        throw new Error('Invalid API response structure');
      }

      setItems(data.items);
      setBreadcrumbs(data.breadcrumbs);

      return { items: data.items, breadcrumbs: data.breadcrumbs };
    } catch (error) {
      console.error('Error fetching Google Drive data:', error);
      setHasError(true);
      return { items: [], breadcrumbs: [] };
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  console.log('[useGoogleDriveFiles] Calling useSWR with key:', cacheKey);
  const { data, error, mutate } = useSWR<{ items: DriveItem[], breadcrumbs: BreadcrumbSegment[] }, Error>(
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

  useEffect(() => {
    console.log('[useGoogleDriveFiles] useEffect triggered. Data:', data, 'Error:', error);
    if (data) {
      setItems(data.items || []);
      setBreadcrumbs(data.breadcrumbs || []);
    }
  }, [data, error]);

  const navigateToFolder = useCallback((folderId: string) => {
    console.log('[useGoogleDriveFiles] Navigating to folder:', folderId);
    if (folderId !== currentFolderId) {
      setIsLoading(true);
      setCurrentFolderId(folderId);
    }
  }, [currentFolderId]);

  const refreshData = useCallback(async () => {
    console.log('[useGoogleDriveFiles] Refreshing data for key:', cacheKey);
    setIsLoading(true);
    await mutate();
  }, [cacheKey, mutate]);

  return {
    items,
    breadcrumbs,
    isLoading,
    hasError,
    currentFolderId,
    navigateToFolder,
    refreshData
  };
};
