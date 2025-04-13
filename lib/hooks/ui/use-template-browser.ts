'use client';

import { useState, useCallback, useMemo } from 'react';
import { useGoogleDriveFiles } from '@/lib/hooks/use-google-drive';
import { useTemplates } from '@/lib/hooks/state/use-templates';
import { useUserProfile } from '@/lib/hooks/state/use-user-profile';
import type { DriveItem } from '@/lib/google-drive/driveApiUtils';

/**
 * Custom hook for the template browser component
 * 
 * This hook combines the Google Drive files hook with the templates hook
 * to provide a unified interface for the template browser component.
 * 
 * @returns An object containing the data and actions needed by the template browser
 * 
 * @example
 * ```tsx
 * const { 
 *   items,
 *   breadcrumbs,
 *   isLoading,
 *   hasError,
 *   selectedFile,
 *   showPreviewModal,
 *   navigateToFolder,
 *   handlePreview,
 *   handleClosePreview,
 *   handleDownload,
 *   handleSelect
 * } = useTemplateBrowser({ onTemplateSelect });
 * ```
 */
export function useTemplateBrowser({ 
  onTemplateSelect 
}: { 
  onTemplateSelect?: (file: DriveItem) => void 
}) {
  const { userId } = useUserProfile();
  const { templates, selectedTemplateId, setSelectedTemplateId } = useTemplates();
  
  // Local state for the template browser
  const [selectedFile, setSelectedFile] = useState<DriveItem | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  
  // Get Google Drive files
  const {
    items,
    breadcrumbs,
    isLoading,
    hasError,
    currentFolderId,
    navigateToFolder,
    refreshData,
  } = useGoogleDriveFiles();
  
  // Memoize event handlers with useCallback
  const handlePreview = useCallback((file: DriveItem) => {
    setSelectedFile(file);
    setShowPreviewModal(true);
  }, []);
  
  const handleClosePreview = useCallback(() => {
    setShowPreviewModal(false);
  }, []);
  
  const handleDownload = useCallback(async (file: DriveItem) => {
    try {
      // In a real implementation, this would download the file
      console.log('Downloading file:', file.name);
      
      // Simulate download
      alert(`Downloading ${file.name}...`);
    } catch (error) {
      console.error('Error downloading file:', error);
    }
  }, []);
  
  const handleSelect = useCallback((file: DriveItem) => {
    if (onTemplateSelect) {
      onTemplateSelect(file);
    }
  }, [onTemplateSelect]);
  
  // Use useMemo to return a stable object reference
  return useMemo(() => ({
    // Google Drive data
    items,
    breadcrumbs,
    isLoading,
    hasError,
    currentFolderId,
    
    // Local state
    selectedFile,
    showPreviewModal,
    
    // Templates data
    templates,
    selectedTemplateId,
    
    // Actions
    navigateToFolder,
    refreshData,
    handlePreview,
    handleClosePreview,
    handleDownload,
    handleSelect,
    setSelectedTemplateId
  }), [
    items,
    breadcrumbs,
    isLoading,
    hasError,
    currentFolderId,
    selectedFile,
    showPreviewModal,
    templates,
    selectedTemplateId,
    navigateToFolder,
    refreshData,
    handlePreview,
    handleClosePreview,
    handleDownload,
    handleSelect,
    setSelectedTemplateId
  ]);
}
