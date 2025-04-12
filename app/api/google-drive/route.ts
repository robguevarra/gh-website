import { NextRequest, NextResponse } from 'next/server';

// Function to get Google Drive folder contents
async function getGoogleDriveFolderContents(folderId: string) {
  // Check if we're in development mode or missing API token
  const isDev = process.env.NODE_ENV !== 'production';
  const hasToken = !!process.env.GOOGLE_DRIVE_API_TOKEN;
  const hasFolderId = !!folderId;
  
  // If we're missing required credentials in production, log a more serious error
  if (!isDev && (!hasToken || !hasFolderId)) {
    console.error('Missing required Google Drive credentials in production environment');
  } else if (!hasToken || !hasFolderId) {
    // In development, just log a warning and use mock data
    console.warn(`Using mock data for development. ${!hasToken ? 'GOOGLE_DRIVE_API_TOKEN is not set.' : ''} ${!hasFolderId ? 'Google Drive folder ID is missing.' : ''}`);
    return getMockFiles();
  }
  
  try {
    // Use the Google Drive API to fetch folder contents
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents&fields=files(id,name,mimeType,size,thumbnailLink,webViewLink,createdTime,modifiedTime,fileExtension,description)`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.GOOGLE_DRIVE_API_TOKEN}`,
        },
      }
    );

    if (!response.ok) {
      // Handle specific error codes
      if (response.status === 401) {
        console.warn('Google Drive API authentication failed (401). Token may be expired or invalid.');
      } else if (response.status === 403) {
        console.warn('Google Drive API permission denied (403). Check folder permissions.');
      } else {
        console.error(`Google Drive API error: ${response.status}`);
      }
      
      // In development, use mock data instead of failing
      if (isDev) {
        console.info('Using mock data as fallback in development environment');
        return getMockFiles();
      }
      
      throw new Error(`Google Drive API error: ${response.status}`);
    }

    const data = await response.json();
    return data.files || [];
  } catch (error) {
    console.error('Error fetching Google Drive contents:', error);
    // Return mock data in case of error for development
    if (isDev) {
      console.info('Using mock data as fallback due to error in development environment');
      return getMockFiles();
    }
    throw error;
  }
}

// Extract folder ID from Google Drive link
function extractFolderIdFromLink(link: string): string | null {
  if (!link) {
    console.warn('No Google Drive link provided');
    return null;
  }
  
  // Example link: https://drive.google.com/drive/folders/1a2b3c4d5e6f7g8h9i0j?usp=sharing
  const folderMatch = link.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch && folderMatch[1]) {
    return folderMatch[1];
  }
  
  // For shared links that use a different format
  const viewerMatch = link.match(/id=([a-zA-Z0-9_-]+)/);
  if (viewerMatch && viewerMatch[1]) {
    return viewerMatch[1];
  }
  
  // For direct folder ID
  if (/^[a-zA-Z0-9_-]{25,}$/.test(link)) {
    return link;
  }
  
  console.warn('Could not extract folder ID from Google Drive link:', link);
  return null;
}

// Format file size for display
function formatFileSize(bytes: number): string {
  if (!bytes) return '0 B';
  
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  let size = bytes;
  
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i++;
  }
  
  return `${size.toFixed(1)} ${units[i]}`;
}

// Get file type from MIME type
function getFileTypeFromMimeType(mimeType: string): string {
  if (mimeType.includes('spreadsheet')) return 'xlsx';
  if (mimeType.includes('document')) return 'docx';
  if (mimeType.includes('presentation')) return 'pptx';
  if (mimeType.includes('pdf')) return 'pdf';
  if (mimeType.includes('image')) return 'img';
  return 'file';
}

// Get category from MIME type
function getCategoryFromMimeType(mimeType: string): string {
  if (mimeType.includes('spreadsheet')) return 'Spreadsheets';
  if (mimeType.includes('document')) return 'Documents';
  if (mimeType.includes('presentation')) return 'Presentations';
  if (mimeType.includes('pdf')) return 'PDFs';
  if (mimeType.includes('image')) return 'Images';
  return 'Other';
}

// Convert Google Drive file to our format
function convertToFile(file: any) {
  return {
    id: file.id,
    name: file.name,
    mimeType: file.mimeType,
    type: getFileTypeFromMimeType(file.mimeType),
    category: getCategoryFromMimeType(file.mimeType),
    size: file.size ? formatFileSize(parseInt(file.size, 10)) : 'Unknown',
    thumbnail: file.thumbnailLink || '',
    webViewLink: file.webViewLink || '',
    createdTime: file.createdTime,
    modifiedTime: file.modifiedTime,
    description: file.description || '',
  };
}

