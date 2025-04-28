import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { getFileMetadata, getFileStream, exportFileStream } from '@/lib/google-drive/driveApiUtils';
import { Database } from '@/types/supabase';
import path from 'path'; // Needed for handling file extensions

// Helper function to check purchase authorization
async function checkUserPurchaseAuthorization(
  supabaseAdmin: any, // Use Supabase client instance (service role)
  userId: string,
  googleDriveFileId: string
): Promise<boolean> {
  try {
    // Query to check if the user has an order item linked to this Google Drive file ID
    const { data: orderItems, error } = await supabaseAdmin
      .from('ecommerce_order_items')
      .select(`
        id,
        ecommerce_orders ( id, user_id, order_status ),
        shopify_products ( id, google_drive_file_id )
      `)
      .eq('ecommerce_orders.user_id', userId)
      .eq('shopify_products.google_drive_file_id', googleDriveFileId)
      // Ensure the product mapping is correct (thoughredundant with the eq above)
      .not('shopify_products.google_drive_file_id', 'is', null)
      // Check if *any* order exists, assuming access is granted upon successful webhook processing
      // .in('ecommerce_orders.order_status', ['processing', 'completed'])
      .limit(1); // We only need to know if at least one exists

    if (error) {
      console.error('[Download API Auth Check] Error checking purchase:', error);
      return false; // Fail safe
    }

    // If we found at least one matching order item, the user is authorized
    return orderItems && orderItems.length > 0;

  } catch (err) {
    console.error('[Download API Auth Check] Exception checking purchase:', err);
    return false;
  }
}


export async function GET(request: NextRequest) {
  // Remove direct cookie handling if wrapper does it
  // const cookieStore = cookies(); 
  
  // 1. Authentication: Use the correct wrapper function and await it
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    console.error('[Download API] Authentication error:', authError);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Input Validation: Get fileId from query params
  const { searchParams } = new URL(request.url);
  const fileId = searchParams.get('fileId');

  if (!fileId) {
    return NextResponse.json({ error: 'Missing fileId parameter' }, { status: 400 });
  }

  try {
    // 3. Authorization: Use the dedicated service role client helper
    // const { createClient } = await import('@supabase/supabase-js'); // No longer needed
    // const supabaseAdminManual = createClient<Database>(...
    const supabaseAdmin = await createServiceRoleClient(); 

    const isAuthorized = await checkUserPurchaseAuthorization(supabaseAdmin, user.id, fileId);

    if (!isAuthorized) {
      console.warn(`[Download API] Unauthorized download attempt: User ${user.id}, File ${fileId}`);
      return NextResponse.json({ error: 'Forbidden - Purchase not found or not authorized' }, { status: 403 });
    }

    // 4. Fetch File Metadata (Name, Type) from Google Drive
    const { name: originalFileName, mimeType: originalMimeType } = await getFileMetadata(fileId);

    // === REMOVE FOLDER CHECK ===
    // if (originalMimeType === 'application/vnd.google-apps.folder') {
    //   console.warn(`[Download API] Attempted to download a folder: User ${user.id}, Folder ID ${fileId}`);
    //   return NextResponse.json(
    //     { error: 'Downloading folders is not supported. Please select a file.' },
    //     { status: 400 }
    //   );
    // }
    // === END REMOVE FOLDER CHECK ===

    let fileStream: NodeJS.ReadableStream;
    let downloadFileName = originalFileName;
    let downloadMimeType = originalMimeType;

    // Define Google Workspace MIME types that need exporting
    const googleWorkspaceMimeTypes = [
      'application/vnd.google-apps.document',
      'application/vnd.google-apps.spreadsheet',
      'application/vnd.google-apps.presentation',
      // Add others if needed (e.g., drawings, forms)
    ];

    // Default export format (PDF is widely supported)
    const exportMimeType = 'application/pdf';
    const exportExtension = '.pdf';

    // 5. Decide whether to download directly or export
    if (googleWorkspaceMimeTypes.includes(originalMimeType)) {
      // It's a Google Workspace file - Export it
      console.log(`[Download API] Detected Google Workspace file (${originalMimeType}). Exporting as ${exportMimeType} for file ID: ${fileId}`);
      fileStream = await exportFileStream(fileId, exportMimeType);
      // Adjust filename and MIME type for the exported file
      downloadFileName = `${path.parse(originalFileName).name}${exportExtension}`; // Change extension
      downloadMimeType = exportMimeType;
      console.log(`[Download API] Exported file stream obtained. Download filename: ${downloadFileName}, MIME type: ${downloadMimeType}`);
    } else {
      // It's a binary file - Download it directly
      console.log(`[Download API] Detected binary file (${originalMimeType}). Downloading directly for file ID: ${fileId}`);
      fileStream = await getFileStream(fileId);
      console.log(`[Download API] Direct download stream obtained. Filename: ${downloadFileName}, MIME type: ${downloadMimeType}`);
    }

    // 6. Stream Response
    // Convert NodeJS stream to Web API ReadableStream if necessary (Next.js handles this)
    const response = new NextResponse(fileStream as any, { // Cast needed as types might mismatch slightly
      status: 200,
      headers: {
        // Use encodeURIComponent for filenames that might contain special characters
        'Content-Disposition': `attachment; filename="${encodeURIComponent(downloadFileName)}"`,
        'Content-Type': downloadMimeType,
        // Add cache control headers if appropriate (e.g., prevent caching of sensitive files)
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
      },
    });

    return response;

  } catch (error: any) {
    console.error(`[Download API] Error processing file download for ID ${fileId}:`, error);

    // Refine error handling based on potential export errors
    if (error.message.includes('file not found')) {
       return NextResponse.json({ error: 'File not found on storage.' }, { status: 404 });
    }
    if (error.message.includes('Forbidden') || error.message.includes('permission')) {
       return NextResponse.json({ error: 'Access denied by storage provider.' }, { status: 403 });
    }
    // Specific error for unsupported export
    if (error.message.includes('export')) { // Check if the error came during export step
        return NextResponse.json({ error: `Could not export file: ${error.message}` }, { status: 400 });
    }

    // Generic server error
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// Add basic OPTIONS handler for CORS preflight if needed (adjust origin as necessary)
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Allow': 'GET, OPTIONS',
      'Access-Control-Allow-Origin': '*', // Or specify your frontend domain
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
} 