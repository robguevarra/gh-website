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
  try {
    const validation = await validateAdminAccess();
    if ('error' in validation) {
      return NextResponse.json({ error: validation.error }, { status: validation.status });
    }

    const { id: campaignId } = params;
    const adminClient = getAdminClient();
    
    const campaign = await getCampaignById(campaignId);
    if (!campaign) {
      return handleNotFound('Campaign');
    }
    
    if (campaign.status !== 'draft' && campaign.status !== 'scheduled') {
      return NextResponse.json(
        { error: 'Only draft or scheduled campaigns can be sent' },
        { status: 400 }
      );
    }

    // Update status to sending
    await updateCampaign(campaignId, { status: 'sending' });
    console.log(`[SEND] Campaign ${campaignId} status updated to sending`);
    
    // Get users from segments (SIMPLE)
    if (!campaign.segment_rules?.include?.segmentIds?.length) {
      return NextResponse.json({ message: 'No segment rules configured' }, { status: 400 });
    }
    
    // Get ALL users from segments (not just 1000 due to Supabase default limit)
    let allUserSegments: any[] = [];
    let from = 0;
    const pageSize = 1000;
    
    while (true) {
      const { data: userSegmentsBatch, error: segmentError } = await adminClient
        .from('user_segments')
        .select('user_id')
        .in('segment_id', campaign.segment_rules.include.segmentIds)
        .range(from, from + pageSize - 1);
      
      if (segmentError) {
        return handleServerError(segmentError, 'Failed to fetch user segments');
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
    
    const userIds = [...new Set(allUserSegments.map((us: any) => us.user_id))];
    console.log(`[SEND] Found ${userIds.length} users from segments`);
    
    if (userIds.length === 0) {
      return NextResponse.json({ message: 'No users found in segments' }, { status: 200 });
    }
    
    // Get profiles in batches (handles 5000+)
    console.log(`[SEND] Fetching ${userIds.length} profiles in batches...`);
    const profileBatchSize = 500; // Larger batches, still safe for IN queries
    type UnifiedProfileLite = { id: string; email: string; first_name?: string | null; last_name?: string | null };
    const allProfiles: UnifiedProfileLite[] = [];
    
    for (let i = 0; i < userIds.length; i += profileBatchSize) {
      const batch = userIds.slice(i, i + profileBatchSize);
      const { data: batchProfiles, error: batchError } = await adminClient
        .from('unified_profiles')
        .select('id, email, first_name, last_name')
        .in('id', batch)
        .not('email', 'is', null)
        .or('email_bounced.is.null,email_bounced.eq.false');
      
      if (batchError) {
        return handleServerError(batchError, 'Failed to fetch profiles');
      }
      
      if (batchProfiles && batchProfiles.length > 0) {
        allProfiles.push(...(batchProfiles as UnifiedProfileLite[]));
      }
    }
    
    console.log(`[SEND] Got ${allProfiles.length} valid profiles`);
    
    if (allProfiles.length === 0) {
      return NextResponse.json({ message: 'No valid recipients found' }, { status: 200 });
    }
    
    // Duplicate check (campaign-specific) in batches
    console.log(`[SEND] Checking duplicates in email_queue...`);
    const emailsLower = allProfiles.map(p => p.email.toLowerCase());
    const dupCheckBatch = 1000;
    const emailsAlreadyInQueue = new Set<string>();
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
    const finalProfilesToQueue = allProfiles.filter(p => !emailsAlreadyInQueue.has(p.email.toLowerCase()));
    if (finalProfilesToQueue.length === 0) {
      console.log('[SEND] No new recipients to queue after duplicate check.');
      return NextResponse.json({ message: 'All recipients already queued for this campaign.' }, { status: 200 });
    }

    // Queue emails in BULK (batches)
    console.log(`[SEND] Queueing ${finalProfilesToQueue.length} emails in bulk...`);
    type EmailQueueInsert = Database['public']['Tables']['email_queue']['Insert'];
    let successCount = 0;
    const insertBatchSize = 1000;
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
        continue;
      }
      successCount += inserted?.length || items.length;
    }
    
    console.log(`[SEND] Successfully queued ${successCount}/${finalProfilesToQueue.length} new emails`);
    
    // Update status to sent
    if (successCount > 0) {
      await updateCampaign(campaignId, { 
        status: 'sent', 
        status_message: `Successfully queued ${successCount} recipients`
      });
      console.log(`[SEND] Campaign status updated to sent`);
    }

    // Trigger immediate email processing so queued items get sent right away
    if (successCount > 0) {
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
    }

    return NextResponse.json({ 
      success: true,
      message: `Campaign sent! ${successCount} emails queued.`,
      details: { queuedCount: successCount }
    });
    
  } catch (error) {
    // Revert status on error
    try {
      const { id: campaignId } = await params;
      await updateCampaign(campaignId, { status: 'draft' });
      console.log(`[SEND] Campaign status reverted to draft due to error`);
    } catch (revertError) {
      console.error(`[SEND] Failed to revert campaign status:`, revertError);
    }
    return handleServerError(error, 'Failed to send campaign');
  }
}
