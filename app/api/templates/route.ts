/**
 * @deprecated This API route is deprecated in favor of the direct Google Drive integration via /api/google-drive
 * We're keeping this file for backward compatibility but it's no longer actively used
 */

import { NextRequest, NextResponse } from 'next/server';

// Function to get mock templates for development
function getMockTemplates() {
  return [
    {
      id: 'mock-1',
      name: 'Weekly Planner Template',
      mimeType: 'application/pdf',
      size: '245760',
      thumbnailLink: 'https://via.placeholder.com/150?text=PDF',
      description: 'A weekly planning template for homeschooling activities',
      createdTime: new Date().toISOString(),
      modifiedTime: new Date().toISOString(),
    },
    {
      id: 'mock-2',
      name: 'Math Worksheet - Grade 3',
      mimeType: 'application/vnd.google-apps.document',
      size: '128000',
      thumbnailLink: 'https://via.placeholder.com/150?text=DOC',
      description: 'Grade 3 math practice worksheet with answer key',
      createdTime: new Date().toISOString(),
      modifiedTime: new Date().toISOString(),
    },
    {
      id: 'mock-3',
      name: 'Science Experiment Log',
      mimeType: 'application/vnd.google-apps.spreadsheet',
      size: '98304',
      thumbnailLink: 'https://via.placeholder.com/150?text=XLS',
      description: 'Log template for tracking science experiments',
      createdTime: new Date().toISOString(),
      modifiedTime: new Date().toISOString(),
    }
  ];
}

// Extract folder ID from Google Drive link
function extractFolderIdFromLink(link: string): string | null {
  if (!link) return null;
  
  try {
    // Handle different formats of Google Drive links
    const url = new URL(link);
    
    // Format: https://drive.google.com/drive/folders/FOLDER_ID
    if (url.pathname.includes('/drive/folders/')) {
      const parts = url.pathname.split('/');
      return parts[parts.indexOf('folders') + 1] || null;
    }
    
    // Format: https://drive.google.com/open?id=FOLDER_ID
    if (url.pathname.includes('/open') && url.searchParams.has('id')) {
      return url.searchParams.get('id');
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting folder ID from link:', error);
    return null;
  }
}

// Format file size for display
function formatFileSize(bytes: number): string {
  if (!bytes || isNaN(bytes)) return 'Unknown';
  
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

// Get file type from MIME type
function getFileTypeFromMimeType(mimeType: string): string {
  if (mimeType.includes('pdf')) return 'pdf';
  if (mimeType.includes('document')) return 'doc';
  if (mimeType.includes('spreadsheet')) return 'xls';
  if (mimeType.includes('presentation')) return 'ppt';
  return 'file';
}

// Get category from MIME type
function getCategoryFromMimeType(mimeType: string): string {
  if (mimeType.includes('pdf')) return 'PDF';
  if (mimeType.includes('document')) return 'Documents';
  if (mimeType.includes('spreadsheet')) return 'Spreadsheets';
  if (mimeType.includes('presentation')) return 'Presentations';
  if (mimeType.includes('image')) return 'Images';
  return 'Other';
}

/**
 * API route handler for templates
 * @deprecated This route is deprecated in favor of /api/google-drive
 */
export async function GET(request: NextRequest) {
  try {
    // Parse query parameters
    const url = new URL(request.url);
    const category = url.searchParams.get('category') || 'all';
    const searchQuery = url.searchParams.get('search') || '';
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const folderId = url.searchParams.get('folderId') || extractFolderIdFromLink(process.env.GOOGLE_DRIVE_LINK || '');
    
    // This route is deprecated - redirect to the Google Drive API route
    if (folderId) {
      // Build the redirect URL to the new Google Drive API
      const redirectUrl = new URL('/api/google-drive', request.url);
      redirectUrl.searchParams.set('folderId', folderId);
      if (category !== 'all') redirectUrl.searchParams.set('category', category);
      if (searchQuery) redirectUrl.searchParams.set('search', searchQuery);
      redirectUrl.searchParams.set('limit', limit.toString());
      redirectUrl.searchParams.set('offset', offset.toString());
      
      // Return a redirect response
      return NextResponse.redirect(redirectUrl.toString());
    }
    
    // For backward compatibility, return mock data if no folder ID
    const mockTemplates = getMockTemplates();
    const formattedTemplates = mockTemplates.map(file => ({
      id: file.id,
      name: file.name,
      type: getFileTypeFromMimeType(file.mimeType),
      category: getCategoryFromMimeType(file.mimeType),
      size: file.size ? formatFileSize(parseInt(file.size)) : 'Unknown',
      thumbnail: file.thumbnailLink || `https://via.placeholder.com/150?text=${getFileTypeFromMimeType(file.mimeType).toUpperCase()}`,
      downloads: 0,
      views: 0,
      googleDriveId: file.id,
      description: file.description || '',
      createdAt: file.createdTime,
      updatedAt: file.modifiedTime
    }));
    
    return NextResponse.json({
      templates: formattedTemplates,
      total: formattedTemplates.length,
      source: 'deprecated-api',
      message: 'This API route is deprecated. Please use /api/google-drive instead.'
    });
  } catch (error) {
    console.error('Error in templates API route:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: 'This API route is deprecated. Please use /api/google-drive instead.'
    }, { status: 500 });
  }
}
