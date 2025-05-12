/**
 * Campaign Management Data Access Layer
 * 
 * This module provides functions for interacting with the campaign management system,
 * including CRUD operations for campaigns, campaign segments, templates, and analytics.
 */

import { createClient } from '@/lib/supabase/client';
import { Database } from '@/types/supabase';
import { getAdminClient } from '@/lib/supabase/admin';

// Type definitions
// Using custom type definitions since these tables might not be in the Database type yet

export interface EmailCampaign {
  id: string;
  name: string;
  description: string | null;
  status: string;
  scheduled_at: string | null;
  completed_at: string | null;
  template_id: string;
  sender_email: string;
  sender_name: string;
  created_at: string;
  updated_at: string;
  is_ab_test: boolean;
  ab_test_variant_count: number | null;
  ab_test_winner_version: number | null;
  ab_test_winner_selected_at: string | null;
  segment_ids: string[] | null;
  content_json: any | null;
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
  
  const { data, error } = await admin
    .from('email_campaigns')
    .select('*')
    .eq('id', id)
    .single();
    
  if (error) throw error;
  return data;
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

// Campaign Segments functions

/**
 * Add a segment to a campaign
 */
export const addCampaignSegment = async (campaignSegment: CampaignSegmentInsert) => {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('campaign_segments')
    .insert(campaignSegment)
    .select()
    .single();
    
  if (error) throw error;
  return data;
};

/**
 * Get segments for a campaign
 */
export const getCampaignSegments = async (campaignId: string) => {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('campaign_segments')
    .select(`
      *,
      segment:user_segments(*)
    `)
    .eq('campaign_id', campaignId);
    
  if (error) throw error;
  return data;
};

/**
 * Remove a segment from a campaign
 */
export const removeCampaignSegment = async (campaignId: string, segmentId: string) => {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('campaign_segments')
    .delete()
    .eq('campaign_id', campaignId)
    .eq('segment_id', segmentId);
    
  if (error) throw error;
  return true;
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
  
  const { data, error, count } = await supabase
    .from('campaign_recipients')
    .select('*, user:users!inner(*)', { count: 'exact' })
    .eq('campaign_id', campaignId)
    .range(offset, offset + limit - 1);
    
  if (error) throw error;
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
  
  // Get users from segments
  // In a real implementation, we would use a more sophisticated query
  // that handles complex segment rules
  const { data: userSegments, error: userSegmentError } = await admin
    .from('user_segments')
    .select('user_id')
    .in('segment_id', segmentIds);
    
  if (userSegmentError) throw userSegmentError;
  
  if (!userSegments || userSegments.length === 0) {
    throw new Error('No users found in the selected segments');
  }
  
  const userIds = userSegments.map(segment => segment.user_id);
  
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
