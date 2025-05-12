/**
 * Campaign Test Sending API Route
 * 
 * Endpoint for sending test emails for a campaign
 */

import { NextRequest } from 'next/server';
import { 
  getCampaignById,
  sendCampaignTest,
  getActiveCampaignTemplate
} from '@/lib/supabase/data-access/campaign-management';
import { validateAdminAccess, handleServerError, handleNotFound } from '@/lib/supabase/route-handler';

/**
 * POST /api/admin/campaigns/[id]/test
 * Send test emails for a campaign
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
    const { testEmails } = body;
    
    // Validate required fields
    if (!testEmails || !Array.isArray(testEmails) || testEmails.length === 0) {
      return Response.json(
        { error: 'Missing or invalid required field: testEmails must be a non-empty array of email addresses' },
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
    const campaign = await getCampaignById(id);
    if (!campaign) {
      return handleNotFound('Campaign');
    }
    
    // Validate campaign has an active template
    const template = await getActiveCampaignTemplate(id).catch(() => null);
    if (!template) {
      return Response.json(
        { error: 'Campaign must have an active template before sending test emails' },
        { status: 400 }
      );
    }
    
    // Send test emails
    const result = await sendCampaignTest(id, testEmails);

    return Response.json({ 
      success: true,
      message: `Test emails sent to ${testEmails.length} recipient(s)`,
      details: result
    });
  } catch (error) {
    return handleServerError(error, 'Failed to send test emails');
  }
}
