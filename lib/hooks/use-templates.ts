'use client';

import { useCallback, useState } from 'react';
import useSWR from 'swr';
import { getBrowserClient } from '@/lib/supabase/client';
import { useStudentDashboardStore } from '@/lib/stores/student-dashboard';
import { type Template } from '@/lib/stores/student-dashboard/types';

/**
 * Hook for fetching templates
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
  const supabase = getBrowserClient();
  const {
    userId,
    templates,
    templateFilter,
    templateSearchQuery,
    isLoadingTemplates,
    hasTemplatesError,
    setTemplates,
    setIsLoadingTemplates,
    setHasTemplatesError,
    setTemplateFilter,
    setTemplateSearchQuery,
    getFilteredTemplates
  } = useStudentDashboardStore();
  
  const [offset, setOffset] = useState(initialOffset);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  
  // Create a cache key that includes all variables that should trigger a refetch
  const cacheKey = userId ? `templates:${userId}:${category}:${searchQuery}:${limit}:${offset}` : null;
  
  // Fetcher function for SWR
  const fetchTemplates = useCallback(async () => {
    if (!userId) return { templates: [], total: 0 };
    
    try {
      setIsLoadingTemplates(true);
      
      let query = supabase
        .from('templates')
        .select('*', { count: 'exact' })
        .eq('is_public', true);
      
      // Apply category filter if provided and not 'all'
      if (category && category !== 'all') {
        query = query.eq('category', category);
      }
      
      // Apply search filter if provided
      if (searchQuery) {
        query = query.ilike('name', `%${searchQuery}%`);
      }
      
      // Apply pagination
      query = query.range(offset, offset + limit - 1).order('created_at', { ascending: false });
      
      const { data, error, count } = await query;
      
      if (error) throw error;
      
      // Transform the data to match our Template type
      const templateResults: Template[] = (data || []).map(template => ({
        id: template.id,
        name: template.name,
        type: template.type,
        category: template.category,
        size: template.size,
        thumbnail: template.thumbnail,
        downloads: template.downloads,
        googleDriveId: template.google_drive_id,
        description: template.description || '',
        createdAt: template.created_at,
        updatedAt: template.updated_at
      }));
      
      // If this is the first page, replace templates; otherwise append
      const newTemplates = offset === 0 
        ? templateResults 
        : [...templates, ...templateResults.filter(t => !templates.some(et => et.id === t.id))];
      
      setTemplates(newTemplates);
      setTotal(count || 0);
      setHasMore(templateResults.length === limit && (offset + templateResults.length) < (count || 0));
      
      return { templates: newTemplates, total: count || 0 };
    } catch (error) {
      console.error('Error fetching templates:', error);
      setHasTemplatesError(true);
      throw error;
    } finally {
      setIsLoadingTemplates(false);
    }
  }, [userId, category, searchQuery, limit, offset, templates, supabase, setIsLoadingTemplates, setHasTemplatesError, setTemplates]);
  
  // Use SWR for data fetching
  const { data, error, isValidating, mutate } = useSWR(
    cacheKey,
    fetchTemplates,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000, // 30 seconds
    }
  );
  
  // Fetch template categories
  const fetchCategories = useCallback(async () => {
    if (!userId) return [];
    
    try {
      const { data, error } = await supabase
        .from('templates')
        .select('category')
        .eq('is_public', true)
        .order('category', { ascending: true });
        
      if (error) throw error;
      
      // Extract unique categories
      return [...new Set(data.map(item => item.category))];
    } catch (error) {
      console.error('Error fetching template categories:', error);
      return [];
    }
  }, [userId, supabase]);
  
  // Fetch more templates
  const loadMore = useCallback(() => {
    if (!isLoadingTemplates && hasMore) {
      setOffset(prev => prev + limit);
    }
  }, [isLoadingTemplates, hasMore, limit]);
  
  // Apply filter
  const applyFilter = useCallback((newCategory: string) => {
    setTemplateFilter(newCategory);
    setOffset(0); // Reset pagination
    mutate(); // Trigger a refetch
  }, [setTemplateFilter, mutate]);
  
  // Apply search
  const applySearch = useCallback((newQuery: string) => {
    setTemplateSearchQuery(newQuery);
    setOffset(0); // Reset pagination
    mutate(); // Trigger a refetch
  }, [setTemplateSearchQuery, mutate]);
  
  return {
    templates: data?.templates || templates,
    filteredTemplates: getFilteredTemplates(),
    total: data?.total || total,
    isLoading: isLoadingTemplates || isValidating,
    hasError: hasTemplatesError || !!error,
    hasMore,
    loadMore,
    filter: templateFilter,
    searchQuery: templateSearchQuery,
    applyFilter,
    applySearch,
    fetchCategories,
    refresh: mutate
  };
};

/**
 * Hook for working with a specific template
 */
export const useTemplate = (templateId: string) => {
  const supabase = getBrowserClient();
  const { templates } = useStudentDashboardStore();
  
  // Check if template is in the store
  const cachedTemplate = templates.find(t => t.id === templateId);
  
  // Create a cache key for this specific template
  const cacheKey = templateId ? `template:${templateId}` : null;
  
  // Fetcher function for SWR
  const fetchTemplate = useCallback(async () => {
    if (!templateId) return null;
    
    try {
      const { data, error } = await supabase
        .from('templates')
        .select('*')
        .eq('id', templateId)
        .single();
        
      if (error) {
        if (error.code === 'PGRST116') {
          // Template not found
          return null;
        }
        throw error;
      }
      
      if (!data) return null;
      
      return {
        id: data.id,
        name: data.name,
        type: data.type,
        category: data.category,
        size: data.size,
        thumbnail: data.thumbnail,
        downloads: data.downloads,
        googleDriveId: data.google_drive_id,
        description: data.description || '',
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
    } catch (error) {
      console.error('Error fetching template:', error);
      throw error;
    }
  }, [templateId, supabase]);
  
  // Use SWR for data fetching, with the cached template as initial data
  const { data, error, isValidating, mutate } = useSWR(
    cacheKey,
    fetchTemplate,
    {
      fallbackData: cachedTemplate,
      revalidateOnFocus: false,
      dedupingInterval: 60000, // 1 minute
    }
  );
  
  // Increment download count
  const incrementDownloads = useCallback(async () => {
    if (!templateId) return;
    
    try {
      await supabase.rpc('increment_template_downloads', {
        template_id: templateId
      });
      
      // Refresh the data
      mutate();
    } catch (error) {
      console.error('Error incrementing template downloads:', error);
    }
  }, [templateId, supabase, mutate]);
  
  return {
    template: data,
    isLoading: isValidating && !data,
    hasError: !!error,
    incrementDownloads,
    refresh: mutate
  };
};
