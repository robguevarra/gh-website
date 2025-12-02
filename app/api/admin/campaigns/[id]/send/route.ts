/**
 * SIMPLE Campaign Sending API Route
 * Optimized to use SQL-based bulk queueing to avoid timeouts
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCampaignById, updateCampaign } from '@/lib/supabase/data-access/campaign-management';
import { validateAdminAccess, handleServerError, handleNotFound } from '@/lib/supabase/route-handler';
import { getAdminClient } from '@/lib/supabase/admin';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id: campaignId } = params;
  console.log(`[SEND] Starting send process for campaign ${campaignId}`);

  try {
    const validation = await validateAdminAccess();
    if ('error' in validation) {
      console.warn(`[SEND] Admin access validation failed for campaign ${campaignId}`);
      return NextResponse.json({ error: validation.error }, { status: validation.status });
    }

    const adminClient = getAdminClient();

    // 1. Fetch Campaign
    console.log(`[SEND] Fetching campaign details...`);
    const campaign = await getCampaignById(campaignId);
    if (!campaign) {
      console.error(`[SEND] Campaign ${campaignId} not found`);
      return handleNotFound('Campaign');
    }

    if (campaign.status !== 'draft' && campaign.status !== 'scheduled' && campaign.status !== 'error') {
      console.warn(`[SEND] Invalid status for sending: ${campaign.status}`);
      return NextResponse.json(
        { error: 'Only draft, scheduled, or error campaigns can be sent' },
        { status: 400 }
      );
    }

    // Update status to sending
    await updateCampaign(campaignId, { status: 'sending', status_message: 'Starting send process...' });
    console.log(`[SEND] Campaign ${campaignId} status updated to sending`);

    // 2. Validate Segments
    if (!campaign.segment_rules?.include?.segmentIds?.length) {
      console.warn(`[SEND] No segment rules configured for campaign ${campaignId}`);
      await updateCampaign(campaignId, { status: 'draft', status_message: 'Send failed: No segment rules configured' });
      return NextResponse.json({ message: 'No segment rules configured' }, { status: 400 });
    }

    const segmentIds = campaign.segment_rules.include.segmentIds;
    console.log(`[SEND] Queueing emails for segments: ${segmentIds.join(', ')}`);

    // 3. Bulk Queue via RPC
    // This replaces the slow fetch-and-insert loop with a single database operation
    let successCount = 0;
    try {
      const { data, error } = await adminClient.rpc('queue_campaign_emails', {
        p_campaign_id: campaignId,
        p_segment_ids: segmentIds
      });

      if (error) {
        throw new Error(`RPC call failed: ${error.message}`);
      }

      successCount = data as number;
      console.log(`[SEND] Successfully queued ${successCount} emails via RPC`);

    } catch (rpcError: any) {
      console.error(`[SEND] Error queueing emails via RPC:`, rpcError);
      await updateCampaign(campaignId, { status: 'error', status_message: `Failed to queue emails: ${rpcError.message}` });
      return NextResponse.json({ error: 'Failed to queue emails' }, { status: 500 });
    }

    if (successCount === 0) {
      console.warn(`[SEND] No new recipients queued (0 matches or all duplicates)`);
      // Check if we should mark as sent (if duplicates existed) or draft (if no users)
      // For now, let's mark as sent with a note, or revert to draft if truly empty.
      // But "sent" with 0 count is confusing. Let's check if it was due to duplicates.
      // Actually, for simplicity, if 0 queued, we can say "No new recipients found".
      // We'll revert to draft so they can try again or check segments.
      await updateCampaign(campaignId, { status: 'draft', status_message: 'Send aborted: No new recipients found' });
      return NextResponse.json({ message: 'No new recipients found (check segments or duplicates)' }, { status: 200 });
    }

    // 4. Update Status
    await updateCampaign(campaignId, {
      status: 'sent',
      status_message: `Successfully queued ${successCount} recipients`
    });
    console.log(`[SEND] Campaign status updated to sent`);

    // 5. Trigger Processing
    console.log(`[SEND] Triggering immediate email processing...`);
    try {
      const { data: processResponse, error: processError } = await adminClient.functions.invoke(
        'process-email-queue',
        { body: { triggered_by: 'immediate_send' } }
      );
      if (processError) {
        console.warn(`[SEND] Warning: Failed to trigger immediate email processing:`, processError);
      } else {
        console.log(`[SEND] Email processing triggered:`, processResponse);
      }
    } catch (triggerError) {
      console.warn(`[SEND] Warning: Exception when triggering email processing:`, triggerError);
    }

    return NextResponse.json({
      success: true,
      message: `Campaign sent! ${successCount} emails queued.`,
      details: { queuedCount: successCount }
    });

  } catch (error: any) {
    console.error(`[SEND] Unhandled error in campaign send route:`, error);
    // Revert status on error
    try {
      await updateCampaign(campaignId, { status: 'error', status_message: `Internal Error: ${error.message}` });
    } catch (revertError) {
      console.error(`[SEND] Failed to update campaign status to error:`, revertError);
    }
    return handleServerError(error, 'Failed to send campaign');
  }
}
