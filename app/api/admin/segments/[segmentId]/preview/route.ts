// app/api/admin/segments/[segmentId]/preview/route.ts
import { NextResponse } from 'next/server';
import { getCachedSegmentPreview } from '@/lib/segmentation/engine';

interface RouteParams {
  params: Promise<{
    segmentId: string;
  }>;
}

// GET /api/admin/segments/[segmentId]/preview - Get a preview of users matching a segment
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { segmentId } = await params;
    if (!segmentId) {
      return NextResponse.json({ error: 'Segment ID is required' }, { status: 400 });
    }

    // Parse query parameters
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '10', 10);
    const offset = parseInt(url.searchParams.get('offset') || '0', 10);

    // Get the segment preview
    const preview = await getCachedSegmentPreview(segmentId, limit, offset);

    return NextResponse.json({ data: preview });
  } catch (error) {
    console.error(`Error in GET /api/admin/segments/[segmentId]/preview:`, error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}