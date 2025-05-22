import { NextRequest, NextResponse } from 'next/server';
import { validateAdminAccess, handleServerError, handleNotFound } from '@/lib/supabase/route-handler';
import { getAdminClient } from '@/lib/supabase/admin';
import { getCampaignById } from '@/lib/supabase/data-access/campaign-management'; // To fetch campaign details

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const validation = await validateAdminAccess();
    if ('error' in validation) {
      return NextResponse.json({ error: validation.error }, { status: validation.status });
    }

    const { id: campaignId } = await params;
    if (!campaignId) {
      return NextResponse.json({ error: 'Campaign ID is required' }, { status: 400 });
    }

    const adminClient = getAdminClient();

    // Fetch the campaign to get its current status and potentially the initial recipient count
    const campaign = await getCampaignById(campaignId);
    if (!campaign) {
      return handleNotFound('Campaign');
    }

    // Fetch counts from email_queue
    // const { data: queueStats, error: queueError } = await adminClient
    //   .from('email_queue')
    //   .select('status, count')
    //   .eq('campaign_id', campaignId)
    //   .returns<Array<{ status: string; count: number }>>();

    // if (queueError) {
    //   console.error(`[API SENDING-STATS /${campaignId}] Error fetching email_queue stats:`, queueError);
    //   return handleServerError(queueError, 'Failed to fetch email queue statistics');
    // }
    
    let processedCount = 0;
    let failedPermanentCount = 0;
    let retryingCount = 0;
    let pendingCount = 0; // Emails still in 'pending' state in the queue

    // A more direct way to get counts if the DB doesn't do the aggregation for us:
    const { count: processed, error: processedErr } = await adminClient.from('email_queue').select('*', { count: 'exact', head: true }).eq('campaign_id', campaignId).eq('status', 'sent');
    const { count: failed, error: failedErr } = await adminClient.from('email_queue').select('*', { count: 'exact', head: true }).eq('campaign_id', campaignId).eq('status', 'failed');
    const { count: retrying, error: retryingErr } = await adminClient.from('email_queue').select('*', { count: 'exact', head: true }).eq('campaign_id', campaignId).eq('status', 'retrying');
    const { count: pending, error: pendingErr } = await adminClient.from('email_queue').select('*', { count: 'exact', head: true }).eq('campaign_id', campaignId).eq('status', 'pending');

    if (processedErr || failedErr || retryingErr || pendingErr) {
        console.error(`[API SENDING-STATS /${campaignId}] Error fetching specific queue counts:`, {processedErr, failedErr, retryingErr, pendingErr });
        // Potentially return partial data or a more specific error
    }

    processedCount = processed || 0;
    failedPermanentCount = failed || 0;
    retryingCount = retrying || 0;
    pendingCount = pending || 0;

    // Fetch total_recipients from campaign_analytics as a proxy for initially_queued_count
    // This assumes recalculateCampaignAnalytics correctly sets total_recipients to the initial target audience size.
    // A more robust solution would be to store this number explicitly on email_campaigns when the send is initiated.
    const { data: analytics, error: analyticsError } = await adminClient
      .from('campaign_analytics')
      .select('total_recipients, total_sent') // total_sent can also be useful
      .eq('campaign_id', campaignId)
      .single();

    if (analyticsError && analyticsError.code !== 'PGRST116') { // PGRST116 = zero rows, which is fine if no analytics yet
      console.error(`[API SENDING-STATS /${campaignId}] Error fetching campaign_analytics:`, analyticsError);
      // Don't fail the whole request, just might not have totalQueued
    }

    const totalQueued = analytics?.total_recipients || 0; // Using total_recipients as proxy

    return NextResponse.json({
      success: true,
      stats: {
        campaignId,
        campaignStatus: campaign.status,
        totalQueued, // Total initially targeted or added to queue
        processedCount,
        failedPermanentCount,
        retryingCount,
        pendingCount, // Emails still in 'pending' and not yet 'processing'
        totalSentByProvider: analytics?.total_sent || 0, // From analytics, how many Postmark accepted
      },
    });

  } catch (error) {
    console.error(`[API SENDING-STATS] Unhandled error:`, error);
    return handleServerError(error, 'Failed to fetch campaign sending statistics');
  }
} 