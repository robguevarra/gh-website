'use client';

/**
 * @deprecated This hook is deprecated in favor of useGoogleDriveFiles
 * We're keeping this file for backward compatibility but it's no longer used
 */
import { useCallback, useState } from 'react';
import { type Template } from '@/lib/stores/student-dashboard/types';

/**
 * Hook for fetching templates
 * @deprecated Use useGoogleDriveFiles hook instead
 */
export const useTemplates = ({
  category = 'all',
  searchQuery = '',
  limit = 20,
  initialOffset = 0
}: {
  category?: string;
  searchQuery?: string;
  limit?: number;
  initialOffset?: number;
} = {}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [offset, setOffset] = useState(initialOffset);
  
  // Mock fetch templates function that returns empty data
  const fetchTemplates = useCallback(async () => {
    return { templates: [], total: 0 };
  }, []);
  
  // Mock fetch categories function that returns empty data
  const fetchCategories = useCallback(async () => {
    return [];
  }, []);
  
  // Fetch more templates
  const loadMore = useCallback(() => {
    if (!isLoading && offset < limit) {
      setOffset(prev => prev + limit);
    }
  }, [isLoading, offset, limit]);
  
  // Apply filter
  const applyFilter = useCallback((newCategory: string) => {
    setOffset(0); // Reset pagination
  }, []);
  
  // Apply search
  const applySearch = useCallback((newQuery: string) => {
    setOffset(0); // Reset pagination
  }, []);
  
  // Mock mutate function
  const mutate = useCallback(async () => {
    // No-op function
  }, []);
  
  return {
    templates: [] as Template[],
    total: 0,
    isLoading,
    hasError,
    hasMore: offset < limit,
    loadMore,
    filter: category,
    searchQuery,
    applyFilter,
    applySearch,
    fetchCategories,
    categories: [],
    mutate
  };
};

/**
 * Hook for working with a specific template
 * @deprecated Use useGoogleDriveFiles hook instead
 */
export const useTemplate = (templateId: string) => {
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  
  // Mock fetch template function that returns null
  const fetchTemplate = useCallback(async () => {
    return null;
  }, []);
  
  // Mock track view function
  const trackView = useCallback(async () => {
    // No-op function
  }, []);
  
  // Mock track download function
  const trackDownload = useCallback(async () => {
    // No-op function
  }, []);
  
  // Mock refresh function
  const refresh = useCallback(async () => {
    // No-op function
  }, []);
  
  return {
    template: null as Template | null,
    isLoading,
    hasError,
    trackView,
    trackDownload,
    refresh
  };
};
