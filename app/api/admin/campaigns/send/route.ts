/**
 * Campaign Send API Route
 * 
 * Endpoint for triggering the delivery of a campaign
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  getCampaignById,
  updateCampaign,
  populateCampaignRecipientsFromRules,
  recalculateCampaignAnalytics
} from '@/lib/supabase/data-access/campaign-management';
import { validateAdminAccess, handleServerError, handleNotFound } from '@/lib/supabase/route-handler';
import { getAdminClient } from '@/lib/supabase/admin';
import { addToQueue } from '@/lib/email/queue-utils';
import { UnifiedProfile } from '@/types/users';
import { SupabaseClient } from '@supabase/supabase-js';

/**
 * POST /api/admin/campaigns/send
 * Triggered by triggerCampaignSend; resolves audience and queues emails for immediate sending.
 */
export async function POST(request: NextRequest) {
  try {
    const validation = await validateAdminAccess();
    if ('error' in validation) {
      return NextResponse.json({ error: validation.error }, { status: validation.status });
    }

    const body = await request.json();
    const { campaignId } = body;
    
    if (!campaignId) {
      return NextResponse.json({ error: 'Missing required field: campaignId' }, { status: 400 });
    }
    
    const adminClient = getAdminClient();
    const campaign = await getCampaignById(campaignId);
    if (!campaign) {
      return handleNotFound('Campaign');
    }
    
    // Ensure campaign is in a valid state to be processed by this generic send route
    // It might be 'draft', 'scheduled' (if called directly) or 'sending' (if called by triggerCampaignSend)
    if (campaign.status !== 'draft' && campaign.status !== 'scheduled' && campaign.status !== 'sending') {
      return NextResponse.json(
        { error: `Campaign status is '${campaign.status}', cannot process for sending.` },
        { status: 400 }
      );
    }
    
    // If status is 'draft' or 'scheduled', update to 'sending' before proceeding
    // This ensures consistency if this route is called directly for such campaigns.
    if (campaign.status === 'draft' || campaign.status === 'scheduled') {
      try {
        await updateCampaign(campaignId, { status: 'sending' });
        console.log(`[API GENERIC SEND /${campaignId}] Campaign status updated to 'sending'.`);
        campaign.status = 'sending'; // Update local copy for consistency in this request lifecycle
      } catch (statusUpdateError) {
        console.error(`[API GENERIC SEND /${campaignId}] Failed to update campaign status to 'sending':`, statusUpdateError);
        // Log and proceed. The main goal is to queue emails.
      }
    }
    
    console.log(`[API GENERIC SEND /${campaignId}] Processing campaign. Current status: ${campaign.status}`);

    // 1. Populate campaign_recipients (optional, for snapshotting resolved audience)
    console.log(`[API GENERIC SEND /${campaignId}] Populating campaign recipients from rules...`);
    await populateCampaignRecipientsFromRules(campaignId, adminClient);

    // 2. Resolve audience via Edge Function
    console.log(`[API GENERIC SEND /${campaignId}] Resolving audience via Edge Function...`);
    const { data: resolvedAudienceResponse, error: functionInvokeError } = await adminClient.functions.invoke(
      'resolve-audience-from-rules',
      { body: { campaign_id: campaignId } }
    );

    if (functionInvokeError) {
      return handleServerError(functionInvokeError, '[API GENERIC SEND] Failed to invoke resolve-audience Edge Function');
    }
    if (resolvedAudienceResponse && resolvedAudienceResponse.error) {
      const errMessage = typeof resolvedAudienceResponse.error === 'string' 
        ? resolvedAudienceResponse.error 
        : (resolvedAudienceResponse.error as Error).message || JSON.stringify(resolvedAudienceResponse.error);
      return handleServerError(new Error(errMessage), '[API GENERIC SEND] Audience resolution Edge Function failed');
    }

    const finalProfileIds = resolvedAudienceResponse?.data as string[] | null;
    if (!finalProfileIds || finalProfileIds.length === 0) {
      return NextResponse.json({ error: 'Campaign has no recipients after rule evaluation.' }, { status: 400 });
    }
    console.log(`[API GENERIC SEND /${campaignId}] Resolved ${finalProfileIds.length} profile IDs.`);

    // 3. Fetch UnifiedProfiles (non-bounced)
    // TODO: Batching for large audiences
    const { data: profiles, error: profilesError } = await adminClient
      .from('unified_profiles')
      .select<string, UnifiedProfile>('id, email, first_name, last_name, tags, email_bounced')
      .in('id', finalProfileIds)
      .eq('email_bounced', false)
      .returns<UnifiedProfile[]>();

    if (profilesError) {
      return handleServerError(profilesError, '[API GENERIC SEND] Failed to fetch recipient profiles');
    }
    if (!profiles || profiles.length === 0) {
      return NextResponse.json({ error: 'No valid (non-bounced) profiles found for the resolved audience.' }, { status: 400 });
    }
    console.log(`[API GENERIC SEND /${campaignId}] Fetched ${profiles.length} non-bounced profiles.`);

    // 4. Frequency Capping
    const profileIdsForFreqCheck = profiles.map(p => p.id);
    
    // Call the check-frequency-limits Edge Function
    const { data: frequencyCheckResponse, error: frequencyError } = await adminClient.functions.invoke(
      'check-frequency-limits',
      { body: { profile_ids: profileIdsForFreqCheck } }
    );

    if (frequencyError) {
      return handleServerError(frequencyError, '[API GENERIC SEND] Failed to check frequency limits');
    }

    const permittedProfileIds = frequencyCheckResponse?.data as string[] | null;
    if (!permittedProfileIds) {
      return NextResponse.json({ error: 'No permitted profile IDs returned from frequency check.' }, { status: 400 });
    }
    
    const permittedProfiles = profiles.filter(p => permittedProfileIds.includes(p.id));

    if (permittedProfiles.length === 0) {
      return NextResponse.json({ error: 'No profiles remaining after frequency capping.' }, { status: 400 });
    }
    console.log(`[API GENERIC SEND /${campaignId}] ${permittedProfiles.length} profiles after frequency cap.`);

    // 5. Campaign-specific duplicate check (against email_queue)
    const emailsOfPermittedProfiles = permittedProfiles.map(p => p.email.toLowerCase());
    const { data: existingQueueItems, error: queueCheckError } = await adminClient
      .from('email_queue')
      .select('recipient_email')
      .eq('campaign_id', campaignId)
      .in('recipient_email', emailsOfPermittedProfiles);
    if (queueCheckError) {
      console.warn(`[API GENERIC SEND /${campaignId}] Error checking existing queue items:`, queueCheckError.message);
    }
    const emailsAlreadyInQueue = new Set((existingQueueItems || []).map((item: { recipient_email: string }) => item.recipient_email.toLowerCase()));
    const finalProfilesToQueue = permittedProfiles.filter(p => !emailsAlreadyInQueue.has(p.email.toLowerCase()));
        
    if (finalProfilesToQueue.length === 0) {
      return NextResponse.json({ error: 'All potential recipients already in queue or filtered.' }, { status: 400 });
    }
    console.log(`[API GENERIC SEND /${campaignId}] ${finalProfilesToQueue.length} profiles to be queued.`);

    // 6. Add to Queue
    let successfullyQueuedCount = 0;
    for (const profile of finalProfilesToQueue) {
      try {
        await addToQueue(adminClient, {
          campaignId: campaignId,
          recipientEmail: profile.email,
          recipientData: profile,
          priority: campaign.priority || 1,
        });
        successfullyQueuedCount++;
      } catch (queueError) {
        console.error(`[API GENERIC SEND /${campaignId}] Error adding ${profile.email} to queue:`, queueError);
      }
    }
    console.log(`[API GENERIC SEND /${campaignId}] Successfully queued ${successfullyQueuedCount} emails.`);

    // 7. Trigger immediate email processing (NEW)
    if (successfullyQueuedCount > 0) {
      console.log(`[API GENERIC SEND /${campaignId}] Triggering immediate email processing...`);
      try {
        const { data: processResponse, error: processError } = await adminClient.functions.invoke(
          'process-email-queue',
          { body: { triggered_by: 'immediate_send' } }
        );
        
        if (processError) {
          console.warn(`[API GENERIC SEND /${campaignId}] Warning: Failed to trigger immediate email processing:`, processError);
          // Don't fail the entire request since emails are queued and will be processed by cron
        } else {
          console.log(`[API GENERIC SEND /${campaignId}] Email processing triggered:`, processResponse);
        }
      } catch (triggerError) {
        console.warn(`[API GENERIC SEND /${campaignId}] Warning: Exception when triggering email processing:`, triggerError);
        // Don't fail the entire request since emails are queued
      }
    }

    // 8. Update campaign status to 'sent' after successful queueing
    if (successfullyQueuedCount > 0) { // Only update to 'sent' if emails were actually queued
      try {
        await updateCampaign(campaignId, { 
          status: 'sent', 
          status_message: `Successfully queued ${successfullyQueuedCount} recipients via generic send.`
        });
        console.log(`[API GENERIC SEND /${campaignId}] Campaign status updated to 'sent'.`);
      } catch (finalStatusUpdateError) {
        console.error(`[API GENERIC SEND /${campaignId}] Warning: Failed to update campaign status to 'sent' after queueing:`, finalStatusUpdateError);
      }
    } else if (finalProfilesToQueue.length > 0 && successfullyQueuedCount === 0) {
      console.warn(`[API GENERIC SEND /${campaignId}] No emails were successfully queued despite having profiles. Campaign status remains '${campaign.status}'.`);
    }
    
    // 9. Ensure Analytics Record
    await recalculateCampaignAnalytics(campaignId);

    // 10. Logging to email_logs (adapted from original)
    // The original template access is removed, so some fields for email_logs might be missing or need to come from campaign.
    // Temporarily commented out due to potential type issues with 'email_logs' table not being in generated types.
    // TODO: Uncomment and verify once 'email_logs' table and Supabase types are confirmed.
    /*
    await adminClient.from('email_logs').insert({
      type: 'campaign_send_api', // Changed type to differentiate from old log
      campaign_id: campaignId,
      subject: campaign.subject, // Use subject from campaign itself
      sender_email: campaign.sender_email,
      sender_name: campaign.sender_name,
      status: 'queued_for_delivery', // Reflects new pipeline step
      metadata: {
        initiated_by_user_id: validation.user?.id,
        resolved_audience_count: finalProfileIds.length,
        profiles_after_bounce_filter: profiles.length,
        profiles_after_frequency_cap: permittedProfiles.length,
        profiles_to_queue_after_duplicates: finalProfilesToQueue.length,
        successfully_queued_count: successfullyQueuedCount
      },
    });
    */

    return NextResponse.json(
      { 
        success: true, 
        message: `Campaign processing initiated. ${successfullyQueuedCount} emails added to queue.`,
        details: { queuedCount: successfullyQueuedCount }
      },
      { status: 200 }
    );
  } catch (error: any) {
    // If any error occurred, try to revert status if it was changed to 'sending' by this route
    const body = await request.json(); // Re-parse body to get campaignId safely in catch block
    const { campaignId } = body;
    if (campaignId) {
      try {
        const currentCampaign = await getCampaignById(campaignId); // Check current status again
        // Only revert if this instance potentially changed it to 'sending' and an error occurred *after* that.
        // This is a bit tricky because 'triggerCampaignSend' might have set it to 'sending' *before* calling this.
        // For now, if it's 'sending' and we hit an error, and it wasn't 'sending' initially before this function's explicit update,
        // it's safer to revert to 'draft' to indicate an issue.
        // However, the previous logic was to not touch status on error if it was already 'sending'.
        // Let's refine this: if *this function instance* changed it from 'draft'/'scheduled' to 'sending',
        // and then failed, it should revert. If it was already 'sending' when this function started, 
        // it might be part of a larger flow, so reverting here might be an overreach.
        // The original [id]/send route reverts to 'draft' if it was 'sending'. We'll mirror that for now for consistency.
        if (currentCampaign && currentCampaign.status === 'sending') {
          await updateCampaign(campaignId, { status: 'draft', status_message: 'Reverted due to error in generic send API.' }); 
          console.warn(`[API GENERIC SEND /${campaignId}] Campaign status reverted to 'draft' due to error during send process.`);
        }
      } catch (revertError) {
        console.error(`[API GENERIC SEND /${campaignId}] Critical error: Failed to revert campaign status after an error. Revert error:`, revertError);
      }
    }
    return handleServerError(error, '[API GENERIC SEND] Failed to send campaign');
  }
}
