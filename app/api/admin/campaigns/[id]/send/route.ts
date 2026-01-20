/**
 * SIMPLE Campaign Sending API Route
 * Optimized to use SQL-based bulk queueing to avoid timeouts
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getCampaignById,
  updateCampaign,
  recalculateCampaignAnalytics
} from '@/lib/supabase/data-access/campaign-management';
import { validateAdminAccess, handleServerError, handleNotFound } from '@/lib/supabase/route-handler';
import { getAdminClient } from '@/lib/supabase/admin';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: campaignId } = await params;
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

    // Check for Scheduling payload
    // If request body has 'scheduledAt', this is a schedule operation
    let scheduledAt: string | null = null;
    try {
      const body = await request.json();
      if (body.scheduledAt) {
        scheduledAt = body.scheduledAt;
      }
    } catch (e) {
      // Body reading might fail if empty, which is fine for normal "send now" requests
    }

    if (scheduledAt) {
      // SCHEDULING MODE
      console.log(`[SCHEDULE] Scheduling campaign ${campaignId} for ${scheduledAt}`);

      // Update status to scheduled
      await updateCampaign(campaignId, {
        status: 'scheduled',
        status_message: 'Waiting for scheduled time',
        scheduled_at: scheduledAt
      });

      return NextResponse.json({
        success: true,
        message: `Campaign scheduled for ${scheduledAt}`,
        details: { scheduledAt }
      });
    }

    // IMMEDIATE SEND MODE
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

    // 3. Bulk Queue via RPC - STREAMING RESPONSE
    // We use a ReadableStream to stream progress back to the client
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const BATCH_SIZE = 1000;
          let totalQueued = 0;

          // 1. Resolve Audience (Paginated Fetch)
          const allUserIds: string[] = [];
          const PAGE_SIZE = 1000;
          let page = 0;
          let hasMore = true;

          while (hasMore) {
            const { data: userIdsData, error: userFetchError } = await adminClient
              .from('user_segments')
              .select('user_id')
              .in('segment_id', segmentIds)
              .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

            if (userFetchError) throw new Error(`Failed to fetch audience: ${userFetchError.message}`);

            if (userIdsData && userIdsData.length > 0) {
              const newIds = userIdsData.map(u => u.user_id);
              allUserIds.push(...newIds);

              if (userIdsData.length < PAGE_SIZE) {
                hasMore = false;
              } else {
                page++;
              }

              // Optional: Emit progress for fetching phase if it takes too long
              if (page % 5 === 0) {
                controller.enqueue(encoder.encode(JSON.stringify({
                  type: 'progress',
                  current: 0,
                  total: 0,
                  message: `Fetching audience... (${allUserIds.length} found so far)`
                }) + '\n'));
              }
            } else {
              hasMore = false;
            }
          }

          const uniqueUserIds = Array.from(new Set(allUserIds));
          const totalRecipients = uniqueUserIds.length;

          console.log(`[Campaign Send] Found ${totalRecipients} unique recipients.`);

          if (totalRecipients === 0) {
            controller.enqueue(encoder.encode(JSON.stringify({ type: 'error', message: 'No recipients found' }) + '\n'));
            controller.close();
            return;
          }

          // Initial Progress Update
          controller.enqueue(encoder.encode(JSON.stringify({
            type: 'start',
            total: totalRecipients
          }) + '\n'));

          // 2. Process in Batches
          for (let i = 0; i < totalRecipients; i += BATCH_SIZE) {
            const batch = uniqueUserIds.slice(i, i + BATCH_SIZE);

            // Log & Stream Progress
            const progressMsg = `Queueing batch ${Math.floor(i / BATCH_SIZE) + 1} of ${Math.ceil(totalRecipients / BATCH_SIZE)}...`;
            console.log(`[Campaign Send] ${progressMsg}`);

            controller.enqueue(encoder.encode(JSON.stringify({
              type: 'progress',
              current: i,
              total: totalRecipients,
              message: progressMsg
            }) + '\n'));

            // @ts-ignore
            const { error: batchError } = await adminClient.rpc('queue_emails_for_users', {
              p_campaign_id: campaign.id,
              p_user_ids: batch
            });

            if (batchError) {
              throw new Error(`Batch insertion failed: ${batchError.message}`);
            }
            totalQueued += batch.length;
          }

          // Final Success Update
          controller.enqueue(encoder.encode(JSON.stringify({
            type: 'complete',
            queued: totalQueued
          }) + '\n'));

          // Legacy Logic: Update Status & Trigger Worker
          await updateCampaign(campaignId, {
            status: 'sent',
            status_message: `Successfully queued ${totalQueued} recipients`
          });

          // Initialize Campaign Analytics (Set total_recipients)
          // We call recalculate to ensure the 'total_recipients' matches the actual jobs created
          try {
            await recalculateCampaignAnalytics(campaignId);
            console.log(`[SEND] Initialized analytics for campaign ${campaignId}`);
          } catch (analyticsError) {
            console.error(`[SEND] Failed to initialize analytics:`, analyticsError);
            // Don't fail the request, just log it
          }

          // Trigger Worker (Fire and Forget)
          adminClient.functions.invoke('email-worker', { body: { type: 'process_queue' } }).catch(e => console.error(e));

        } catch (error: any) {
          console.error('[Stream Error]', error);
          controller.enqueue(encoder.encode(JSON.stringify({ type: 'error', message: error.message }) + '\n'));
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'application/x-ndjson',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });

  } catch (error: any) {
    console.error(`[SEND] Unhandled error in campaign send route:`, error);
    return handleServerError(error, 'Failed to send campaign');
  }
}


