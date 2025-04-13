'use client';

import { useCallback, useMemo } from 'react';
import { useStudentDashboardStore } from '@/lib/stores/student-dashboard';
import type { Template } from '@/lib/stores/student-dashboard/types';

/**
 * Custom hook for accessing templates state
 * 
 * This hook provides access to templates data stored in the student dashboard store.
 * It uses individual selectors for each piece of state to prevent unnecessary re-renders
 * and memoizes action functions to ensure stable references.
 * 
 * @returns An object containing templates state and actions
 * 
 * @example
 * ```tsx
 * const { 
 *   templates, 
 *   selectedTemplateId, 
 *   templateFilter, 
 *   setTemplateFilter 
 * } = useTemplates();
 * ```
 */

// Define selectors outside the hook to ensure they're stable
const templatesSelector = (state: any) => state.templates;
const selectedTemplateIdSelector = (state: any) => state.selectedTemplateId;
const templateFilterSelector = (state: any) => state.templateFilter;
const templateSearchQuerySelector = (state: any) => state.templateSearchQuery;
const isLoadingTemplatesSelector = (state: any) => state.isLoadingTemplates;
const hasTemplatesErrorSelector = (state: any) => state.hasTemplatesError;

// Action selectors
const setTemplatesSelector = (state: any) => state.setTemplates;
const setSelectedTemplateIdSelector = (state: any) => state.setSelectedTemplateId;
const setTemplateFilterSelector = (state: any) => state.setTemplateFilter;
const setTemplateSearchQuerySelector = (state: any) => state.setTemplateSearchQuery;
const setIsLoadingTemplatesSelector = (state: any) => state.setIsLoadingTemplates;
const setHasTemplatesErrorSelector = (state: any) => state.setHasTemplatesError;
const getFilteredTemplatesSelector = (state: any) => state.getFilteredTemplates;
const loadUserTemplatesSelector = (state: any) => state.loadUserTemplates;

export function useTemplates() {
  // Use individual selectors for each piece of state
  const templates = useStudentDashboardStore(templatesSelector);
  const selectedTemplateId = useStudentDashboardStore(selectedTemplateIdSelector);
  const templateFilter = useStudentDashboardStore(templateFilterSelector);
  const templateSearchQuery = useStudentDashboardStore(templateSearchQuerySelector);
  const isLoadingTemplates = useStudentDashboardStore(isLoadingTemplatesSelector);
  const hasTemplatesError = useStudentDashboardStore(hasTemplatesErrorSelector);
  
  // Get actions separately as they don't need to trigger re-renders
  const setTemplates = useStudentDashboardStore(setTemplatesSelector);
  const setSelectedTemplateId = useStudentDashboardStore(setSelectedTemplateIdSelector);
  const setTemplateFilter = useStudentDashboardStore(setTemplateFilterSelector);
  const setTemplateSearchQuery = useStudentDashboardStore(setTemplateSearchQuerySelector);
  const setIsLoadingTemplates = useStudentDashboardStore(setIsLoadingTemplatesSelector);
  const setHasTemplatesError = useStudentDashboardStore(setHasTemplatesErrorSelector);
  const getFilteredTemplates = useStudentDashboardStore(getFilteredTemplatesSelector);
  const loadUserTemplates = useStudentDashboardStore(loadUserTemplatesSelector);
  
  // Memoize action functions to prevent recreation on each render
  const memoizedSetTemplates = useCallback((templates: Template[]) => {
    setTemplates(templates);
  }, [setTemplates]);
  
  const memoizedSetSelectedTemplateId = useCallback((templateId: string | null) => {
    setSelectedTemplateId(templateId);
  }, [setSelectedTemplateId]);
  
  const memoizedSetTemplateFilter = useCallback((filter: string) => {
    setTemplateFilter(filter);
  }, [setTemplateFilter]);
  
  const memoizedSetTemplateSearchQuery = useCallback((query: string) => {
    setTemplateSearchQuery(query);
  }, [setTemplateSearchQuery]);
  
  const memoizedLoadUserTemplates = useCallback((userId: string) => {
    return loadUserTemplates(userId);
  }, [loadUserTemplates]);
  
  // Use useMemo to return a stable object reference
  return useMemo(() => ({
    templates,
    selectedTemplateId,
    templateFilter,
    templateSearchQuery,
    isLoadingTemplates,
    hasTemplatesError,
    setTemplates: memoizedSetTemplates,
    setSelectedTemplateId: memoizedSetSelectedTemplateId,
    setTemplateFilter: memoizedSetTemplateFilter,
    setTemplateSearchQuery: memoizedSetTemplateSearchQuery,
    setIsLoadingTemplates,
    setHasTemplatesError,
    getFilteredTemplates,
    loadUserTemplates: memoizedLoadUserTemplates,
    
    // Convenience getters
    hasTemplates: templates.length > 0,
    templateCount: templates.length,
    filteredTemplates: getFilteredTemplates(),
    selectedTemplate: templates.find(t => t.id === selectedTemplateId) || null
  }), [
    templates,
    selectedTemplateId,
    templateFilter,
    templateSearchQuery,
    isLoadingTemplates,
    hasTemplatesError,
    memoizedSetTemplates,
    memoizedSetSelectedTemplateId,
    memoizedSetTemplateFilter,
    memoizedSetTemplateSearchQuery,
    setIsLoadingTemplates,
    setHasTemplatesError,
    getFilteredTemplates,
    memoizedLoadUserTemplates
  ]);
}
