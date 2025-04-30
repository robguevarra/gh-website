'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

/**
 * Extracts the Google Drive file ID from a URL or returns the ID if already provided
 * Handles various Google Drive URL formats:
 * - https://drive.google.com/drive/folders/1AbCdEfGhIjKlMnOpQrStUvWxYz12345
 * - https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz12345/view
 * - https://drive.google.com/drive/u/0/folders/1AbCdEfGhIjKlMnOpQrStUvWxYz12345
 * - 1AbCdEfGhIjKlMnOpQrStUvWxYz12345 (direct ID)
 */
export async function extractGoogleDriveId(input: string): Promise<string> {
  if (!input) return '';
  
  // If it's already just an ID (alphanumeric string), return it
  if (/^[a-zA-Z0-9_-]+$/.test(input)) {
    return input;
  }
  
  try {
    // Try to extract ID from URL
    const url = new URL(input);
    
    // Handle folder URLs
    if (url.pathname.includes('/drive/folders/')) {
      const matches = url.pathname.match(/\/drive\/folders\/([a-zA-Z0-9_-]+)/);
      if (matches && matches[1]) return matches[1];
    }
    
    // Handle file URLs
    if (url.pathname.includes('/file/d/')) {
      const matches = url.pathname.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
      if (matches && matches[1]) return matches[1];
    }
    
    // Handle shared URLs
    if (url.pathname === '/open' && url.searchParams.has('id')) {
      return url.searchParams.get('id') || '';
    }
  } catch (error) {
    // If URL parsing fails, try regex directly on the string
    const folderMatches = input.match(/\/drive\/folders\/([a-zA-Z0-9_-]+)/);
    if (folderMatches && folderMatches[1]) return folderMatches[1];
    
    const fileMatches = input.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (fileMatches && fileMatches[1]) return fileMatches[1];
  }
  
  // Return original input if we couldn't parse it (will be validated by caller)
  return input;
}

/**
 * Validates if a string looks like a Google Drive ID
 * Google Drive IDs are typically 33 characters long and alphanumeric with dashes/underscores
 */
export async function isValidGoogleDriveId(id: string): Promise<boolean> {
  // Basic validation - Google Drive IDs are typically alphanumeric with possible dashes/underscores
  return /^[a-zA-Z0-9_-]{25,33}$/.test(id);
}

/**
 * Updates the Google Drive file ID for a Shopify product
 */
export async function updateProductDriveId(productId: string, driveId: string) {
  try {
    // Create server client
    const supabase = await createServerSupabaseClient();
    
    // Get the session to verify admin access
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { success: false, error: 'Unauthorized: You must be logged in' };
    }
    
    // Extract the Google Drive ID from the input (handles URLs)
    const parsedDriveId = await extractGoogleDriveId(driveId);
    
    // Validate the extracted ID
    if (!parsedDriveId) {
      return { success: false, error: 'Invalid Google Drive ID: ID cannot be empty' };
    }
    
    if (!(await isValidGoogleDriveId(parsedDriveId))) {
      return { 
        success: false, 
        error: 'Invalid Google Drive ID format. Please provide a valid ID or URL',
        parsedId: parsedDriveId
      };
    }
    
    // Update the product in the database
    const { error } = await supabase
      .from('shopify_products')
      .update({ google_drive_file_id: parsedDriveId })
      .eq('id', productId);
    
    if (error) {
      console.error('Error updating product:', error);
      return { success: false, error: `Database error: ${error.message}` };
    }
    
    // Revalidate the admin shop page to reflect changes
    revalidatePath('/admin/shop');
    
    return { 
      success: true, 
      message: 'Google Drive ID updated successfully',
      parsedId: parsedDriveId
    };
  } catch (error) {
    console.error('Error in updateProductDriveId:', error);
    return { 
      success: false, 
      error: `An unexpected error occurred: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
