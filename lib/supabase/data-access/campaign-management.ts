/**
 * Campaign Management Data Access Layer
 * 
 * This module provides functions for interacting with the campaign management system,
 * including CRUD operations for campaigns, campaign segments, templates, and analytics.
 */

import { createClient } from '@/lib/supabase/client';
import { Database, Json } from '@/types/supabase';
import { getAdminClient } from '@/lib/supabase/admin';
import { getEmailTemplateById } from './templates';
import { SegmentRules } from '@/types/campaigns';
import { SupabaseClient } from '@supabase/supabase-js';

// Type definitions
// Using custom type definitions since these tables might not be in the Database type yet

export interface EmailCampaign {
  id: string;
  name: string;
  description: string | null;
  subject: string | null; // Dedicated field for campaign subject
  status: string;
  status_message: string | null; // Added to match DB schema and allow status context
  scheduled_at: string | null;
  completed_at: string | null;
  template_id: string; // This might be the originally selected template or the active version's template_id if versions are used directly on campaigns
  sender_email: string;
  sender_name: string;
  created_at: string;
  updated_at: string;
  is_ab_test: boolean;
  ab_test_variant_count: number | null;
  ab_test_winner_version: number | null;
  ab_test_winner_selected_at: string | null;
  segment_ids: string[] | null;
  content_json: any | null; // This was pre-existing, potentially for other content structures
  selected_template_id?: string | null; // ID of the user-selected EmailTemplate
  campaign_html_body?: string | null;   // HTML content from Unlayer
  campaign_design_json?: any | null;    // Design JSON from Unlayer
  segment_rules?: SegmentRules; // Rules for advanced audience segmentation
  priority?: number; // Added priority
  campaign_analytics?: CampaignAnalytics | CampaignAnalytics[]; // Joined relation
}

export type EmailCampaignInsert = Omit<EmailCampaign, 'id' | 'created_at' | 'updated_at' | 'campaign_analytics'> & { id?: string };
export type EmailCampaignUpdate = Partial<EmailCampaignInsert>;

export interface CampaignSegment {
  id: string;
  campaign_id: string;
  segment_id: string;
  created_at: string;
  updated_at: string;
}

export type CampaignSegmentInsert = Omit<CampaignSegment, 'id' | 'created_at' | 'updated_at'> & { id?: string };

