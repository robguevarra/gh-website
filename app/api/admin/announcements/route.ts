import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { checkAdminAccess } from '@/lib/auth/check-admin-access';
import {
  createAnnouncementSchema,
  listAnnouncementsQuerySchema,
} from '@/lib/validations/announcement';

// POST Handler to create a new announcement
export async function POST(request: Request) {
  const adminAccess = await checkAdminAccess();
  if (!adminAccess.isAdmin) {
    return NextResponse.json({ error: adminAccess.error }, { status: adminAccess.status });
  }

  try {
    const json = await request.json();
    const parsedData = createAnnouncementSchema.parse(json);

    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from('announcements')
      .insert(parsedData)
      .select()
      .single();

    if (error) {
      console.error('Error creating announcement:', error);
      return NextResponse.json({ error: 'Failed to create announcement', details: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }
    console.error('Unexpected error in POST /api/admin/announcements:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

// GET Handler to list announcements
export async function GET(request: Request) {
  const adminAccess = await checkAdminAccess();
  if (!adminAccess.isAdmin) {
    return NextResponse.json({ error: adminAccess.error }, { status: adminAccess.status });
  }

  try {
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    const parsedQuery = listAnnouncementsQuerySchema.parse(queryParams);

    const { page, limit, status, type, sortBy, sortOrder } = parsedQuery;
    const offset = (page - 1) * limit;

    const supabase = await createServerSupabaseClient();
    let query = supabase
      .from('announcements')
      .select('*', { count: 'exact' })
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }
    if (type) {
      query = query.eq('type', type);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching announcements:', error);
      return NextResponse.json({ error: 'Failed to fetch announcements', details: error.message }, { status: 500 });
    }

    return NextResponse.json({
      data,
      pagination: {
        totalItems: count,
        currentPage: page,
        pageSize: limit,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid query parameters', details: error.errors }, { status: 400 });
    }
    console.error('Unexpected error in GET /api/admin/announcements:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
