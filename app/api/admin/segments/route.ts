import { NextResponse } from 'next/server';
import {
  listSegments,
  createSegment,
} from '@/lib/supabase/data-access/segments';
import type { SegmentInsert } from '@/lib/supabase/data-access/segments';

// GET /api/admin/segments - List all segments
export async function GET() {
  try {
    const segments = await listSegments();
    if (!segments) {
      return NextResponse.json(
        { error: 'Failed to retrieve segments' },
        { status: 500 }
      );
    }
    return NextResponse.json({ data: segments });
  } catch (error) {
    console.error('Error in GET /api/admin/segments:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// POST /api/admin/segments - Create a new segment
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, description, rules } = body;

    if (!name || !rules) {
      return NextResponse.json(
        { error: 'Missing required fields: name and rules' },
        { status: 400 }
      );
    }

    const segmentData: SegmentInsert = { name, description, rules }; 
    const newSegment = await createSegment(segmentData);

    if (!newSegment) {
      return NextResponse.json(
        { error: 'Failed to create segment' },
        { status: 500 }
      );
    }
    return NextResponse.json({ data: newSegment }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/admin/segments:', error);
    // Handle JSON parsing errors specifically
    if (error instanceof SyntaxError) {
        return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