export interface CampaignTemplate {
  id: string;
  campaign_id: string;
  template_id: string; // Reference to the original template
  version: number;
  html_content: string;
  text_content: string; // Plain text version of the email
  subject: string; // Email subject line
  design_json?: any; // Optional design JSON
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type CampaignTemplateInsert = Omit<CampaignTemplate, 'id' | 'created_at' | 'updated_at'> & { id?: string };
export type CampaignTemplateUpdate = Partial<CampaignTemplateInsert>;

export interface CampaignAnalytics {
  id: string;
  campaign_id: string;
  total_recipients: number;
  total_sent: number;
  total_delivered: number;
  total_opens: number;
  total_clicks: number;
  total_unsubscribes: number;
  total_bounces: number;
  total_complaints: number;
  open_rate: number;
  click_rate: number;
  bounce_rate: number;
  last_calculated_at: string | null;
  created_at: string;
  updated_at: string;
}

export type CampaignAnalyticsInsert = Omit<CampaignAnalytics, 'id' | 'created_at' | 'updated_at'> & { id?: string };
export type CampaignAnalyticsUpdate = Partial<CampaignAnalyticsInsert>;

export interface CampaignRecipient {
  id: string;
  campaign_id: string;
  user_id: string;
  status: string;
  sent_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  created_at: string;
  updated_at: string;
}

export type CampaignRecipientInsert = Omit<CampaignRecipient, 'id' | 'created_at' | 'updated_at'> & { id?: string };

export interface UserSegment {
  id: string;
  name: string;
  description: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
}

// Campaign CRUD functions

/**
 * Create a new email campaign
 */
export const createCampaign = async (campaign: EmailCampaignInsert) => {
  // Use admin client to bypass RLS policies for admin operations
  const admin = getAdminClient();

  const { segment_rules, ...restOfCampaign } = campaign;
  const campaignDataForSupabase: any = { ...restOfCampaign };

  if (campaign.hasOwnProperty('segment_rules')) {
    campaignDataForSupabase.segment_rules = segment_rules as unknown as Json;
  }

  const { data, error } = await admin
    .from('email_campaigns')
    .insert(campaignDataForSupabase)
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Get a campaign by ID
 */
export const getCampaignById = async (id: string) => {
  // Use admin client to bypass RLS policies for admin operations
  const admin = getAdminClient();

  const { data: campaignData, error } = await admin
    .from('email_campaigns')
    .select('*')
    .eq('id', id)
    .single<EmailCampaign>(); // Specify the return type for better type safety

  if (error) {
    // Handle case where campaign is not found more gracefully if needed
    if (error.code === 'PGRST116') { // PostgREST error for 'Fetched zero rows'
      console.warn(`Campaign with id ${id} not found.`);
      return null; // Or throw a custom 'Not Found' error
    }
    console.error(`Error fetching campaign ${id}:`, error);
    throw error;
  }

  if (!campaignData) return null; // Should be covered by PGRST116 but good for safety

  // If campaign_design_json is missing and there's a template_id,
  // try to fetch the design from the original template.
  if (
    (!campaignData.campaign_design_json ||
      (typeof campaignData.campaign_design_json === 'object' &&
        Object.keys(campaignData.campaign_design_json).length === 0)) &&
    campaignData.template_id
  ) {
    try {
      const template = await getEmailTemplateById(campaignData.template_id);
      if (template && template.design_json) {
        // We need to ensure campaignData is not treated as readonly here
        // If single<EmailCampaign>() returns a deeply immutable object, this might be an issue
        // However, Supabase client typically returns mutable objects.
        (campaignData as EmailCampaign).campaign_design_json = template.design_json;
      }
    } catch (templateError) {
      console.error(`Failed to fetch template ${campaignData.template_id} for campaign ${id}:`, templateError);
      // Decide if we should still return the campaignData or throw an error
      // For now, we'll log and continue, returning the campaign without the fallback design
    }
  }

  return campaignData;
};

/**
 * Get all campaigns with optional filtering
 */
export const getCampaigns = async ({
  status,
  limit = 50,
  offset = 0
}: {
  status?: string;
  limit?: number;
  offset?: number;
}) => {
  // Use admin client to bypass RLS policies for admin operations
  const admin = getAdminClient();

  let query = admin
    .from('email_campaigns')
    .select('*, campaign_analytics(*)', { count: 'exact' });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return { data, count };
};

/**
 * Update a campaign
 */
export const updateCampaign = async (id: string, updates: EmailCampaignUpdate) => {
  // Use admin client to bypass RLS policies for admin operations
  const admin = getAdminClient();

  const { segment_rules, ...restOfUpdates } = updates;
  const updateDataForSupabase: any = { ...restOfUpdates };

  if (updates.hasOwnProperty('segment_rules')) {
    updateDataForSupabase.segment_rules = segment_rules as unknown as Json;
  }

  const { data, error } = await admin
    .from('email_campaigns')
    .update(updateDataForSupabase)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Delete a campaign
 */
export const deleteCampaign = async (id: string) => {
  // Use admin client to bypass RLS policies for admin operations
  const admin = getAdminClient();

  const { error } = await admin
    .from('email_campaigns')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
};

/**
 * Schedule a campaign for delivery
 */
export const scheduleCampaign = async (id: string, scheduledAt: string) => {
  // Use admin client to bypass RLS policies for admin operations
  const admin = getAdminClient();

  const { data, error } = await admin
    .from('email_campaigns')
    .update({
      status: 'scheduled',
      scheduled_at: scheduledAt
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Segment functions

/**
 * Get a segment by ID
 */
export const getSegmentById = async (id: string) => {
  const supabase = getAdminClient(); // Use admin client to bypass RLS

  const { data, error } = await supabase
    .from('segments')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('[getSegmentById] Error fetching segment:', JSON.stringify(error, null, 2));
    throw error;
  }

  return data;
};

// Campaign Segments functions

/**
 * Add a segment to a campaign
 */
export const addCampaignSegment = async (campaignSegment: CampaignSegmentInsert) => {
  const supabase = getAdminClient(); // Use admin client for this operation

  // Log the input to the function
  console.log('[addCampaignSegment] Attempting to add:', JSON.stringify(campaignSegment, null, 2));

  const { data, error } = await supabase
    .from('campaign_segments')
    .insert(campaignSegment)
    .select()
    .single();

  if (error) {
    // Log the full Supabase error object
    console.error('[addCampaignSegment] Supabase error:', JSON.stringify(error, null, 2));
    throw error;
  }

  // Log the successful result
  console.log('[addCampaignSegment] Successfully added:', JSON.stringify(data, null, 2));
  return data;
};

/**
 * Get segments for a campaign
 */
export const getCampaignSegments = async (campaignId: string) => {
  const supabase = getAdminClient(); // Use admin client

  const { data, error } = await supabase
    .from('campaign_segments')
    .select(`
      *,
      segment:segments(*)
    `)
    .eq('campaign_id', campaignId);

  if (error) throw error;
  return data;
};

/**
 * Remove a segment from a campaign
 */
export const removeCampaignSegment = async (campaignId: string, segmentId: string) => {
  const supabase = getAdminClient(); // Use admin client

  console.log('[removeCampaignSegment] Attempting to remove:', { campaignId, segmentId });

  const { error } = await supabase
    .from('campaign_segments')
    .delete()
    .eq('campaign_id', campaignId)
    .eq('segment_id', segmentId);

  if (error) {
    console.error('[removeCampaignSegment] Supabase error:', JSON.stringify(error, null, 2));
    throw error;
  }
  console.log('[removeCampaignSegment] Successfully removed:', { campaignId, segmentId });
  return true; // Or return some data if .select() was chained after .delete()
};

// Campaign Templates functions

/**
 * Create a campaign template version
 */
export const createCampaignTemplate = async (template: CampaignTemplateInsert) => {
  // Use admin client to bypass RLS policies for admin operations
  const admin = getAdminClient();

  try {
    // First check if an active template already exists for this campaign
    const { data: existingTemplates } = await admin
      .from('campaign_templates')
      .select('*')
      .eq('campaign_id', template.campaign_id)
      .eq('is_active', true);

    // If an active template exists, return it instead of creating a new one
    if (existingTemplates && existingTemplates.length > 0) {
      console.log(`Active template already exists for campaign ${template.campaign_id}, using existing template`);
      return existingTemplates[0];
    }

    // Insert the new template
    const { data, error } = await admin
      .from('campaign_templates')
      .insert(template)
      .select();

    if (error) throw error;

    // Check if we have data and return the first item
    if (!data || data.length === 0) {
      throw new Error('Failed to create campaign template - no data returned');
    }

    return data[0];
  } catch (error) {
    console.error('Error in createCampaignTemplate:', error);
    throw error;
  }
};

/**
 * Get all template versions for a campaign
 */
export const getCampaignTemplates = async (campaignId: string) => {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('campaign_templates')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('version', { ascending: false });

  if (error) throw error;
  return data;
};

/**
 * Get active template for a campaign
 */
export const getActiveCampaignTemplate = async (campaignId: string) => {
  // Use admin client to bypass RLS policies for admin operations
  const admin = getAdminClient();

  try {
    console.log(`Looking for active template for campaign ${campaignId}`);

    const { data, error } = await admin
      .from('campaign_templates')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // PostgREST error for 'Fetched zero rows'
        console.log(`No active template found for campaign ${campaignId}`);
        return null;
      }
      throw error;
    }

    console.log(`Found active template ${data.id} for campaign ${campaignId}`);
    return data;
  } catch (error) {
    console.error(`Error finding active template for campaign ${campaignId}:`, error);
    throw error;
  }
};

/**
 * Set a template version as active
 */
export const setActiveTemplate = async (templateId: string, campaignId: string) => {
  // Use admin client to bypass RLS policies for admin operations
  const admin = getAdminClient();

  try {
    console.log(`Setting template ${templateId} as active for campaign ${campaignId}`);

    // First, set all templates for this campaign as inactive
    const { error: deactivateError } = await admin
      .from('campaign_templates')
      .update({ is_active: false })
      .eq('campaign_id', campaignId);

    if (deactivateError) {
      console.error('Error deactivating templates:', deactivateError);
      throw deactivateError;
    }

    // Then set the specified template as active
    const { data, error: activateError } = await admin
      .from('campaign_templates')
      .update({ is_active: true })
      .eq('id', templateId)
      .select();

    if (activateError) {
      console.error('Error activating template:', activateError);
      throw activateError;
    }

    if (!data || data.length === 0) {
      console.error(`No template found with ID ${templateId}`);
      throw new Error(`Template with ID ${templateId} not found`);
    }

    console.log(`Successfully set template ${templateId} as active`);
    return data[0];
  } catch (error) {
    console.error('Error in setActiveTemplate:', error);
    throw error;
  }
};

// Campaign Recipients functions

/**
 * Get recipients for a campaign
 */
export const getCampaignRecipients = async (campaignId: string, {
  limit = 50,
  offset = 0
}: {
  limit?: number;
  offset?: number;
}) => {
  const supabase = createClient();

  // First get the recipient records
  const { data: recipientData, error: recipientError, count } = await supabase
    .from('campaign_recipients')
    .select('id, user_id', { count: 'exact' })
    .eq('campaign_id', campaignId)
    .range(offset, offset + limit - 1);

  if (recipientError) throw recipientError;

  if (!recipientData || recipientData.length === 0) {
    return { data: [], count: 0 };
  }

  // Then fetch the user details for those recipients
  const userIds = recipientData.map(recipient => recipient.user_id);

  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('id, email, first_name, last_name')
    .in('id', userIds);

  if (userError) throw userError;

  // Combine the data
  const data = recipientData.map(recipient => {
    const user = userData?.find(u => u.id === recipient.user_id);
    return {
      id: recipient.id,
      user: user || { id: recipient.user_id, email: 'unknown@example.com' }
    };
  });

  return { data, count };
};

/**
 * Populates the campaign_recipients table based on segment_rules evaluation.
 * This function invokes the 'resolve-audience-from-rules' Edge Function.
 */
export const populateCampaignRecipientsFromRules = async (campaignId: string, adminSupabaseClient: SupabaseClient) => {
  console.log(`[populateCampaignRecipientsFromRules] Starting for campaignId: ${campaignId}`);

  // First, get the campaign's segment rules
  const { data: campaign, error: campaignError } = await adminSupabaseClient
    .from('email_campaigns')
    .select('segment_rules')
    .eq('id', campaignId)
    .single();

  if (campaignError) {
    console.error('[populateCampaignRecipientsFromRules] Error fetching campaign:', campaignError);
    throw new Error(`Failed to fetch campaign segment rules: ${campaignError.message}`);
  }

  if (!campaign?.segment_rules) {
    console.log('[populateCampaignRecipientsFromRules] No segment rules found for campaign:', campaignId);
    return { count: 0 };
  }

  console.log(`[populateCampaignRecipientsFromRules] Found segment rules for campaign:`, campaign.segment_rules);

  // 1. Invoke the 'resolve-audience-from-rules' Edge Function to get the list of userIds (profileIds)
  const { data: resolvedAudienceResponse, error: functionInvokeError } = await adminSupabaseClient.functions.invoke(
    'resolve-audience-from-rules',
    { body: { campaignId: campaignId, segmentRules: campaign.segment_rules } }
  );

  if (functionInvokeError) {
    console.error('[populateCampaignRecipientsFromRules] Error invoking resolve-audience-from-rules:', functionInvokeError);
    throw new Error(`Failed to invoke resolve-audience-from-rules Edge Function: ${functionInvokeError.message}`);
  }

  // resolvedAudienceResponse should be { data: string[] | null, error: any } from the Edge Function itself
  if (resolvedAudienceResponse && resolvedAudienceResponse.error) {
    console.error(`[populateCampaignRecipientsFromRules] Edge function 'resolve-audience-from-rules' returned an error:`, resolvedAudienceResponse.error);
    const errMessage = typeof resolvedAudienceResponse.error === 'string'
      ? resolvedAudienceResponse.error
      : (resolvedAudienceResponse.error as Error).message || JSON.stringify(resolvedAudienceResponse.error);
    throw new Error(`Audience resolution Edge Function failed: ${errMessage}`);
  }

  const userIds = resolvedAudienceResponse?.data as string[] | null;

  if (!userIds || userIds.length === 0) {
    console.log('[populateCampaignRecipientsFromRules] No users found by resolve-audience-from-rules for campaign:', campaignId);
    return { count: 0 }; // No users to add
  }
  console.log(`[populateCampaignRecipientsFromRules] Resolved ${userIds.length} user IDs from rules for campaign: ${campaignId}`);

  // 2. Prepare recipients for insertion into campaign_recipients table
  const recipientsToInsert = userIds.map(userId => ({
    campaign_id: campaignId,
    user_id: userId,
    status: 'pending' // Default status
  }));

  // 3. Upsert these userIds into the campaign_recipients table
  const { error: upsertError, count } = await adminSupabaseClient
    .from('campaign_recipients')
    .upsert(recipientsToInsert, {
      onConflict: 'campaign_id,user_id',
      ignoreDuplicates: true
    });

  if (upsertError) {
    console.error('[populateCampaignRecipientsFromRules] Error upserting campaign recipients:', upsertError);
    throw upsertError;
  }

  console.log(`[populateCampaignRecipientsFromRules] Successfully upserted recipients for campaign: ${campaignId}. Upsert operation returned count: ${count}.`);
  // Note: `count` from upsert with ignoreDuplicates:true might be the number of rows processed/matched, not strictly new rows.
  // Returning the length of userIds that were intended for insert is a clearer indication of the resolved audience size.
  return { count: userIds.length };
};

/**
 * Get campaign analytics
 */
export const getCampaignAnalytics = async (campaignId: string) => {
  // Use admin client to bypass RLS policies for admin operations
  const admin = getAdminClient();

  try {
    // First check if the campaign_analytics table exists
    const { data, error } = await admin
      .from('campaign_analytics')
      .select('*')
      .eq('campaign_id', campaignId)
      .single();

    if (error) {
      // If analytics don't exist yet, create default empty analytics
      if (error.code === 'PGRST116') {
        return recalculateCampaignAnalytics(campaignId);
      }

      // If table doesn't exist or other error, return default analytics
      console.error('Error fetching campaign analytics:', error);
      return createDefaultAnalytics(campaignId);
    }

    return data;
  } catch (error) {
    console.error('Error in getCampaignAnalytics:', error);
    // Return default analytics object if anything goes wrong
    return createDefaultAnalytics(campaignId);
  }
};

/**
 * Create default analytics object when no data exists
 */
const createDefaultAnalytics = (campaignId: string): CampaignAnalytics => {
  return {
    id: `default-${campaignId}`,
    campaign_id: campaignId,
    total_recipients: 0,
    total_sent: 0,
    total_delivered: 0,
    total_opens: 0,
    total_clicks: 0,
    total_unsubscribes: 0,
    total_bounces: 0,
    total_complaints: 0,
    open_rate: 0,
    click_rate: 0,
    bounce_rate: 0,
    last_calculated_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
};

/**
 * Recalculate campaign analytics from email events
 * This would typically be called by a background job
 */
export const recalculateCampaignAnalytics = async (campaignId: string) => {
  const admin = getAdminClient();

  // Get recipient count
  const { count: recipientCount, error: recipientError } = await admin
    .from('campaign_recipients')
    .select('*', { count: 'exact', head: true })
    .eq('campaign_id', campaignId);

  if (recipientError) throw recipientError;

  // Get sent count
  const { count: sentCount, error: sentError } = await admin
    .from('campaign_recipients')
    .select('*', { count: 'exact', head: true })
    .eq('campaign_id', campaignId)
    .not('sent_at', 'is', null);

  if (sentError) throw sentError;

  // Get email event counts by type using separate queries for each event type
  // This is a workaround since we can't use .group() with the Supabase JS client
  const eventTypes = ['open', 'click', 'unsubscribe', 'bounce', 'complaint', 'delivery'];
  const eventCounts = [];

  // Run separate count queries for each event type
  for (const eventType of eventTypes) {
    const { count, error } = await admin
      .from('email_events')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', campaignId)
      .eq('event_type', eventType);

    if (error) {
      console.error(`Error counting ${eventType} events:`, error);
      continue;
    }

    if (count && count > 0) {
      eventCounts.push({
        event_type: eventType,
        count: count.toString()
      });
    }
  }

  const eventError = null;

  if (eventError) throw eventError;

  interface EventCount {
    event_type: string;
    count: string;
  }

  // Process event counts
  const counts = {
    opened: 0,
    clicked: 0,
    unsubscribed: 0,
    bounced: 0,
    complained: 0,
    delivered: 0
  };

  if (eventCounts && eventCounts.length > 0) {
    eventCounts.forEach((item: EventCount) => {
      switch (item.event_type) {
        case 'open':
          counts.opened = parseInt(item.count);
          break;
        case 'click':
          counts.clicked = parseInt(item.count);
          break;
        case 'unsubscribe':
          counts.unsubscribed = parseInt(item.count);
          break;
        case 'bounce':
          counts.bounced = parseInt(item.count);
          break;
        case 'complaint':
          counts.complained = parseInt(item.count);
          break;
        case 'delivery':
          counts.delivered = parseInt(item.count);
          break;
      }
    });
  }

  // Calculate rates
  let calculatedSentCount = sentCount || 0;

  // Robustness fallback: If campaign_recipients is empty but we have delivery/bounce events,
  // infer the sent count from the events to avoid 0% rates.
  if (calculatedSentCount === 0 && (counts.delivered > 0 || counts.bounced > 0)) {
    calculatedSentCount = counts.delivered + counts.bounced;
    console.warn(`[recalculateCampaignAnalytics] Sent count is 0 but events exist. Inferred sent count: ${calculatedSentCount}`);
  }

  // Use inferred count if recipientCount is also 0
  let calculatedRecipientCount = recipientCount || 0;
  if (calculatedRecipientCount === 0 && calculatedSentCount > 0) {
    calculatedRecipientCount = calculatedSentCount;
  }

  const openRate = calculatedSentCount ? (counts.opened / calculatedSentCount) * 100 : 0;
  // Click rate is usually based on Delivered or Sent, or per Open. 
  // Standard ESPs often use Click / Delivered or Click / Sent. 
  // Code previously used Click / Open? Line 802: `counts.clicked / counts.opened`.
  // Industry standard is often Click-Through Rate (CTR) = Click / Delivered (or Sent).
  // Click-to-Open Rate (CTOR) = Click / Open.
  // User image says "Click Rate". Standard usually means CTR. 
  // But let's stick to existing logic OR improve it?
  // Existing: `const clickRate = counts.opened ? (counts.clicked / counts.opened) * 100 : 0;`
  // This is CTOR. If I look at the image "0% Click Rate (486 clicks)". 
  // If Opens = 1519. 486/1519 = 32%.
  // If calculatedSentCount = 5416. 486/5416 = 8.9%.
  // The user might expect CTR.
  // Use Sent for now to be safe/standard for "Click Rate".
  const clickRate = calculatedSentCount ? (counts.clicked / calculatedSentCount) * 100 : 0;
  const bounceRate = calculatedSentCount ? (counts.bounced / calculatedSentCount) * 100 : 0;

  try {
    // Update analytics
    const { data, error } = await admin
      .from('campaign_analytics')
      .upsert({
        campaign_id: campaignId,
        total_recipients: calculatedRecipientCount,
        total_sent: calculatedSentCount,
        total_delivered: counts.delivered,
        total_opens: counts.opened,
        total_clicks: counts.clicked,
        total_unsubscribes: counts.unsubscribed,
        total_bounces: counts.bounced,
        total_complaints: counts.complained,
        open_rate: openRate,
        click_rate: clickRate,
        bounce_rate: bounceRate,
        last_calculated_at: new Date().toISOString()
      }, {
        onConflict: 'campaign_id'
      })
      .select()
      .single();

    if (error) {
      console.error('Error upserting campaign analytics:', error);
      return createDefaultAnalytics(campaignId);
    }

    return data;
  } catch (error) {
    console.error('Error in recalculateCampaignAnalytics:', error);
    return createDefaultAnalytics(campaignId);
  }
};

// Campaign Delivery functions

/**
 * Send a test email for a campaign
 */
export const sendCampaignTest = async (campaignId: string, testEmails: string[]) => {
  const supabase = createClient();

  // Get the campaign details
  const { data: campaign } = await supabase
    .from('email_campaigns')
    .select('*')
    .eq('id', campaignId)
    .single();

  if (!campaign) {
    throw new Error('Campaign not found');
  }

  // Get the active template
  const { data: template } = await supabase
    .from('campaign_templates')
    .select('*')
    .eq('campaign_id', campaignId)
    .eq('is_active', true)
    .single();

  if (!template) {
    throw new Error('No active template found for campaign');
  }

  // Call the email sending API endpoint
  const response = await fetch('/api/admin/campaigns/test-send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      campaignId,
      templateId: template.id,
      testEmails,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to send test email');
  }

  return await response.json();
};

/**
 * Trigger sending of a campaign
 * This function is now primarily responsible for updating the campaign status.
 * The actual audience resolution and queueing for immediate sends are handled by the
 * specific API route (`/api/admin/campaigns/[id]/send`).
 * For scheduled campaigns, `process-scheduled-campaigns` handles its own logic.
 */
export const triggerCampaignSend = async (campaignId: string) => {
  const supabase = createClient(); // Standard client for user-context operations
  const adminClient = getAdminClient(); // Admin client for direct DB updates if needed

  console.log(`[triggerCampaignSend] Called for campaignId: ${campaignId}. Updating status to 'sending'.`);

  // Update campaign status to 'sending'
  // This is the primary role of this function now.
  const { data: updatedCampaign, error: updateError } = await adminClient // Use adminClient for direct status update
    .from('email_campaigns')
    .update({ status: 'sending' })
    .eq('id', campaignId)
    .select('id, status')
    .single();

  if (updateError) {
    console.error(`[triggerCampaignSend] Failed to update campaign ${campaignId} status to 'sending':`, updateError);
    // Do NOT revert status here, as the caller (if any) might have its own error handling logic.
    // This function's responsibility is just to attempt the status update.
    throw new Error(`Failed to update campaign status to 'sending': ${updateError.message}`);
  }

  console.log(`[triggerCampaignSend] Campaign ${campaignId} status successfully updated to 'sending'.`);

  // Return the result of the status update
  return {
    success: true,
    message: `Campaign ${campaignId} status updated to 'sending'.`,
    data: updatedCampaign
  };
};
