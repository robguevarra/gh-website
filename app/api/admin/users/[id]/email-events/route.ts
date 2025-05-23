import { NextRequest, NextResponse } from 'next/server';
import { getUserEmailEvents, EmailEventType } from '@/lib/supabase/data-access/email-events';
import { getAdminClient } from '@/lib/supabase/admin';
import { validateAdminAccess, handleServerError } from '@/lib/supabase/route-handler';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Validate admin access first
    const validation = await validateAdminAccess();
    if ('error' in validation) {
      return NextResponse.json({ error: validation.error }, { status: validation.status });
    }

    const userId = params.id;
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const url = new URL(req.url);
    const searchParams = url.searchParams;

    // Parse filters from query
    const eventTypeParam = searchParams.get('eventType');
    const eventType = eventTypeParam ? eventTypeParam as EmailEventType : undefined;
    const dateFrom = searchParams.get('dateFrom') || undefined;
    const dateTo = searchParams.get('dateTo') || undefined;
    const campaignId = searchParams.get('campaignId') || undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined;

    const constructedFilters = {
      eventType,
      dateFrom,
      dateTo,
      campaignId,
      limit,
      offset,
    };
    console.log(`[API /email-events GET] User: ${userId}, Filters for DB Query:`, constructedFilters); // Log constructed filters

    // Fetch email events
    const { events, total } = await getUserEmailEvents(userId, constructedFilters);

    // Fetch user profile to get email_bounced status
    const adminClient = getAdminClient();
    const { data: userProfile, error: profileError } = await adminClient
      .from('unified_profiles')
      .select('email_bounced')
      .eq('id', userId)
      .maybeSingle();

    if (profileError) {
      // Log the detailed error on the server
      console.error(`[API /email-events GET] Error fetching profile for user ${userId}:`, profileError);
      return handleServerError(profileError, 'Failed to fetch user profile for bounce status');
    }

    return NextResponse.json({ 
      userId, 
      events: events || [], // Ensure events is always an array
      total: total || 0,   // Ensure total is always a number
      profile: {
        email_bounced: userProfile?.email_bounced ?? false // Default to false if profile not found or field is null
      }
    });

  } catch (error: any) {
    console.error('[API /email-events GET] Error:', error);
    // If error is already a NextResponse, return it directly (e.g. from handleServerError)
    if (error instanceof NextResponse) {
        return error;
    }
    // Use handleServerError for consistent error responses if it has a message property
    if (error && typeof error.message === 'string') {
        return handleServerError(error, 'Failed to fetch user email events and profile information');
    }
    // Fallback generic error
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
