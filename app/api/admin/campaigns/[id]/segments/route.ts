/**
 * Campaign Segments API Route
 * 
 * Endpoints for managing segments associated with a campaign
 */

import { NextRequest } from 'next/server';
import { 
  getCampaignById,
  getCampaignSegments,
  addCampaignSegment
} from '@/lib/supabase/data-access/campaign-management';
import { validateAdminAccess, handleServerError, handleNotFound } from '@/lib/supabase/route-handler';

/**
 * GET /api/admin/campaigns/[id]/segments
 * Get segments for a specific campaign
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Validate admin or marketing role
    const validation = await validateAdminAccess();
    if ('error' in validation) {
      return Response.json({ error: validation.error }, { status: validation.status });
    }

    const { id } = await params;
    
    // Validate campaign exists
    const campaign = await getCampaignById(id);
    if (!campaign) {
      return handleNotFound('Campaign');
    }
    
    // Get campaign segments
    const segments = await getCampaignSegments(id);

    return Response.json({ segments });
  } catch (error) {
    return handleServerError(error, 'Failed to fetch campaign segments');
  }
}

/**
 * POST /api/admin/campaigns/[id]/segments
 * Add a segment to a campaign
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Validate admin or marketing role
    const validation = await validateAdminAccess();
    if ('error' in validation) {
      return Response.json({ error: validation.error }, { status: validation.status });
    }

    const { id } = await params;
    const body = await request.json();
    const { segmentId } = body;
    
    // Validate required fields
    if (!segmentId) {
      return Response.json(
        { error: 'Missing required field: segmentId' },
        { status: 400 }
      );
    }
    
    // Validate campaign exists
    const campaign = await getCampaignById(id);
    if (!campaign) {
      return handleNotFound('Campaign');
    }
    
    // Add segment to campaign
    const campaignSegment = await addCampaignSegment({
      campaign_id: id,
      segment_id: segmentId
    });

    return Response.json({ 
      segment: campaignSegment,
      message: 'Segment added to campaign'
    }, { status: 201 });
  } catch (error) {
    return handleServerError(error, 'Failed to add segment to campaign');
  }
}
