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
  updateCampaign,
  getCampaignSegments,
  CampaignRecipient
} from '@/lib/supabase/data-access/campaign-management';
import { validateAdminAccess, handleServerError, handleNotFound } from '@/lib/supabase/route-handler';
import { createClient } from '@/lib/supabase/client';
import { addToQueue } from '@/lib/email/queue-utils';

interface RecipientWithEmail extends CampaignRecipient {
  email: string;
  user_data?: Record<string, any>;
}

/**
 * POST /api/admin/campaigns/send
 * Trigger the delivery of a campaign by adding recipients to the queue
 */
export async function POST(request: NextRequest) {
  try {
    // Validate admin or marketing role
    const validation = await validateAdminAccess();
    if ('error' in validation) {
      return Response.json({ error: validation.error }, { status: validation.status });
    }

    const body = await request.json();
    const { campaignId: requestCampaignId } = body;
    
    // Validate required fields
    if (!requestCampaignId) {
      return Response.json(
        { error: 'Missing required field: campaignId' },
        { status: 400 }
      );
    }
    
    // Store campaign ID in a non-null variable since we've validated it
    const campaignId = requestCampaignId;
    
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
    
    // Check if campaign has segments
    const segments = await getCampaignSegments(campaignId);
    if (!segments || segments.length === 0) {
      return Response.json(
        { error: 'Campaign has no segments. Add segments before sending.' },
        { status: 400 }
      );
    }
    
    // Update campaign status to 'queued'
    await updateCampaign(campaignId, { 
      status: 'queued',
      scheduled_at: new Date().toISOString() // Set scheduled_at to now for immediate sending
    });
    
    // Get all recipients from segments
    const { count: recipientCount } = await addRecipientsFromSegments(campaignId);
    
    if (!recipientCount || recipientCount === 0) {
      await updateCampaign(campaignId, { status: 'draft' });
      return Response.json(
        { error: 'No recipients found in the selected segments' },
        { status: 400 }
      );
    }
    
    // Get recipients in batches and add to queue
    const BATCH_SIZE = 100;
    let offset = 0;
    let hasMore = true;
    let totalProcessed = 0;
    
    while (hasMore) {
      const { data: recipients } = await getCampaignRecipients(campaignId, { 
        limit: BATCH_SIZE, 
        offset 
      });
      
      if (!recipients || recipients.length === 0) {
        hasMore = false;
        continue;
      }
      
      // Add recipients to queue
      const queuePromises = recipients.map((recipient: any) => {
        const email = recipient.user?.email || recipient.email;
        const userData = recipient.user_data || {};
        
        if (!email) {
          console.warn('Recipient has no email:', recipient.id);
          return Promise.resolve();
        }
        
        return addToQueue({
          campaignId,
          recipientEmail: email,
          recipientData: userData,
          priority: 0 // Default priority
        }).then(() => {
          totalProcessed++;
        });
      });
      
      await Promise.all(queuePromises);
      offset += BATCH_SIZE;
    }
    
    if (totalProcessed === 0) {
      await updateCampaign(campaignId, { status: 'draft' });
      return Response.json(
        { error: 'No valid recipients found to add to the queue' },
        { status: 400 }
      );
    }
    
    // Update campaign status to 'sending'
    await updateCampaign(campaignId, { status: 'sending' });
    
    // Log campaign sending
    const supabase = createClient();
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
        recipient_count: totalProcessed
      },
      created_at: new Date().toISOString()
    });
    
    // Return success response
    return Response.json(
      { 
        success: true, 
        message: 'Campaign queued for sending',
        totalProcessed,
        campaign: {
          id: campaignId,
          status: 'sending'
        }
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error sending campaign:', error);
    
    // We can't access campaignId here since it's scoped to the try block
    // The error will be logged and can be handled by the error boundary
    return handleServerError(error, 'Failed to send campaign');
  }
}
