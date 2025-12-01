/**
 * SIMPLE Campaign Sending API Route
 * Just send emails to 5000+ recipients without overengineering
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCampaignById, updateCampaign } from '@/lib/supabase/data-access/campaign-management';
import { validateAdminAccess, handleServerError, handleNotFound } from '@/lib/supabase/route-handler';
import { getAdminClient } from '@/lib/supabase/admin';
import type { Database, Json } from '@/types/supabase';

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

    // 2. Get Segments
    if (!campaign.segment_rules?.include?.segmentIds?.length) {
      console.warn(`[SEND] No segment rules configured for campaign ${campaignId}`);
      await updateCampaign(campaignId, { status: 'draft', status_message: 'Send failed: No segment rules configured' });
      return NextResponse.json({ message: 'No segment rules configured' }, { status: 400 });
    }

    console.log(`[SEND] Fetching user segments for IDs: ${campaign.segment_rules.include.segmentIds.join(', ')}`);

    // Get ALL users from segments (not just 1000 due to Supabase default limit)
    let allUserSegments: any[] = [];
    let from = 0;
    const pageSize = 1000;

    try {
      while (true) {
        const { data: userSegmentsBatch, error: segmentError } = await adminClient
          .from('user_segments')
          .select('user_id')
          .in('segment_id', campaign.segment_rules.include.segmentIds)
          .range(from, from + pageSize - 1);

        if (segmentError) {
          throw new Error(`Failed to fetch user segments: ${segmentError.message}`);
        }

        if (!userSegmentsBatch || userSegmentsBatch.length === 0) {
          break;
        }

        allUserSegments.push(...userSegmentsBatch);

        if (userSegmentsBatch.length < pageSize) {
          break;
        }

        from += pageSize;
      }
    } catch (segmentErr: any) {
      console.error(`[SEND] Error fetching segments:`, segmentErr);
      await updateCampaign(campaignId, { status: 'error', status_message: `Error fetching segments: ${segmentErr.message}` });
      return NextResponse.json({ error: segmentErr.message }, { status: 500 });
    }

    const userIds = [...new Set(allUserSegments.map((us: any) => us.user_id))];
    console.log(`[SEND] Found ${userIds.length} unique users from segments`);

    if (userIds.length === 0) {
      console.warn(`[SEND] No users found in selected segments`);
      await updateCampaign(campaignId, { status: 'draft', status_message: 'Send aborted: No users found in segments' });
      return NextResponse.json({ message: 'No users found in segments' }, { status: 200 });
    }

    // 3. Get Profiles
    console.log(`[SEND] Fetching ${userIds.length} profiles in batches...`);
    const profileBatchSize = 500; // Larger batches, still safe for IN queries
    type UnifiedProfileLite = { id: string; email: string; first_name?: string | null; last_name?: string | null };
    const allProfiles: UnifiedProfileLite[] = [];

    try {
      for (let i = 0; i < userIds.length; i += profileBatchSize) {
        const batch = userIds.slice(i, i + profileBatchSize);
        const { data: batchProfiles, error: batchError } = await adminClient
          .from('unified_profiles')
          .select('id, email, first_name, last_name')
          .in('id', batch)
          .not('email', 'is', null)
          .or('email_bounced.is.null,email_bounced.eq.false');

        if (batchError) {
          throw new Error(`Failed to fetch profiles batch at index ${i}: ${batchError.message}`);
        }

        if (batchProfiles && batchProfiles.length > 0) {
          allProfiles.push(...(batchProfiles as UnifiedProfileLite[]));
        }
      }
    } catch (profileErr: any) {
      console.error(`[SEND] Error fetching profiles:`, profileErr);
      await updateCampaign(campaignId, { status: 'error', status_message: `Error fetching profiles: ${profileErr.message}` });
      return NextResponse.json({ error: profileErr.message }, { status: 500 });
    }

    console.log(`[SEND] Got ${allProfiles.length} valid profiles with emails`);

    if (allProfiles.length === 0) {
      console.warn(`[SEND] No valid recipients found (checked ${userIds.length} users)`);
      await updateCampaign(campaignId, { status: 'draft', status_message: 'Send aborted: No valid recipients found' });
      return NextResponse.json({ message: 'No valid recipients found' }, { status: 200 });
    }

    // 4. Duplicate Check
    console.log(`[SEND] Checking duplicates in email_queue...`);
    const emailsLower = allProfiles.map(p => p.email.toLowerCase());
    const dupCheckBatch = 1000;
    const emailsAlreadyInQueue = new Set<string>();

    try {
      for (let i = 0; i < emailsLower.length; i += dupCheckBatch) {
        const batch = emailsLower.slice(i, i + dupCheckBatch);
        const { data: existing, error: dupErr } = await adminClient
          .from('email_queue')
          .select('recipient_email')
          .eq('campaign_id', campaignId)
          .in('recipient_email', batch);
        if (dupErr) {
          console.warn(`[SEND] Duplicate check error (continuing):`, dupErr.message);
          continue;
        }
        (existing || []).forEach((row: { recipient_email: string }) => {
          if (row.recipient_email) emailsAlreadyInQueue.add(row.recipient_email.toLowerCase());
        });
      }
    } catch (dupCheckErr) {
      console.error(`[SEND] Error during duplicate check:`, dupCheckErr);
      // We continue even if duplicate check fails, relying on DB constraints if any, or just accepting some dupes is better than failing
    }

    const finalProfilesToQueue = allProfiles.filter(p => !emailsAlreadyInQueue.has(p.email.toLowerCase()));

    if (finalProfilesToQueue.length === 0) {
      console.log('[SEND] No new recipients to queue after duplicate check.');
      await updateCampaign(campaignId, { status: 'sent', status_message: 'All recipients were already queued.' });
      return NextResponse.json({ message: 'All recipients already queued for this campaign.' }, { status: 200 });
    }

    // 5. Queue Emails
    console.log(`[SEND] Queueing ${finalProfilesToQueue.length} emails in bulk...`);
    type EmailQueueInsert = Database['public']['Tables']['email_queue']['Insert'];
    let successCount = 0;
    const insertBatchSize = 1000;

    try {
      for (let i = 0; i < finalProfilesToQueue.length; i += insertBatchSize) {
        const batch = finalProfilesToQueue.slice(i, i + insertBatchSize);
        const items: EmailQueueInsert[] = batch.map((profile) => ({
          campaign_id: campaignId,
          recipient_email: profile.email,
          recipient_data: profile as unknown as Json,
          priority: campaign.priority || 1,
          status: 'pending',
          scheduled_at: new Date().toISOString()
        }));

        const { data: inserted, error: insertError } = await adminClient
          .from('email_queue')
          .insert(items as EmailQueueInsert[])
          .select('id');

        if (insertError) {
          console.error(`[SEND] Failed to insert queue batch at index ${i}:`, insertError);
          // We continue to try other batches
          continue;
        }
        successCount += inserted?.length || items.length;
      }
    } catch (queueErr: any) {
      console.error(`[SEND] Error queueing emails:`, queueErr);
      // If we managed to queue SOME emails, we might want to keep it as 'sending' or 'partial'
      // But if successCount is 0, it's a failure
      if (successCount === 0) {
        await updateCampaign(campaignId, { status: 'error', status_message: `Failed to queue emails: ${queueErr.message}` });
        return NextResponse.json({ error: 'Failed to queue emails' }, { status: 500 });
      }
    }

    console.log(`[SEND] Successfully queued ${successCount}/${finalProfilesToQueue.length} new emails`);

    // Update status to sent
    if (successCount > 0) {
      await updateCampaign(campaignId, {
        status: 'sent',
        status_message: `Successfully queued ${successCount} recipients`
      });
      console.log(`[SEND] Campaign status updated to sent`);
    } else {
      // If we got here and successCount is 0 (but no exception thrown above), it means all inserts failed
      console.error(`[SEND] All insert batches failed.`);
      await updateCampaign(campaignId, { status: 'error', status_message: 'Failed to queue any emails' });
      return NextResponse.json({ error: 'Failed to queue emails' }, { status: 500 });
    }

    // 6. Trigger Processing
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
      console.log(`[SEND] Campaign status updated to error`);
    } catch (revertError) {
      console.error(`[SEND] Failed to update campaign status to error:`, revertError);
    }
    return handleServerError(error, 'Failed to send campaign');
  }
}
