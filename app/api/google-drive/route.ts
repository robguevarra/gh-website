import { NextRequest, NextResponse } from 'next/server';
import {
  getFolderContents,
  getFolderPath,
  DriveItem,
  BreadcrumbSegment,
} from '@/lib/google-drive/driveApiUtils';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const folderId = searchParams.get('folderId') || null;

  console.log(`[API Route] Received request for folderId: ${folderId}`);

  try {
    const [items, breadcrumbs] = await Promise.all([
      getFolderContents(folderId),
      folderId ? getFolderPath(folderId) : Promise.resolve([]),
    ]);

    console.log(`[API Route] Successfully fetched ${items.length} items and ${breadcrumbs.length} breadcrumbs for folderId: ${folderId}`);

    return NextResponse.json(
      {
        items,
        breadcrumbs,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error(`[API Route Error] Failed to process request for folderId "${folderId}":`, error.message || error);
    return NextResponse.json(
      {
        message: 'Failed to retrieve Google Drive data.',
        error: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
