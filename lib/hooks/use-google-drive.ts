'use client';

import { useState, useEffect, useCallback } from 'react';
import useSWR from 'swr';

export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  thumbnailLink?: string;
  size?: string;
  fileExtension?: string;
  createdTime?: string;
  modifiedTime?: string;
  description?: string;
}

export interface UseGoogleDriveFilesOptions {
  category?: string;
  searchQuery?: string;
  limit?: number;
  initialOffset?: number;
}

export interface UseGoogleDriveFilesResult {
  files: GoogleDriveFile[];
  categories: string[];
  isLoading: boolean;
  hasError: boolean;
  hasMore: boolean;
  total: number;
  loadMore: () => void;
  applyFilter: (category: string) => void;
  applySearch: (query: string) => void;
  refreshFiles: () => Promise<void>;
}

/**
 * Hook for fetching files directly from Google Drive
 */
export const useGoogleDriveFiles = ({
  category = 'all',
  searchQuery = '',
  limit = 20,
  initialOffset = 0
}: UseGoogleDriveFilesOptions = {}): UseGoogleDriveFilesResult => {
  const [files, setFiles] = useState<GoogleDriveFile[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [offset, setOffset] = useState(initialOffset);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const [activeCategory, setActiveCategory] = useState(category);
  const [activeSearchQuery, setActiveSearchQuery] = useState(searchQuery);

  // Create a cache key that includes all variables that should trigger a refetch
  const cacheKey = `google-drive-files:${activeCategory}:${activeSearchQuery}:${limit}:${offset}`;

  // Fetcher function for SWR
  const fetchFiles = useCallback(async () => {
    // Don't prevent initial fetching, only prevent concurrent fetches
    if (isLoading && files.length > 0) return { files, total, categories };
    
    try {
      setIsLoading(true);
      setHasError(false);

      // Build the API URL with query parameters
      const queryParams = new URLSearchParams();
      if (activeCategory && activeCategory !== 'all') {
        queryParams.append('category', activeCategory);
      }
      if (activeSearchQuery) {
        queryParams.append('search', activeSearchQuery);
      }
      queryParams.append('limit', limit.toString());
      queryParams.append('offset', offset.toString());

      const response = await fetch(`/api/google-drive?${queryParams.toString()}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch Google Drive files: ${response.status}`);
      }

      const data = await response.json();
      
      // Extract categories from files
      let extractedCategories: string[] = [];
      if (data.files && Array.isArray(data.files) && data.files.length > 0) {
        extractedCategories = Array.from(
          new Set(
            data.files
              .filter((file: GoogleDriveFile) => {
                // Extract category from MIME type or use a default categorization
                return true; // Include all files
              })
              .map((file: GoogleDriveFile) => {
                // Map MIME types to user-friendly categories
                const mimeType = file.mimeType || '';
                if (mimeType.includes('spreadsheet')) return 'Spreadsheets';
                if (mimeType.includes('document')) return 'Documents';
                if (mimeType.includes('presentation')) return 'Presentations';
                if (mimeType.includes('pdf')) return 'PDFs';
                if (mimeType.includes('image')) return 'Images';
                return 'Other';
              })
          )
        ) as string[];

        setCategories(extractedCategories);
      }

      // If this is the first page, replace files; otherwise append
      const newFiles = offset === 0 
        ? data.files || [] 
        : [...files, ...(data.files || []).filter((f: GoogleDriveFile) => 
            !files.some(ef => ef.id === f.id)
          )];
      
      setFiles(newFiles);
      setTotal(data.total || newFiles.length);
      setHasMore((data.files || []).length === limit && (offset + (data.files || []).length) < (data.total || 0));
      
      return { 
        files: newFiles, 
        total: data.total || newFiles.length,
        categories: extractedCategories
      };
    } catch (error) {
      console.error('Error fetching Google Drive files:', error);
      setHasError(true);
      return { files, total, categories }; // Return current state on error
    } finally {
      setIsLoading(false);
    }
  }, [activeCategory, activeSearchQuery, limit, offset]); // Removed 'files' from dependencies

  // Use SWR for data fetching
  const { mutate } = useSWR(cacheKey, fetchFiles, {
    revalidateOnFocus: false,
    revalidateOnMount: true, // Ensure it fetches on mount
    revalidateOnReconnect: false,
    refreshWhenHidden: false,
    refreshWhenOffline: false,
    dedupingInterval: 10000, // 10 seconds - allow more frequent fetches during development
    shouldRetryOnError: false
  });

  // Load more files
  const loadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      setOffset(prev => prev + limit);
    }
  }, [isLoading, hasMore, limit]);

  // Apply category filter
  const applyFilter = useCallback((newCategory: string) => {
    setActiveCategory(newCategory);
    setOffset(0); // Reset pagination
  }, []);

  // Apply search filter
  const applySearch = useCallback((query: string) => {
    setActiveSearchQuery(query);
    setOffset(0); // Reset pagination
  }, []);

  // Refresh files
  const refreshFiles = useCallback(async () => {
    await mutate();
  }, [mutate]);

  // Initial fetch when component mounts or when key parameters change
  useEffect(() => {
    // Force fetch on mount and when category/search changes
    fetchFiles();
  }, [activeCategory, activeSearchQuery]); // Fetch when these change

  return {
    files,
    categories,
    isLoading,
    hasError,
    hasMore,
    total,
    loadMore,
    applyFilter,
    applySearch,
    refreshFiles
  };
};
