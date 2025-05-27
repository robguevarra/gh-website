import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { publicListAnnouncementsQuerySchema } from '@/lib/validations/announcement';

// GET Handler to list published announcements for the public
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    const parsedQuery = publicListAnnouncementsQuerySchema.parse(queryParams);

    const { page, limit, type, sortBy, sortOrder } = parsedQuery;
    const offset = (page - 1) * limit;

    const supabase = await createServerSupabaseClient();
    const now = new Date().toISOString();

    // Base query for published and active announcements
    let query = supabase
      .from('announcements')
      .select('id, title, content, type, publish_date, link_url, link_text, image_url, host_name, host_avatar_url, sort_order', { count: 'exact' })
      .eq('status', 'published')
      // Handle different announcement types with appropriate date filtering
      .or(`and(type.neq.live_class,or(publish_date.lte.${now},publish_date.is.null)),and(type.eq.live_class,publish_date.gte.${now})`)
      // Only show announcements that haven't expired
      .or(`expiry_date.gte.${now},expiry_date.is.null`)
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(offset, offset + limit - 1);

    if (type) {
      query = query.eq('type', type);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching public announcements:', error);
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
    console.error('Unexpected error in GET /api/announcements:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
