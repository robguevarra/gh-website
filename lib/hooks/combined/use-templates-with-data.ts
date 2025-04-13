'use client';

import { useEffect, useMemo } from 'react';
import { useTemplates } from '@/lib/hooks/state/use-templates';
import { useFetchTemplates } from '@/lib/hooks/data/use-fetch-templates';
import { useUserProfile } from '@/lib/hooks/state/use-user-profile';
import { useDebouncedBatch } from '@/lib/hooks/utils/use-debounced-batch';

/**
 * Combined hook for accessing and fetching templates data
 * 
 * This hook combines state access and data fetching for templates.
 * It automatically fetches the templates data if a userId is provided or
 * uses the current authenticated user, and updates the store with the
 * fetched data.
 * 
 * @param options - Configuration options
 * @param options.userId - The ID of the user to fetch templates for (optional)
 * @param options.autoFetch - Whether to automatically fetch the data (default: true)
 * @returns An object containing templates state, loading state, error state, and actions
 * 
 * @example
 * ```tsx
 * // With specific user ID
 * const { 
 *   templates, 
 *   filteredTemplates, 
 *   isLoading, 
 *   error, 
 *   refresh 
 * } = useTemplatesWithData({ userId: '123' });
 * 
 * // With current authenticated user
 * const { 
 *   templates, 
 *   filteredTemplates, 
 *   isLoading, 
 *   error, 
 *   refresh 
 * } = useTemplatesWithData();
 * ```
 */
export function useTemplatesWithData(options?: {
  userId?: string | null;
  autoFetch?: boolean;
}) {
  const { userId: storeUserId } = useUserProfile();
  const debouncedBatch = useDebouncedBatch(300);
  
  const { 
    templates: storeTemplates,
    selectedTemplateId,
    templateFilter,
    templateSearchQuery,
    isLoadingTemplates,
    hasTemplatesError,
    setTemplates,
    setTemplateFilter,
    setTemplateSearchQuery,
    setIsLoadingTemplates,
    setHasTemplatesError,
    getFilteredTemplates,
    filteredTemplates: storeFilteredTemplates
  } = useTemplates();
  
  const { 
    data: fetchedTemplates, 
    isLoading, 
    error, 
    fetchTemplates,
    filter,
    setFilter,
    searchQuery,
    setSearchQuery,
    filteredTemplates: fetchedFilteredTemplates
  } = useFetchTemplates(options?.userId || storeUserId);
  
  // Auto-fetch templates data if autoFetch is true (default)
  useEffect(() => {
    const autoFetch = options?.autoFetch !== false;
    
    if (autoFetch) {
      fetchTemplates();
    }
  }, [options?.userId, storeUserId, fetchTemplates, options?.autoFetch]);
  
  // Update the store when data is fetched
  useEffect(() => {
    if (fetchedTemplates.length > 0) {
      setTemplates(fetchedTemplates);
    }
  }, [fetchedTemplates, setTemplates]);
  
  // Sync filter and search query between hook state and store
  useEffect(() => {
    if (filter !== templateFilter) {
      setTemplateFilter(filter);
    }
  }, [filter, templateFilter, setTemplateFilter]);
  
  useEffect(() => {
    if (searchQuery !== templateSearchQuery) {
      setTemplateSearchQuery(searchQuery);
    }
  }, [searchQuery, templateSearchQuery, setTemplateSearchQuery]);
  
  // Update loading state
  useEffect(() => {
    setIsLoadingTemplates(isLoading);
  }, [isLoading, setIsLoadingTemplates]);
  
  // Update error state
  useEffect(() => {
    setHasTemplatesError(!!error);
  }, [error, setHasTemplatesError]);
  
  // Debounced filter update
  const updateFilter = useCallback((newFilter: string) => {
    debouncedBatch(() => {
      setFilter(newFilter);
      setTemplateFilter(newFilter);
    });
  }, [debouncedBatch, setFilter, setTemplateFilter]);
  
  // Debounced search query update
  const updateSearchQuery = useCallback((newQuery: string) => {
    debouncedBatch(() => {
      setSearchQuery(newQuery);
      setTemplateSearchQuery(newQuery);
    });
  }, [debouncedBatch, setSearchQuery, setTemplateSearchQuery]);
  
  // Refresh function to manually trigger a data fetch
  const refresh = async () => {
    return fetchTemplates();
  };
  
  return useMemo(() => ({
    // Use store data if available, otherwise use fetched data
    templates: storeTemplates.length > 0 ? storeTemplates : fetchedTemplates,
    selectedTemplateId,
    filter: templateFilter,
    searchQuery: templateSearchQuery,
    isLoading: isLoadingTemplates || isLoading,
    error,
    
    // Actions
    setFilter: updateFilter,
    setSearchQuery: updateSearchQuery,
    refresh,
    setSelectedTemplateId,
    
    // Filtered templates
    filteredTemplates: storeFilteredTemplates.length > 0 
      ? storeFilteredTemplates 
      : fetchedFilteredTemplates,
    
    // Convenience getters
    hasTemplates: storeTemplates.length > 0 || fetchedTemplates.length > 0,
    templateCount: storeTemplates.length || fetchedTemplates.length,
    selectedTemplate: storeTemplates.find(t => t.id === selectedTemplateId) || 
      fetchedTemplates.find(t => t.id === selectedTemplateId) || null
  }), [
    storeTemplates,
    fetchedTemplates,
    selectedTemplateId,
    templateFilter,
    templateSearchQuery,
    isLoadingTemplates,
    isLoading,
    error,
    updateFilter,
    updateSearchQuery,
    refresh,
    setSelectedTemplateId,
    storeFilteredTemplates,
    fetchedFilteredTemplates
  ]);
}
