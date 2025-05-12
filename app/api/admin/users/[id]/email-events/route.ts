import { NextRequest, NextResponse } from 'next/server';
import { getUserEmailEvents } from '@/lib/supabase/data-access/email-events';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = params.id;
  const url = new URL(req.url);
  const searchParams = url.searchParams;

  // Parse filters from query
  const eventType = searchParams.get('eventType') || undefined;
  const dateFrom = searchParams.get('dateFrom') || undefined;
  const dateTo = searchParams.get('dateTo') || undefined;
  const campaignId = searchParams.get('campaignId') || undefined;
  const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
  const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined;

  try {
    const { events, total } = await getUserEmailEvents(userId, {
      eventType,
      dateFrom,
      dateTo,
      campaignId,
      limit,
      offset,
    });
    return NextResponse.json({ userId, events, total });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch user email events' }, { status: 500 });
  }
}
