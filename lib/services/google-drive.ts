'use client';

import { getBrowserClient } from '@/lib/supabase/client';

// Types for Google Drive API responses
export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string;
  thumbnailLink?: string;
  size?: string;
  fileExtension?: string;
  createdTime: string;
  modifiedTime: string;
  description?: string;
}

export interface GoogleDriveFolder {
  id: string;
  name: string;
  files: GoogleDriveFile[];
}

/**
 * Formats file size in a human-readable format
 */
export const formatFileSize = (bytes: number): string => {
  if (!bytes) return '0 B';
  
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  let size = bytes;
  
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i++;
  }
  
  return `${size.toFixed(1)} ${units[i]}`;
};

/**
 * Gets the file type from the MIME type or file extension
 */
export const getFileType = (file: GoogleDriveFile): string => {
  if (file.fileExtension) {
    return file.fileExtension.toLowerCase();
  }
  
  // Extract from MIME type
  const mimeTypeParts = file.mimeType.split('/');
  if (mimeTypeParts.length > 1) {
    // Handle special cases
    if (mimeTypeParts[0] === 'application') {
      if (mimeTypeParts[1].includes('pdf')) return 'pdf';
      if (mimeTypeParts[1].includes('word')) return 'doc';
      if (mimeTypeParts[1].includes('excel') || mimeTypeParts[1].includes('spreadsheet')) return 'xls';
      if (mimeTypeParts[1].includes('powerpoint') || mimeTypeParts[1].includes('presentation')) return 'ppt';
    }
    return mimeTypeParts[1].split('.').pop() || 'file';
  }
  
  return 'file';
};

/**
 * Converts a Google Drive file to our Template type
 */
export const convertToTemplate = (file: GoogleDriveFile): Template => {
  const fileType = getFileType(file);
  const fileSize = file.size ? formatFileSize(parseInt(file.size)) : 'Unknown';
  
  return {
    id: file.id,
    name: file.name,
    type: fileType,
    category: getCategoryFromMimeType(file.mimeType),
    size: fileSize,
    thumbnail: file.thumbnailLink || `/placeholders/${fileType}-placeholder.png`,
    downloads: 0,
    googleDriveId: file.id,
    description: file.description || '',
    createdAt: file.createdTime,
    updatedAt: file.modifiedTime
  };
};

/**
 * Determines a category based on the file's MIME type
 */
export const getCategoryFromMimeType = (mimeType: string): string => {
  if (mimeType.includes('pdf')) return 'PDF';
  if (mimeType.includes('image')) return 'Images';
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'Spreadsheets';
  if (mimeType.includes('document') || mimeType.includes('word')) return 'Documents';
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'Presentations';
  return 'Other';
};

/**
 * Fetches templates from Google Drive via our API
 */
export const fetchGoogleDriveTemplates = async (): Promise<Template[]> => {
  try {
    const response = await fetch('/api/templates');
    
    if (!response.ok) {
      throw new Error(`Failed to fetch templates: ${response.status}`);
    }
    
    const data = await response.json();
    return data.templates;
  } catch (error) {
    console.error('Error fetching Google Drive templates:', error);
    throw error;
  }
};

/**
 * Fetches a specific template by ID
 */
export const fetchTemplateById = async (templateId: string): Promise<Template | null> => {
  try {
    const response = await fetch(`/api/templates/${templateId}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Failed to fetch template: ${response.status}`);
    }
    
    const data = await response.json();
    return data.template;
  } catch (error) {
    console.error(`Error fetching template ${templateId}:`, error);
    throw error;
  }
};

/**
 * Tracks template usage in Supabase
 */
export const trackTemplateUsage = async (templateId: string, action: 'view' | 'download'): Promise<void> => {
  try {
    const supabase = getBrowserClient();
    
    // First, check if we have a user_templates record
    const { data: existingRecord } = await supabase
      .from('user_templates')
      .select('*')
      .eq('template_id', templateId)
      .single();
    
    if (existingRecord) {
      // Update the existing record
      await supabase
        .from('user_templates')
        .update({ 
          last_accessed: new Date().toISOString(),
          [`${action}_count`]: existingRecord[`${action}_count`] + 1
        })
        .eq('id', existingRecord.id);
    } else {
      // Create a new record
      await supabase
        .from('user_templates')
        .insert({
          template_id: templateId,
          [`${action}_count`]: 1,
          last_accessed: new Date().toISOString()
        });
    }
    
    // Also update the template's global counts
    await supabase
      .from('templates')
      .update({ 
        [`${action}_count`]: supabase.rpc('increment', { row_id: templateId, table_name: 'templates', column_name: `${action}_count` })
      })
      .eq('id', templateId);
      
  } catch (error) {
    console.error(`Error tracking template ${action}:`, error);
    // Don't throw here to prevent breaking the user experience
  }
};

// Import the Template type from our store
import { type Template } from '@/lib/stores/student-dashboard/types';
