/**
 * SIMPLE Campaign Sending API Route
 * Just send emails to 5000+ recipients without overengineering
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCampaignById, updateCampaign } from '@/lib/supabase/data-access/campaign-management';
import { validateAdminAccess, handleServerError, handleNotFound } from '@/lib/supabase/route-handler';
import { getAdminClient } from '@/lib/supabase/admin';
import { addToQueue } from '@/lib/email/queue-utils';

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
    const batchSize = 100; // Small batches to avoid 414 Request-URI Too Large errors
    let allProfiles: any[] = [];
    
    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize);
      const { data: batchProfiles, error: batchError } = await adminClient
        .from('unified_profiles')
        .select('id, email, first_name, last_name')
        .in('id', batch)
        .not('email', 'is', null)
        .is('email_bounced', null);
      
      if (batchError) {
        return handleServerError(batchError, 'Failed to fetch profiles');
      }
      
      if (batchProfiles) {
        allProfiles.push(...batchProfiles);
      }
    }
    
    console.log(`[SEND] Got ${allProfiles.length} valid profiles`);
    
    if (allProfiles.length === 0) {
      return NextResponse.json({ message: 'No valid recipients found' }, { status: 200 });
    }
    
    // Queue emails (SIMPLE - no frequency checks, just send)
    console.log(`[SEND] Queueing ${allProfiles.length} emails...`);
    let successCount = 0;
    
    for (const profile of allProfiles) {
      try {
        await addToQueue(adminClient, {
          campaignId: campaignId,
          recipientEmail: profile.email,
          recipientData: profile,
          priority: campaign.priority || 1
        });
        successCount++;
      } catch (queueError) {
        console.error(`[SEND] Failed to queue email for ${profile.email}:`, queueError);
      }
    }
    
    console.log(`[SEND] Successfully queued ${successCount}/${allProfiles.length} emails`);
    
    // Update status to sent
    if (successCount > 0) {
      await updateCampaign(campaignId, { 
        status: 'sent', 
        status_message: `Successfully queued ${successCount} recipients`
      });
      console.log(`[SEND] Campaign status updated to sent`);
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
