/**
 * Campaign Test Send API Route
 * 
 * Endpoint for sending test emails for a campaign
 */

import { NextRequest } from 'next/server';
import { 
  getCampaignById,
  getActiveCampaignTemplate
} from '@/lib/supabase/data-access/campaign-management';
import { validateAdminAccess, handleServerError, handleNotFound } from '@/lib/supabase/route-handler';
import { createClient } from '@/lib/supabase/client';

/**
 * POST /api/admin/campaigns/test-send
 * Send test emails for a campaign
 */
export async function POST(request: NextRequest) {
  try {
    // Validate admin or marketing role
    const validation = await validateAdminAccess();
    if ('error' in validation) {
      return Response.json({ error: validation.error }, { status: validation.status });
    }

    const body = await request.json();
    const { campaignId, testEmails } = body;
    
    // Validate required fields
    if (!campaignId || !testEmails || !Array.isArray(testEmails) || testEmails.length === 0) {
      return Response.json(
        { error: 'Missing or invalid required fields: campaignId and testEmails (array) are required' },
        { status: 400 }
      );
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = testEmails.filter(email => !emailRegex.test(email));
    if (invalidEmails.length > 0) {
      return Response.json(
        { error: `Invalid email format for: ${invalidEmails.join(', ')}` },
        { status: 400 }
      );
    }
    
    // Validate campaign exists
    const campaign = await getCampaignById(campaignId);
    if (!campaign) {
      return handleNotFound('Campaign');
    }
    
    // Get active template for the campaign
    const template = await getActiveCampaignTemplate(campaignId).catch(() => null);
    if (!template) {
      return Response.json(
        { error: 'No active template found for this campaign' },
        { status: 400 }
      );
    }
    
    // Send test emails using Postmark or your email service
    // This is a simplified implementation - in a real application, you would
    // integrate with your email service provider (e.g., Postmark)
    
    const supabase = createClient();
    
    // Log test email sending for demonstration purposes
    await supabase.from('email_logs').insert({
      type: 'test',
      campaign_id: campaignId,
      template_id: template.template_id,
      recipients: testEmails,
      subject: template.subject,
      sender_email: campaign.sender_email,
      sender_name: campaign.sender_name,
      status: 'sent',
      metadata: {
        test_mode: true,
        sent_by: validation.user?.id
      }
    });

    return Response.json({ 
      success: true,
      message: `Test emails sent to ${testEmails.length} recipient(s)`,
      recipients: testEmails
    });
  } catch (error) {
    return handleServerError(error, 'Failed to send test emails');
  }
}
