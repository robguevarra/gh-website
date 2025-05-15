/**
 * API Route for removing a specific segment from a campaign
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  validateAdminAccess,
  handleServerError,
  handleNotFound
} from '@/lib/supabase/route-handler';
import { 
  removeCampaignSegment,
  getCampaignById // To verify campaign exists
} from '@/lib/supabase/data-access/campaign-management';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; segment_id: string } }
) {
  try {
    const validation = await validateAdminAccess();
    if ('error' in validation) {
      return NextResponse.json({ error: validation.error }, { status: validation.status });
    }

    const { id: campaignId, segment_id: segmentId } = await params;

    if (!campaignId || !segmentId) {
      return NextResponse.json(
        { error: 'Missing campaignId or segmentId in path' },
        { status: 400 }
      );
    }

    // Optional: Validate campaign exists
    const campaign = await getCampaignById(campaignId);
    if (!campaign) {
      return handleNotFound('Campaign');
    }

    // Call the data access function to remove the segment
    const success = await removeCampaignSegment(campaignId, segmentId);

    if (!success) {
      // removeCampaignSegment throws an error on failure, which will be caught by the main try/catch
      // However, if it were to return false for a non-error failure, we'd handle it here.
      // For now, this path might not be hit if removeCampaignSegment always throws.
      return NextResponse.json(
        { error: 'Failed to remove segment from campaign for an unknown reason' }, 
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'Segment removed from campaign successfully' }, { status: 200 });

  } catch (error: any) {
    // The error from removeCampaignSegment (e.g., if Supabase had an issue) will be caught here.
    // handleServerError will check if it's a Supabase error and format it, or use the fallback.
    return handleServerError(error, 'Failed to remove segment from campaign');
  }
}
