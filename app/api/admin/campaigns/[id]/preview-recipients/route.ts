import { NextRequest, NextResponse } from 'next/server';
import {
  createRouteHandlerClient,
  validateAdminAccess,
  handleServerError,
} from '@/lib/supabase/route-handler';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { getUserDetail } from '@/lib/supabase/data-access/admin-users';

/**
 * GET /api/admin/campaigns/[id]/preview-recipients
 * 
 * Retrieves a sample of users from segments associated with a campaign.
 * Used for the recipient preview feature in the campaign management UI.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Validate admin access using the standard route handler client
    const { error: adminError, user, profile } = await validateAdminAccess(); 
    if (adminError) {
      return adminError;
    }
    
    // For data fetching that needs to bypass RLS, use the service role client
    const adminSupabase = await createServiceRoleClient();

    // Extract query parameters for pagination
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Await params to avoid Next.js dynamic API warning
    const resolvedParams = await Promise.resolve(params);
    const campaignId = resolvedParams.id;
    
    if (!campaignId) {
      return NextResponse.json(
        { error: 'Campaign ID is required' },
        { status: 400 }
      );
    }

    // 1. Get segments associated with this campaign
    const { data: campaignSegmentsData, error: campaignSegmentsError } = await adminSupabase
      .from('campaign_segments')
      .select('segment_id')
      .eq('campaign_id', campaignId);
      
    console.log('[PREVIEW_RECIPIENTS] Fetched campaignSegmentsData:', JSON.stringify(campaignSegmentsData, null, 2));
    if (campaignSegmentsError) {
      console.error('[PREVIEW_RECIPIENTS] Error fetching campaign segments:', campaignSegmentsError);
      return handleServerError(campaignSegmentsError, 'Failed to fetch campaign segments');
    }
    
    const campaignSegments = campaignSegmentsData || [];
    console.log('[PREVIEW_RECIPIENTS] Parsed campaignSegments:', JSON.stringify(campaignSegments, null, 2));
    
    if (campaignSegments.length === 0) {
      console.log('[PREVIEW_RECIPIENTS] No campaign segments found for campaignId:', campaignId);
      return NextResponse.json({ 
        data: [], 
        count: 0,
        message: 'No segments associated with this campaign' 
      });
    }
    
    const segmentIds = campaignSegments.map(s => s.segment_id);
    console.log('[PREVIEW_RECIPIENTS] Extracted segmentIds:', JSON.stringify(segmentIds, null, 2));
    
    // 2. Get user IDs from user_segments table for these segments
    // Define types for our data
    type UserSegment = { user_id: string | null };
    
    // Use pagination to handle potentially large number of users
    let allUserSegments: UserSegment[] = [];
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
        console.error(`[PREVIEW_RECIPIENTS] Error fetching user segments (page ${page+1}):`, userSegmentsError);
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
    
    const userSegments = allUserSegments;
    console.log('[PREVIEW_RECIPIENTS] Total userSegments found:', userSegments.length);
    
    if (userSegments.length === 0) {
      return NextResponse.json({ 
        data: [], 
        count: 0,
        message: 'No users found in the selected segments' 
      });
    }
    
    // Filter out null or undefined user_ids before adding to the Set
    const uniqueUserIds = new Set(
      userSegments.map((us) => us.user_id).filter((id): id is string => id !== null && id !== undefined)
    );
    console.log('[PREVIEW_RECIPIENTS] uniqueUserIds Set size:', uniqueUserIds.size);
    
    // Convert Set back to array and limit to requested amount
    const userIdsToFetch = Array.from(uniqueUserIds).slice(0, limit);
    console.log('[PREVIEW_RECIPIENTS] Fetching details for users:', userIdsToFetch.length);
    
    // Fetch real user details using the getUserDetail function
    console.log('[PREVIEW_RECIPIENTS] Fetching real user details for', userIdsToFetch.length, 'users');
    
    // Fetch user details for each user ID
    const userDetailsPromises = userIdsToFetch.map(async (userId) => {
      try {
        const { data, error } = await getUserDetail(userId);
        if (error || !data) {
          console.warn(`[PREVIEW_RECIPIENTS] Could not fetch details for user ${userId}:`, error);
          // Return placeholder data if we can't get real data
          return {
            id: userId,
            user: {
              id: userId,
              email: `user-${userId.substring(0, 8)}@example.com`,
              first_name: 'Unknown',
              last_name: 'User'
            }
          };
        }
        
        // Return formatted user data
        return {
          id: userId,
          user: {
            id: userId,
            email: data.email || `user-${userId.substring(0, 8)}@example.com`,
            first_name: data.first_name || 'User',
            last_name: data.last_name || userId.substring(0, 5)
          }
        };
      } catch (err) {
        console.error(`[PREVIEW_RECIPIENTS] Error fetching details for user ${userId}:`, err);
        // Return placeholder data on error
        return {
          id: userId,
          user: {
            id: userId,
            email: `user-${userId.substring(0, 8)}@example.com`,
            first_name: 'Error',
            last_name: 'Fetching'
          }
        };
      }
    });
    
    // Wait for all user detail requests to complete
    const formattedData = await Promise.all(userDetailsPromises);
    
    console.log('[PREVIEW_RECIPIENTS] Fetched details for', formattedData.length, 'users');
    
    return NextResponse.json({ 
      data: formattedData, 
      count: uniqueUserIds.size // Use the total unique users count
    });
    
  } catch (error: any) {
    console.error('Error fetching preview recipients:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch preview recipients' },
      { status: 500 }
    );
  }
}
