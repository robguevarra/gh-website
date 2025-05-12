/**
 * Campaign Send API Route
 * 
 * Endpoint for triggering the delivery of a campaign
 */

import { NextRequest } from 'next/server';
import { 
  getCampaignById,
  getActiveCampaignTemplate,
  getCampaignRecipients,
  addRecipientsFromSegments,
  updateCampaign
} from '@/lib/supabase/data-access/campaign-management';
import { validateAdminAccess, handleServerError, handleNotFound } from '@/lib/supabase/route-handler';
import { createClient } from '@/lib/supabase/client';
import { createAdminClient } from '@/lib/supabase/admin-client';

/**
 * POST /api/admin/campaigns/send
 * Trigger the delivery of a campaign
 */
export async function POST(request: NextRequest) {
  try {
    // Validate admin or marketing role
    const validation = await validateAdminAccess();
    if ('error' in validation) {
      return Response.json({ error: validation.error }, { status: validation.status });
    }

    const body = await request.json();
    const { campaignId } = body;
    
    // Validate required fields
    if (!campaignId) {
      return Response.json(
        { error: 'Missing required field: campaignId' },
        { status: 400 }
      );
    }
    
    // Validate campaign exists
    const campaign = await getCampaignById(campaignId);
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
    
    // Get active template for the campaign
    const template = await getActiveCampaignTemplate(campaignId).catch(() => null);
    if (!template) {
      return Response.json(
        { error: 'No active template found for this campaign' },
        { status: 400 }
      );
    }
    
    // Ensure campaign has recipients
    const { data: recipients, count } = await getCampaignRecipients(campaignId, { limit: 1 });
    if (!count || count === 0) {
      // Try to add recipients from segments
      const { count: addedCount } = await addRecipientsFromSegments(campaignId);
      
      if (addedCount === 0) {
        return Response.json(
          { error: 'Campaign has no recipients. Add segments or recipients before sending.' },
          { status: 400 }
        );
      }
    }
    
    // Update campaign status to 'sending'
    await updateCampaign(campaignId, { status: 'sending' });
    
    // In a real implementation, you would:
    // 1. Queue the campaign for delivery using a background job
    // 2. Process recipients in batches to avoid overloading the email service
    // 3. Track delivery status and update campaign_recipients records
    // 4. Update campaign analytics as emails are sent and events are received
    
    // For this implementation, we'll simulate the process by:
    // 1. Updating the campaign status
    // 2. Creating a log entry
    
    const supabase = createClient();
    const adminClient = createAdminClient();
    
    // Log campaign sending
    await supabase.from('email_logs').insert({
      type: 'campaign',
      campaign_id: campaignId,
      template_id: template.template_id,
      subject: template.subject,
      sender_email: campaign.sender_email,
      sender_name: campaign.sender_name,
      status: 'queued',
      metadata: {
        initiated_by: validation.user?.id,
        recipient_count: count || 0
      }
    });
    
    // In a real implementation, you would trigger a background job here
    // For demonstration, we'll update the campaign status after a short delay
    setTimeout(async () => {
      try {
        // Update campaign status to 'completed'
        await adminClient
          .from('email_campaigns')
          .update({ 
            status: 'completed',
            completed_at: new Date().toISOString()
          })
          .eq('id', campaignId);
          
        // Update log status
        await adminClient
          .from('email_logs')
          .update({ status: 'completed' })
          .eq('campaign_id', campaignId)
          .eq('type', 'campaign');
      } catch (error) {
        console.error('Error updating campaign status:', error);
      }
    }, 5000); // 5 seconds delay for demonstration

    return Response.json({ 
      success: true,
      message: 'Campaign delivery initiated',
      campaign: {
        id: campaignId,
        status: 'sending'
      }
    });
  } catch (error) {
    return handleServerError(error, 'Failed to send campaign');
  }
}
