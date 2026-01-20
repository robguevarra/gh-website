import { NextResponse } from 'next/server';
import {
  getSegmentById,
  updateSegment,
  deleteSegment,
} from '@/lib/supabase/data-access/segments';
import type { SegmentUpdate } from '@/lib/supabase/data-access/segments';

interface RouteParams {
  params: Promise<{
    segmentId: string;
  }>;
}

// GET /api/admin/segments/[segmentId] - Get a specific segment
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { segmentId } = await params;
    if (!segmentId) {
      return NextResponse.json({ error: 'Segment ID is required' }, { status: 400 });
    }

    const segment = await getSegmentById(segmentId);
    if (!segment) {
      return NextResponse.json({ error: 'Segment not found' }, { status: 404 });
    }
    return NextResponse.json({ data: segment });
  } catch (error) {
    console.error(`Error in GET /api/admin/segments/[segmentId]:`, error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/segments/[segmentId] - Update a segment
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { segmentId } = await params;
    if (!segmentId) {
      return NextResponse.json({ error: 'Segment ID is required' }, { status: 400 });
    }

    const body = await request.json();
    // Ensure `rules` is not accidentally set to null if not provided
    // and other fields are optional for partial updates.
    const { name, description, rules } = body;
    const updates: SegmentUpdate = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (rules !== undefined) updates.rules = rules;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No update fields provided' }, { status: 400 });
    }

    const updatedSegment = await updateSegment(segmentId, updates);
    if (!updatedSegment) {
      return NextResponse.json({ error: 'Segment not found or failed to update' }, { status: 404 });
    }
    return NextResponse.json({ data: updatedSegment });
  } catch (error) {
    console.error(`Error in PATCH /api/admin/segments/[segmentId]:`, error);
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/segments/[segmentId] - Delete a segment
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { segmentId } = await params;
    if (!segmentId) {
      return NextResponse.json({ error: 'Segment ID is required' }, { status: 400 });
    }

    const success = await deleteSegment(segmentId);
    if (!success) {
      return NextResponse.json({ error: 'Segment not found or failed to delete' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Segment deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error(`Error in DELETE /api/admin/segments/[segmentId]:`, error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}