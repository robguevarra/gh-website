/**
 * Campaign Management Data Access Layer
 * 
 * This module provides functions for interacting with the campaign management system,
 * including CRUD operations for campaigns, campaign segments, templates, and analytics.
 */

import { createClient } from '@/lib/supabase/client';
import { Database } from '@/types/supabase';
import { getAdminClient } from '@/lib/supabase/admin';
import { getEmailTemplateById } from './templates';

// Type definitions
// Using custom type definitions since these tables might not be in the Database type yet

export interface EmailCampaign {
  id: string;
  name: string;
  description: string | null;
  subject: string | null; // Dedicated field for campaign subject
  status: string;
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
}

export type EmailCampaignInsert = Omit<EmailCampaign, 'id' | 'created_at' | 'updated_at'> & { id?: string };
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
  version: number;
  html_content: string;
  design_json: any;
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
  
  const { data, error } = await admin
    .from('email_campaigns')
    .insert(campaign)
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
    .select('*', { count: 'exact' });
    
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
  
  const { data, error } = await admin
    .from('email_campaigns')
    .update(updates)
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
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('campaign_templates')
    .insert(template)
    .select()
    .single();
    
  if (error) throw error;
  return data;
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
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('campaign_templates')
    .select('*')
    .eq('campaign_id', campaignId)
    .eq('is_active', true)
    .single();
    
  if (error) throw error;
  return data;
};

/**
 * Set a template version as active
 */
export const setActiveTemplate = async (templateId: string, campaignId: string) => {
  const supabase = createClient();
  
  // First, set all templates for this campaign as inactive
  await supabase
    .from('campaign_templates')
    .update({ is_active: false })
    .eq('campaign_id', campaignId);
  
  // Then set the specified template as active
  const { data, error } = await supabase
    .from('campaign_templates')
    .update({ is_active: true })
    .eq('id', templateId)
    .select()
    .single();
    
  if (error) throw error;
  return data;
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
 * Add recipients to a campaign from segments
 * This should be called by an admin function
 */
export const addRecipientsFromSegments = async (campaignId: string) => {
  // This requires admin privileges to query users based on segments
  const admin = getAdminClient();
  const supabase = createClient();
  
  // Get the segments for this campaign
  const { data: campaignSegments, error: segmentError } = await supabase
    .from('campaign_segments')
    .select('segment_id')
    .eq('campaign_id', campaignId);
    
  if (segmentError) throw segmentError;
  
  if (!campaignSegments || campaignSegments.length === 0) {
    throw new Error('No segments associated with this campaign');
  }
  
  const segmentIds = campaignSegments.map(segment => segment.segment_id);
  
  // Get users from segments with pagination to handle more than 1000 users
  let allUserSegments: Array<{user_id: string | null}> = [];
  let page = 0;
  const pageSize = 1000;
  let hasMore = true;
  
  while (hasMore) {
    const { data: userSegmentsPage, error: userSegmentError } = await admin
      .from('user_segments')
      .select('user_id')
      .in('segment_id', segmentIds)
      .range(page * pageSize, (page + 1) * pageSize - 1);
      
    if (userSegmentError) throw userSegmentError;
    
    if (userSegmentsPage && userSegmentsPage.length > 0) {
      // Add this page's results to our collection
      allUserSegments = [...allUserSegments, ...userSegmentsPage];
      
      // Check if we've reached the end of the results
      if (userSegmentsPage.length < pageSize) {
        hasMore = false;
      } else {
        page++;
      }
    } else {
      // No more results
      hasMore = false;
    }
  }
  
  if (allUserSegments.length === 0) {
    throw new Error('No users found in the selected segments');
  }
  
  const userIds = allUserSegments
    .map(segment => segment.user_id)
    .filter((id): id is string => typeof id === 'string' && !!id);
  
  // Insert recipients
  const recipientsToInsert = userIds.map(userId => ({
    campaign_id: campaignId,
    user_id: userId,
    status: 'pending'
  }));
  
  // Insert recipients, ignoring duplicates
  const { error, count } = await supabase
    .from('campaign_recipients')
    .upsert(recipientsToInsert, { 
      onConflict: 'campaign_id,user_id',
      ignoreDuplicates: true 
    });
    
  if (error) throw error;
  return { count };
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
  const openRate = sentCount ? (counts.opened / sentCount) * 100 : 0;
  const clickRate = counts.opened ? (counts.clicked / counts.opened) * 100 : 0;
  const bounceRate = sentCount ? (counts.bounced / sentCount) * 100 : 0;
  
  try {
    // Update analytics
    const { data, error } = await admin
      .from('campaign_analytics')
      .upsert({
        campaign_id: campaignId,
        total_recipients: recipientCount || 0,
        total_sent: sentCount || 0,
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
 */
export const triggerCampaignSend = async (campaignId: string) => {
  const supabase = createClient();
  
  // Update campaign status to 'sending'
  await supabase
    .from('email_campaigns')
    .update({ status: 'sending' })
    .eq('id', campaignId);
  
  // Call the campaign send API endpoint
  const response = await fetch('/api/admin/campaigns/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      campaignId,
    }),
  });
  
  if (!response.ok) {
    // If sending fails, revert status to draft
    await supabase
      .from('email_campaigns')
      .update({ status: 'draft' })
      .eq('id', campaignId);
      
    const error = await response.json();
    throw new Error(error.message || 'Failed to send campaign');
  }
  
  return await response.json();
};
