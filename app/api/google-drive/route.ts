import { NextRequest, NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import {
  getFolderContents,
  getFolderPath,
} from '@/lib/google-drive/driveApiUtils';

// Cache the drive operation functions
// We create a cached version that takes the folderId as a key part
const getCachedDriveData = unstable_cache(
  async (folderId: string | null) => {
    const [items, breadcrumbs] = await Promise.all([
      getFolderContents(folderId),
      folderId ? getFolderPath(folderId) : Promise.resolve([]),
    ]);
    return { items, breadcrumbs };
  },
  ['google-drive-contents'], // Key prefix
  { revalidate: 3600, tags: ['google-drive'] } // Revalidate every hour
);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const folderId = searchParams.get('folderId') || null;

  try {
    // Use the cached function
    const data = await getCachedDriveData(folderId);

    return NextResponse.json(
      data,
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

