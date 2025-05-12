/**
 * Campaign Scheduling API Route
 * 
 * Endpoint for scheduling a campaign for delivery
 */

import { NextRequest } from 'next/server';
import { 
  getCampaignById, 
  scheduleCampaign,
  getActiveCampaignTemplate
} from '@/lib/supabase/data-access/campaign-management';
import { validateAdminAccess, handleServerError, handleNotFound } from '@/lib/supabase/route-handler';

/**
 * POST /api/admin/campaigns/[id]/schedule
 * Schedule a campaign for delivery
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

    const { id } = params;
    const body = await request.json();
    const { scheduledAt } = body;
    
    // Validate required fields
    if (!scheduledAt) {
      return Response.json(
        { error: 'Missing required field: scheduledAt' },
        { status: 400 }
      );
    }
    
    // Validate date format
    const scheduledDate = new Date(scheduledAt);
    if (isNaN(scheduledDate.getTime())) {
      return Response.json(
        { error: 'Invalid date format for scheduledAt' },
        { status: 400 }
      );
    }
    
    // Validate campaign exists
    const campaign = await getCampaignById(id);
    if (!campaign) {
      return handleNotFound('Campaign');
    }
    
    // Validate campaign status
    if (campaign.status !== 'draft') {
      return Response.json(
        { error: 'Only draft campaigns can be scheduled' },
        { status: 400 }
      );
    }
    
    // Validate campaign has an active template
    const template = await getActiveCampaignTemplate(id).catch(() => null);
    if (!template) {
      return Response.json(
        { error: 'Campaign must have an active template before scheduling' },
        { status: 400 }
      );
    }
    
    // Schedule campaign
    const updatedCampaign = await scheduleCampaign(id, scheduledAt);

    return Response.json({ 
      campaign: updatedCampaign,
      message: 'Campaign scheduled successfully'
    });
  } catch (error) {
    return handleServerError(error, 'Failed to schedule campaign');
  }
}
