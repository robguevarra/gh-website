import { NextRequest, NextResponse } from 'next/server';
import { Database } from '@/lib/supabase/database.types';
import {
  createRouteHandlerClient,
  validateAdminAccess,
  handleServerError,
} from '@/lib/supabase/route-handler';
import { createServiceRoleClient } from '@/lib/supabase/server';

// Define a type for the items in campaignSegments and userSegments for clarity
type CampaignSegmentRow = { segment_id: string };
type UserSegmentRow = { user_id: string | null }; // Allow user_id to be null to match schema

export async function GET(request: NextRequest) {
  // Validate admin access using the standard route handler client (checks current user's session)
  const { error: adminError, user, profile } = await validateAdminAccess(); 
  if (adminError) {
    return adminError;
  }

  // For data fetching that needs to bypass RLS, use the service role client
  const adminSupabase = await createServiceRoleClient();

  const { searchParams } = new URL(request.url);
  const campaignId = searchParams.get('campaignId');

  if (!campaignId) {
    return NextResponse.json({ error: 'Campaign ID query parameter is required' }, { status: 400 });
  }

  try {
    const { data: campaignSegmentsData, error: campaignSegmentsError } = await adminSupabase
      .from('campaign_segments')
      .select('segment_id')
      .eq('campaign_id', campaignId);

    console.log('[AUDIENCE_ESTIMATE] Fetched campaignSegmentsData:', JSON.stringify(campaignSegmentsData, null, 2));
    if (campaignSegmentsError) {
      console.error('[AUDIENCE_ESTIMATE] Error fetching campaign segments:', campaignSegmentsError);
      return handleServerError(campaignSegmentsError, 'Failed to fetch campaign segments');
    }

    const campaignSegments: CampaignSegmentRow[] = campaignSegmentsData || [];
    console.log('[AUDIENCE_ESTIMATE] Parsed campaignSegments:', JSON.stringify(campaignSegments, null, 2));

    if (campaignSegments.length === 0) {
      console.log('[AUDIENCE_ESTIMATE] No campaign segments found for campaignId:', campaignId, '. Returning 0.');
      return NextResponse.json({ estimatedAudienceSize: 0 });
    }

    const segmentIds = campaignSegments.map((cs) => cs.segment_id);
    console.log('[AUDIENCE_ESTIMATE] Extracted segmentIds:', JSON.stringify(segmentIds, null, 2));

    const { data: userSegmentsData, error: userSegmentsError } = await adminSupabase
      .from('user_segments')
      .select('user_id')
      .in('segment_id', segmentIds);

    console.log('[AUDIENCE_ESTIMATE] Fetched userSegmentsData:', JSON.stringify(userSegmentsData, null, 2));
    if (userSegmentsError) {
      console.error('[AUDIENCE_ESTIMATE] Error fetching user segments:', userSegmentsError);
      return handleServerError(userSegmentsError, 'Failed to fetch user segments');
    }
    
    const userSegments: UserSegmentRow[] = userSegmentsData || [];
    console.log('[AUDIENCE_ESTIMATE] Parsed userSegments:', JSON.stringify(userSegments, null, 2));

    if (userSegments.length === 0) {
      console.log('[AUDIENCE_ESTIMATE] No user segments found for the given segmentIds. Returning 0.');
      return NextResponse.json({ estimatedAudienceSize: 0 });
    }

    // Filter out null or undefined user_ids before adding to the Set
    const uniqueUserIds = new Set(
      userSegments.map((us) => us.user_id).filter((id): id is string => id !== null && id !== undefined)
    );
    console.log('[AUDIENCE_ESTIMATE] uniqueUserIds Set:', JSON.stringify(Array.from(uniqueUserIds), null, 2));
    const estimatedAudienceSize = uniqueUserIds.size;
    console.log('[AUDIENCE_ESTIMATE] Final estimatedAudienceSize:', estimatedAudienceSize);

    return NextResponse.json({ estimatedAudienceSize });

  } catch (error: any) {
    console.error('[AUDIENCE_ESTIMATE] An unexpected error occurred:', error);
    return handleServerError(error, 'An unexpected error occurred while estimating audience size');
  }
}