import { NextRequest, NextResponse } from 'next/server';
import { Database } from '@/lib/supabase/database.types';
import {
  createRouteHandlerClient,
  validateAdminAccess,
  handleServerError,
} from '@/lib/supabase/route-handler';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { SegmentRules } from '@/types/campaigns';

// Define a type for the items in campaignSegments and userSegments for clarity
type CampaignSegmentRow = { segment_id: string };
type UserSegmentRow = { user_id: string | null }; // Allow user_id to be null to match schema

// Helper function to fetch users for a list of segment IDs
async function fetchUsersForSegments(
  adminSupabase: any, // SupabaseClient type
  segmentIds: string[]
): Promise<Set<string>> {
  if (!segmentIds || segmentIds.length === 0) {
    return new Set<string>();
  }

  let allUserSegments: UserSegmentRow[] = [];
  let page = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data: userSegmentsPage, error: userSegmentsError } = await adminSupabase
      .from('user_segments')
      .select('user_id')
      .in('segment_id', segmentIds)
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (userSegmentsError) {
      // Propagate the error to be handled by the main try-catch
      throw userSegmentsError; 
    }

    if (userSegmentsPage && userSegmentsPage.length > 0) {
      allUserSegments = [...allUserSegments, ...userSegmentsPage];
      if (userSegmentsPage.length < pageSize) {
        hasMore = false;
      } else {
        page++;
      }
    } else {
      hasMore = false;
    }
  }
  return new Set(
    allUserSegments.map((us) => us.user_id).filter((id): id is string => id !== null && id !== undefined)
  );
}

export async function POST(request: NextRequest) {
  const { error: adminError } = await validateAdminAccess();
  if (adminError) {
    return adminError;
  }

  const adminSupabase = await createServiceRoleClient();

  let rules: SegmentRules;
  try {
    rules = await request.json();
    // Basic validation for rules structure
    if (
      !rules ||
      !rules.include ||
      !rules.exclude ||
      !rules.include.segmentIds ||
      !rules.exclude.segmentIds ||
      !rules.include.operator
    ) {
      return NextResponse.json({ error: 'Invalid segment_rules payload' }, { status: 400 });
    }
  } catch (e) {
    return NextResponse.json({ error: 'Failed to parse segment_rules from request body' }, { status: 400 });
  }

  try {
    if (!rules.include.segmentIds || rules.include.segmentIds.length === 0) {
      return NextResponse.json({ estimatedAudienceSize: 0 });
    }

    let includedUserSet: Set<string>;

    if (rules.include.operator === 'OR') {
      includedUserSet = await fetchUsersForSegments(adminSupabase, rules.include.segmentIds);
    } else { // 'AND' operator
      // For AND, fetch users for each segment individually and find the intersection
      const userSetsPerSegment: Set<string>[] = [];
      for (const segmentId of rules.include.segmentIds) {
        const usersInSegment = await fetchUsersForSegments(adminSupabase, [segmentId]);
        userSetsPerSegment.push(usersInSegment);
      }

      if (userSetsPerSegment.length === 0) {
        includedUserSet = new Set<string>(); // Should be caught by earlier check, but safety
      } else {
        // Start with the first set and intersect with the rest
        includedUserSet = new Set<string>(userSetsPerSegment[0]);
        for (let i = 1; i < userSetsPerSegment.length; i++) {
          includedUserSet = new Set([...includedUserSet].filter(userId => userSetsPerSegment[i].has(userId)));
        }
      }
    }

    if (rules.exclude.segmentIds.length > 0) {
      const excludedUserSet = await fetchUsersForSegments(adminSupabase, rules.exclude.segmentIds);
      excludedUserSet.forEach(userId => includedUserSet.delete(userId));
    }

    return NextResponse.json({ estimatedAudienceSize: includedUserSet.size });

  } catch (error: any) {
    // If fetchUsersForSegments throws, it will be caught here
    return handleServerError(error, 'An unexpected error occurred while estimating audience size');
  }
}

// Remove or comment out the old GET handler
/*
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

    // Implement pagination to handle more than 1000 users
    let allUserSegments: UserSegmentRow[] = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;
    
    while (hasMore) {
      const { data: userSegmentsPage, error: userSegmentsError } = await adminSupabase
        .from('user_segments')
        .select('user_id')
        .in('segment_id', segmentIds)
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (userSegmentsError) {
        return handleServerError(userSegmentsError, 'Failed to fetch user segments');
      }

      if (userSegmentsPage && userSegmentsPage.length > 0) {
        // Add this page's results to our collection
        allUserSegments = [...allUserSegments, ...userSegmentsPage];
        
        // Check if we've reached the end of the results
        if (userSegmentsPage.length < pageSize) {
          hasMore = false;
        } else {
          page++;
        }
      } else {
        // No more results
        hasMore = false;
      }
    }

    const userSegments: UserSegmentRow[] = allUserSegments;
    
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
*/