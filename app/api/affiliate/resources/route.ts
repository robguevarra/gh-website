import { NextRequest, NextResponse } from 'next/server';
import { getFolderContents } from '@/lib/google-drive/driveApiUtils';

/**
 * GET /api/affiliate/resources
 * Fetches affiliate resources from the configured Google Drive folder
 */
export async function GET(request: NextRequest) {
  try {
    // Extract the Google Drive folder ID from the URL
    // https://drive.google.com/drive/folders/15n8Qlar4nq1SvgaNwPJnuXEtt8TF7E50?usp=sharing
    const AFFILIATE_RESOURCES_FOLDER_ID = '15n8Qlar4nq1SvgaNwPJnuXEtt8TF7E50';
    
    console.log('🔍 Fetching affiliate resources from Google Drive folder:', AFFILIATE_RESOURCES_FOLDER_ID);
    
    // Fetch files from the Google Drive folder
    const files = await getFolderContents(AFFILIATE_RESOURCES_FOLDER_ID);
    
    // Filter out folders and only return files that are useful for affiliates
    const resources = files
      .filter(file => !file.isFolder) // Only files, not folders
      .map(file => ({
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        modifiedTime: file.modifiedTime,
        size: file.size,
        description: file.description,
        createdTime: file.createdTime,
        // Determine file type for display
        fileType: getFileType(file.mimeType, file.name),
        // Generate preview URL
        previewUrl: `https://drive.google.com/file/d/${file.id}/preview`,
        downloadUrl: `https://drive.google.com/file/d/${file.id}/view`
      }));
    
    console.log(`✅ Successfully fetched ${resources.length} affiliate resources`);
    
    return NextResponse.json({
      success: true,
      resources,
      total: resources.length
    });
    
  } catch (error: any) {
    console.error('❌ Error fetching affiliate resources:', error.message);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch affiliate resources',
      details: error.message
    }, { status: 500 });
  }
}

/**
 * Helper function to determine file type based on MIME type and filename
 */
function getFileType(mimeType: string, fileName: string): string {
  // Handle Google Workspace files
  if (mimeType === 'application/vnd.google-apps.document') return 'document';
  if (mimeType === 'application/vnd.google-apps.spreadsheet') return 'spreadsheet';
  if (mimeType === 'application/vnd.google-apps.presentation') return 'presentation';
  if (mimeType === 'application/vnd.google-apps.folder') return 'folder';
  
  // Handle standard file types
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType.includes('word') || fileName.toLowerCase().endsWith('.docx')) return 'document';
  if (mimeType.includes('excel') || fileName.toLowerCase().endsWith('.xlsx')) return 'spreadsheet';
  if (mimeType.includes('powerpoint') || fileName.toLowerCase().endsWith('.pptx')) return 'presentation';
  
  return 'file';
} 