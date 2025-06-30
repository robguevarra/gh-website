/**
 * Campaign Sending API Route
 * 
 * Endpoint for triggering the delivery of a campaign
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  getCampaignById,
  populateCampaignRecipientsFromRules,
  recalculateCampaignAnalytics,
  updateCampaign
} from '@/lib/supabase/data-access/campaign-management';
import { validateAdminAccess, handleServerError, handleNotFound } from '@/lib/supabase/route-handler';
import { getAdminClient } from '@/lib/supabase/admin';
import { addToQueue } from '@/lib/email/queue-utils';
import { UnifiedProfile } from '@/types/users';
import { SupabaseClient } from '@supabase/supabase-js';

/**
 * POST /api/admin/campaigns/[id]/send
 * Trigger the delivery of a campaign by directly resolving audience and queuing emails.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const validation = await validateAdminAccess();
    if ('error' in validation) {
      return NextResponse.json({ error: validation.error }, { status: validation.status });
    }

    const { id: campaignId } = await params;
    const adminClient = getAdminClient();
    
    const campaign = await getCampaignById(campaignId);
    if (!campaign) {
      return handleNotFound('Campaign');
    }
    
    // Ensure campaign is in a valid state to be sent
    if (campaign.status !== 'draft' && campaign.status !== 'scheduled') {
      return NextResponse.json(
        { error: 'Only draft or scheduled campaigns can be sent immediately via this route' },
        { status: 400 }
      );
    }

    // Update campaign status to 'sending' before proceeding
    // This replaces the status update previously done by the now-removed triggerCampaignSend call
    try {
      await updateCampaign(campaignId, { status: 'sending' });
      console.log(`[API SEND /${campaignId}] Campaign status updated to 'sending'.`);
    } catch (statusUpdateError) {
      console.error(`[API SEND /${campaignId}] Failed to update campaign status to 'sending':`, statusUpdateError);
      // Decide if we should halt or just log. For now, logging and proceeding.
      // If this fails, subsequent operations might operate on an incorrect status assumption.
      // However, the main goal is to queue emails. The status can be reconciled later.
    }
    
    // 1. Populate campaign_recipients table (optional, could rely solely on resolve-audience-from-rules directly)
    // Build note Step 5.2: Call populateCampaignRecipientsFromRules.
    // This step pre-populates a table, but we still need the live list of IDs for immediate processing.
    // Consider if this step is truly needed if we immediately fetch profiles and queue.
    // For now, following build note. This function itself calls resolve-audience-from-rules.
    console.log(`[API SEND /${campaignId}] Populating campaign recipients from rules...`);
    await populateCampaignRecipientsFromRules(campaignId, adminClient);

    // 2. Invoke resolve-audience-from-rules Edge Function to get current finalProfileIds
    console.log(`[API SEND /${campaignId}] Resolving audience via Edge Function...`);
    const { data: resolvedAudienceResponse, error: functionInvokeError } = await adminClient.functions.invoke(
      'resolve-audience-from-rules',
      { body: { campaign_id: campaignId } }
    );

    if (functionInvokeError) {
      console.error(`[API SEND /${campaignId}] Error invoking resolve-audience-from-rules:`, functionInvokeError);
      return handleServerError(functionInvokeError, 'Failed to resolve audience via Edge Function');
    }
    if (resolvedAudienceResponse && resolvedAudienceResponse.error) {
      console.error(`[API SEND /${campaignId}] Edge function 'resolve-audience-from-rules' returned an error:`, resolvedAudienceResponse.error);
      const errMessage = typeof resolvedAudienceResponse.error === 'string' 
        ? resolvedAudienceResponse.error 
        : (resolvedAudienceResponse.error as Error).message || JSON.stringify(resolvedAudienceResponse.error);
      return handleServerError(new Error(errMessage), 'Audience resolution Edge Function failed');
    }

    const finalProfileIds = resolvedAudienceResponse?.data as string[] | null;
    if (!finalProfileIds || finalProfileIds.length === 0) {
      return NextResponse.json(
        { error: 'Campaign has no recipients after rule evaluation. Add segments or recipients before sending.' },
        { status: 400 }
      );
    }
    console.log(`[API SEND /${campaignId}] Resolved ${finalProfileIds.length} profile IDs.`);

    // 3. Fetch unified_profiles for these finalProfileIds (batching and filtering bounced)
    // Simplified: Assuming not too many for a single API call context for now. Batching should be added for robustness.
    // TODO: Implement batching for fetching profiles if finalProfileIds can be very large.
    // Note: email_bounced can be NULL (not bounced), false (not bounced), or true (bounced)
    const { data: profiles, error: profilesError } = await adminClient
      .from('unified_profiles')
      .select<string, UnifiedProfile>('id, email, first_name, last_name, tags, email_bounced')
      .in('id', finalProfileIds)
      .or('email_bounced.is.null,email_bounced.eq.false')
      .returns<UnifiedProfile[]>();

    if (profilesError) {
      return handleServerError(profilesError, 'Failed to fetch recipient profiles');
    }
    if (!profiles || profiles.length === 0) {
      return NextResponse.json({ error: 'No valid (non-bounced) profiles found for the resolved audience.' }, { status: 400 });
    }
    console.log(`[API SEND /${campaignId}] Fetched ${profiles.length} non-bounced profiles.`);

    // 4. Apply frequency capping
    const profileIdsForFreqCheck = profiles.map(p => p.id);
    
    // Call the check-frequency-limits Edge Function
    const { data: frequencyCheckResponse, error: frequencyError } = await adminClient.functions.invoke(
      'check-frequency-limits',
      { body: { profile_ids: profileIdsForFreqCheck } }
    );

    if (frequencyError) {
      return handleServerError(frequencyError, 'Failed to check frequency limits');
    }

    const permittedProfileIds = frequencyCheckResponse?.data as string[] | null;
    if (!permittedProfileIds) {
      return NextResponse.json({ error: 'No permitted profile IDs returned from frequency check.' }, { status: 400 });
    }
    
    const permittedProfiles = profiles.filter(p => permittedProfileIds.includes(p.id));
      
    if (permittedProfiles.length === 0) {
      return NextResponse.json({ error: 'No profiles remaining after frequency capping.' }, { status: 400 });
    }
    console.log(`[API SEND /${campaignId}] ${permittedProfiles.length} profiles remaining after frequency capping.`);

    // 5. Campaign-specific duplicate check (against email_queue for this campaign)
    const emailsOfPermittedProfiles = permittedProfiles.map(p => p.email.toLowerCase());
    const { data: existingQueueItems, error: queueCheckError } = await adminClient
      .from('email_queue')
      .select('recipient_email')
      .eq('campaign_id', campaignId)
      .in('recipient_email', emailsOfPermittedProfiles);

    if (queueCheckError) {
      // Log warning but proceed; worst case is a duplicate if this check fails.
      console.warn(`[API SEND /${campaignId}] Error checking existing queue items for this campaign:`, queueCheckError.message);
    }
    const emailsAlreadyInQueue = new Set((existingQueueItems || []).map((item: { recipient_email: string }) => item.recipient_email.toLowerCase()));
    const finalProfilesToQueue = permittedProfiles.filter(p => !emailsAlreadyInQueue.has(p.email.toLowerCase()));

    if (finalProfilesToQueue.length === 0) {
      return NextResponse.json({ error: 'All potential recipients are already in the queue for this campaign or filtered out.' }, { status: 400 });
      }
    console.log(`[API SEND /${campaignId}] ${finalProfilesToQueue.length} profiles to be queued after duplicate check.`);

    // 6. Call addToQueue for each profile
    let successfullyQueuedCount = 0;
    for (const profile of finalProfilesToQueue) {
      try {
        await addToQueue(adminClient, {
          campaignId: campaignId,
          recipientEmail: profile.email,
          recipientData: profile, // Pass the UnifiedProfile object
          priority: campaign.priority || 1, // Use campaign priority or default
          // scheduledAt is not set, so it defaults to now in addToQueue
        });
        successfullyQueuedCount++;
      } catch (queueError) {
        console.error(`[API SEND /${campaignId}] Error adding email ${profile.email} to queue:`, queueError);
        // Optionally, collect these errors or decide if one failure should halt the batch
      }
    }
    console.log(`[API SEND /${campaignId}] Attempted to queue ${finalProfilesToQueue.length} emails, successfully queued ${successfullyQueuedCount}.`);

    // 7. Ensure Campaign Analytics Record Exists
    console.log(`[API SEND /${campaignId}] Ensuring campaign analytics record...`);
    await recalculateCampaignAnalytics(campaignId); // This function should handle creation if not exists

    // 8. Trigger immediate email processing (NEW)
    if (successfullyQueuedCount > 0) {
      console.log(`[API SEND /${campaignId}] Triggering immediate email processing...`);
      try {
        const { data: processResponse, error: processError } = await adminClient.functions.invoke(
          'process-email-queue',
          { body: { triggered_by: 'immediate_send' } }
        );
        
        if (processError) {
          console.warn(`[API SEND /${campaignId}] Warning: Failed to trigger immediate email processing:`, processError);
          // Don't fail the entire request since emails are queued and will be processed by cron
        } else {
          console.log(`[API SEND /${campaignId}] Email processing triggered:`, processResponse);
        }
      } catch (triggerError) {
        console.warn(`[API SEND /${campaignId}] Warning: Exception when triggering email processing:`, triggerError);
        // Don't fail the entire request since emails are queued
      }
    }

    // 9. Update campaign status to 'sent' after successful queueing
    if (successfullyQueuedCount > 0) {
      try {
        await updateCampaign(campaignId, { 
          status: 'sent', 
          status_message: `Successfully queued ${successfullyQueuedCount} recipients for immediate send.`
        });
        console.log(`[API SEND /${campaignId}] Campaign status updated to 'sent'.`);
      } catch (finalStatusUpdateError) {
        console.error(`[API SEND /${campaignId}] Warning: Failed to update campaign status to 'sent' after queueing, but emails are queued:`, finalStatusUpdateError);
        // Emails are queued, so we don't throw a hard error here. Monitoring might catch this.
      }
    } else if (finalProfilesToQueue.length > 0 && successfullyQueuedCount === 0) {
      // This case means we had profiles to queue, but every addToQueue call failed.
      // The campaign is still 'sending'. We might want to revert to 'draft' or set to 'error' here.
      // For now, leaving as 'sending' and relying on the main catch block for reverts on major errors.
      console.warn(`[API SEND /${campaignId}] No emails were successfully queued despite having profiles. Campaign status remains 'sending'.`);
    }

    return NextResponse.json({ 
      success: true,
      message: `Campaign processing initiated. ${successfullyQueuedCount} emails added to queue.`,
      // details: { queuedCount: successfullyQueuedCount, triggerResult } // triggerResult removed
      details: { queuedCount: successfullyQueuedCount }
    });
  } catch (error) {
    // If any error occurred during the main processing, try to revert status if it was changed to 'sending'
    // This is a best-effort attempt.
    const { id: campaignId } = await params; // Re-access campaignId if needed for error handling context
    try {
      const currentCampaign = await getCampaignById(campaignId); // Check current status again
      if (currentCampaign && currentCampaign.status === 'sending') {
        await updateCampaign(campaignId, { status: 'draft' }); // Revert to draft
        console.warn(`[API SEND /${campaignId}] Campaign status reverted to 'draft' due to error during send process.`);
      }
    } catch (revertError) {
      console.error(`[API SEND /${campaignId}] Critical error: Failed to revert campaign status after an error in the send process. Manual check required. Revert error:`, revertError);
    }
    return handleServerError(error, 'Failed to process and send campaign');
  }
}
