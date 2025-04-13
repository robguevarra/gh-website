'use client';

import { useCallback, useState } from 'react';
import { getBrowserClient } from '@/lib/supabase/client';
import type { Template } from '@/lib/stores/student-dashboard/types';

/**
 * Custom hook for fetching templates data
 * 
 * This hook handles fetching templates data from the database or external sources.
 * It manages loading and error states and provides methods for
 * fetching and refreshing the data.
 * 
 * @param userId - The ID of the user to fetch templates for (optional)
 * @returns An object containing the fetched data, loading state, error state, and refresh function
 * 
 * @example
 * ```tsx
 * const { 
 *   data, 
 *   isLoading, 
 *   error, 
 *   refresh 
 * } = useFetchTemplates(userId);
 * ```
 */
export function useFetchTemplates(userId?: string | null) {
  const supabase = getBrowserClient();
  const [data, setData] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  /**
   * Fetch templates data
   */
  const fetchTemplates = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // In a real implementation, this would fetch from an API or database
      // For now, we'll use mock data
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Mock templates data
      const mockTemplates: Template[] = [
        {
          id: "template1",
          name: "Weekly Planner",
          type: "document",
          category: "planners",
          size: "1.2 MB",
          thumbnail: "/placeholder.svg?height=80&width=120&text=Planner",
          downloads: 1245,
          googleDriveId: "1abc123",
        },
        {
          id: "template2",
          name: "Attendance Sheet",
          type: "spreadsheet",
          category: "tracking",
          size: "0.8 MB",
          thumbnail: "/placeholder.svg?height=80&width=120&text=Sheet",
          downloads: 876,
          googleDriveId: "2def456",
        },
        {
          id: "template3",
          name: "Lesson Plan Template",
          type: "document",
          category: "planners",
          size: "0.5 MB",
          thumbnail: "/placeholder.svg?height=80&width=120&text=Lesson",
          downloads: 2134,
          googleDriveId: "3ghi789",
        },
        {
          id: "template4",
          name: "Binding Guide",
          type: "pdf",
          category: "guides",
          size: "3.5 MB",
          thumbnail: "/placeholder.svg?height=80&width=120&text=Guide",
          downloads: 543,
          googleDriveId: "4jkl012",
        },
      ];
      
      setData(mockTemplates);
      return mockTemplates;
    } catch (err) {
      console.error('Error fetching templates:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch templates'));
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Get filtered templates based on category and search query
   */
  const getFilteredTemplates = useCallback(() => {
    return data.filter(template => {
      const matchesCategory = filter === 'all' || template.category === filter;
      const matchesSearch = searchQuery === '' || 
        template.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [data, filter, searchQuery]);

  return {
    data,
    isLoading,
    error,
    fetchTemplates,
    filter,
    setFilter,
    searchQuery,
    setSearchQuery,
    filteredTemplates: getFilteredTemplates(),
    
    // Convenience getters
    hasTemplates: data.length > 0,
    templateCount: data.length
  };
}
