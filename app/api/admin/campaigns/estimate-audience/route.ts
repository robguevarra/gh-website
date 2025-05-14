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

    if (campaignSegmentsError) {
      return handleServerError(campaignSegmentsError, 'Failed to fetch campaign segments');
    }

    const campaignSegments: CampaignSegmentRow[] = campaignSegmentsData || [];

    if (campaignSegments.length === 0) {
      return NextResponse.json({ estimatedAudienceSize: 0 });
    }

    const segmentIds = campaignSegments.map((cs) => cs.segment_id);

    const { data: userSegmentsData, error: userSegmentsError } = await adminSupabase
      .from('user_segments')
      .select('user_id')
      .in('segment_id', segmentIds);

    if (userSegmentsError) {
      return handleServerError(userSegmentsError, 'Failed to fetch user segments');
    }
    
    const userSegments: UserSegmentRow[] = userSegmentsData || [];

    if (userSegments.length === 0) {
      return NextResponse.json({ estimatedAudienceSize: 0 });
    }

    // Filter out null or undefined user_ids before adding to the Set
    const uniqueUserIds = new Set(
      userSegments.map((us) => us.user_id).filter((id): id is string => id !== null && id !== undefined)
    );
    const estimatedAudienceSize = uniqueUserIds.size;

    return NextResponse.json({ estimatedAudienceSize });

  } catch (error: any) {
    return handleServerError(error, 'An unexpected error occurred while estimating audience size');
  }
}