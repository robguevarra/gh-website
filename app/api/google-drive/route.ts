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

  console.log('Google Drive API request:', {
    folderId,
    hasCredentialsJson: !!process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS_JSON,
    hasKeyPath: !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH,
    rootFolderId: process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID
  });

  try {
    const [items, breadcrumbs] = await Promise.all([
      getFolderContents(folderId),
      folderId ? getFolderPath(folderId) : Promise.resolve([]),
    ]);

    return NextResponse.json(
      {
        items,
        breadcrumbs,
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        message: 'Failed to retrieve Google Drive data.',
        error: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
