/**
 * Campaign Sending API Route
 * 
 * Endpoint for triggering the delivery of a campaign
 */

import { NextRequest } from 'next/server';
import { 
  getCampaignById,
  triggerCampaignSend,
  getActiveCampaignTemplate,
  getCampaignRecipients,
  addRecipientsFromSegments,
  CampaignAnalytics
} from '@/lib/supabase/data-access/campaign-management';
import { validateAdminAccess, handleServerError, handleNotFound } from '@/lib/supabase/route-handler';

/**
 * POST /api/admin/campaigns/[id]/send
 * Trigger the delivery of a campaign
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
    
    // Validate campaign exists
    const campaign = await getCampaignById(id);
    if (!campaign) {
      return handleNotFound('Campaign');
    }
    
    // Validate campaign status
    if (campaign.status !== 'draft' && campaign.status !== 'scheduled') {
      return Response.json(
        { error: 'Only draft or scheduled campaigns can be sent' },
        { status: 400 }
      );
    }
    
    // Validate campaign has an active template
    const template = await getActiveCampaignTemplate(id).catch(() => null);
    if (!template) {
      return Response.json(
        { error: 'Campaign must have an active template before sending' },
        { status: 400 }
      );
    }
    
    // Ensure campaign has recipients
    const { count } = await getCampaignRecipients(id, { limit: 1 });
    if (!count || count === 0) {
      // Try to add recipients from segments
      const { count: addedCount } = await addRecipientsFromSegments(id);
      
      if (addedCount === 0) {
        return Response.json(
          { error: 'Campaign has no recipients. Add segments or recipients before sending.' },
          { status: 400 }
        );
      }
    }
    
    // Initialize analytics for the campaign
    await CampaignAnalytics(id);
    
    // Trigger campaign send
    const result = await triggerCampaignSend(id);

    return Response.json({ 
      success: true,
      message: 'Campaign delivery started',
      details: result
    });
  } catch (error) {
    return handleServerError(error, 'Failed to send campaign');
  }
}
