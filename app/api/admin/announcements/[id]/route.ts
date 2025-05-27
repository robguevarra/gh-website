import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { checkAdminAccess } from '@/lib/auth/check-admin-access';
import { updateAnnouncementSchema } from '@/lib/validations/announcement';

const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

// GET Handler to fetch a specific announcement by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const adminAccess = await checkAdminAccess();
  if (!adminAccess.isAdmin) {
    return NextResponse.json({ error: adminAccess.error }, { status: adminAccess.status });
  }

  const { id } = params;

  if (!id || !UUID_REGEX.test(id)) {
    return NextResponse.json({ error: 'Invalid announcement ID format' }, { status: 400 });
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // PostgREST error for "No rows found"
        return NextResponse.json({ error: 'Announcement not found' }, { status: 404 });
      }
      console.error('Error fetching announcement by ID:', error);
      return NextResponse.json({ error: 'Failed to fetch announcement', details: error.message }, { status: 500 });
    }

    if (!data) {
        return NextResponse.json({ error: 'Announcement not found' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error(`Unexpected error in GET /api/admin/announcements/${id}:`, error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

// PUT Handler to update an announcement
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const adminAccess = await checkAdminAccess();
  if (!adminAccess.isAdmin) {
    return NextResponse.json({ error: adminAccess.error }, { status: adminAccess.status });
  }

  const { id } = params;

  if (!id || !UUID_REGEX.test(id)) {
    return NextResponse.json({ error: 'Invalid announcement ID format' }, { status: 400 });
  }

  try {
    const json = await request.json();
    const parsedData = updateAnnouncementSchema.parse(json);

    if (Object.keys(parsedData).length === 0) {
      return NextResponse.json({ error: 'No fields to update provided' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from('announcements')
      .update(parsedData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
       if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Announcement not found or no changes made' }, { status: 404 });
      }
      console.error('Error updating announcement:', error);
      return NextResponse.json({ error: 'Failed to update announcement', details: error.message }, { status: 500 });
    }
    
    if (!data) { // Should be caught by PGRST116, but as a fallback
        return NextResponse.json({ error: 'Announcement not found' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }
    console.error(`Unexpected error in PUT /api/admin/announcements/${id}:`, error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

// DELETE Handler to delete an announcement
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const adminAccess = await checkAdminAccess();
  if (!adminAccess.isAdmin) {
    return NextResponse.json({ error: adminAccess.error }, { status: adminAccess.status });
  }

  const { id } = params;

   if (!id || !UUID_REGEX.test(id)) {
    return NextResponse.json({ error: 'Invalid announcement ID format' }, { status: 400 });
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { error, count } = await supabase
      .from('announcements')
      .delete({ count: 'exact' })
      .eq('id', id);

    if (error) {
      console.error('Error deleting announcement:', error);
      return NextResponse.json({ error: 'Failed to delete announcement', details: error.message }, { status: 500 });
    }

    if (count === 0) {
        return NextResponse.json({ error: 'Announcement not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Announcement deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error(`Unexpected error in DELETE /api/admin/announcements/${id}:`, error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
