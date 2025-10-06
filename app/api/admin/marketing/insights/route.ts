import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { validateAdminStatus } from '@/lib/supabase/admin';

const querySchema = z.object({
  limit: z.string().optional(),
  offset: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient();

  // Auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const isAdmin = await validateAdminStatus(user.id);
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid query parameters', details: parsed.error.errors }, { status: 400 });
  }

  const limit = Math.min(200, Math.max(1, parseInt(parsed.data.limit ?? '20', 10) || 20));
  const offset = Math.max(0, parseInt(parsed.data.offset ?? '0', 10) || 0);

  try {
    const { data, error } = await supabase
      .from('marketing_insights')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error listing marketing insights:', error);
      return NextResponse.json({ error: 'Failed to list insights', details: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data ?? [], page: { limit, offset } });
  } catch (err) {
    console.error('Unexpected error listing insights:', err);
    const message = err instanceof Error ? err.message : 'Unexpected server error';
    return NextResponse.json({ error: 'Unexpected server error', details: message }, { status: 500 });
  }
}