// Function to get mock files for development
function getMockFiles() {
  return [
    {
      id: 'mock-file-1',
      name: 'Weekly Planner',
      mimeType: 'application/pdf',
      webViewLink: 'https://drive.google.com/file/d/mock-id-1/view',
      thumbnailLink: 'https://via.placeholder.com/150',
      size: '256000',
      fileExtension: 'pdf',
      createdTime: new Date().toISOString(),
      modifiedTime: new Date().toISOString(),
      description: 'A weekly planner template for organizing your homeschool activities'
    },
    {
      id: 'mock-file-2',
      name: 'Science Lab Report',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      webViewLink: 'https://drive.google.com/file/d/mock-id-2/view',
      thumbnailLink: 'https://via.placeholder.com/150',
      size: '128000',
      fileExtension: 'docx',
      createdTime: new Date().toISOString(),
      modifiedTime: new Date().toISOString(),
      description: 'A template for science lab reports'
    },
    {
      id: 'mock-file-3',
      name: 'Math Worksheet',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      webViewLink: 'https://drive.google.com/file/d/mock-id-3/view',
      thumbnailLink: 'https://via.placeholder.com/150',
      size: '98000',
      fileExtension: 'xlsx',
      createdTime: new Date().toISOString(),
      modifiedTime: new Date().toISOString(),
      description: 'Interactive math worksheet with formulas'
    }
  ];
}

export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Get Google Drive folder ID from env
    const googleDriveLink = process.env.GOOGLE_DRIVE_LINK || process.env.NEXT_PUBLIC_GOOGLE_DRIVE_LINK;
    let folderId = null;
    
    if (googleDriveLink) {
      folderId = extractFolderIdFromLink(googleDriveLink);
    }
    
    // Determine if we should use mock data
    const isDev = process.env.NODE_ENV !== 'production';
    const useMockData = !folderId || !process.env.GOOGLE_DRIVE_API_TOKEN || isDev;
    
    let files = [];
    
    if (useMockData && isDev) {
      // Use mock data for development
      console.info('Using mock files for development environment');
      const mockFiles = getMockFiles();
      files = mockFiles.map(file => convertToFile(file));
    } else if (folderId) {
      // Fetch real files from Google Drive
      try {
        const driveFiles = await getGoogleDriveFolderContents(folderId);
        files = driveFiles.map((file: any) => convertToFile(file));
      } catch (error) {
        console.error('Failed to fetch Google Drive files:', error);
        
        // Fallback to mock data in development
        if (isDev) {
          console.info('Falling back to mock data after API error');
          const mockFiles = getMockFiles();
          files = mockFiles.map(file => convertToFile(file));
        } else {
          throw error; // In production, propagate the error
        }
      }
    } else {
      // No folder ID available
      console.warn('No Google Drive folder ID available');
      if (isDev) {
        const mockFiles = getMockFiles();
        files = mockFiles.map(file => convertToFile(file));
      } else {
        return NextResponse.json(
          { error: 'Invalid or missing Google Drive folder link' },
          { status: 500 }
        );
      }
    }
    
    if (!files || !Array.isArray(files)) {
      return NextResponse.json(
        { error: 'Failed to fetch files from Google Drive' },
        { status: 500 }
      );
    }
    
    // Convert files to our format
    const convertedFiles = files.map(file => convertToFile(file));
    
    // Apply filters
    let filteredFiles = convertedFiles;
    
    if (category && category !== 'all') {
      filteredFiles = filteredFiles.filter(file => file.category === category);
    }
    
    if (search) {
      const searchLower = search.toLowerCase();
      filteredFiles = filteredFiles.filter(file => 
        file.name.toLowerCase().includes(searchLower) || 
        (file.description && file.description.toLowerCase().includes(searchLower))
      );
    }
    
    // Apply pagination
    const paginatedFiles = filteredFiles.slice(offset, offset + limit);
    
    return NextResponse.json({
      files: paginatedFiles,
      total: filteredFiles.length,
    });
  } catch (error) {
    console.error('Error processing Google Drive files request:', error);
    return NextResponse.json(
      { error: 'Failed to process Google Drive files request' },
      { status: 500 }
    );
  }
}
