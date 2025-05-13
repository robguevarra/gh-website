/**
 * Campaign Management API Routes
 * 
 * Endpoints for listing and creating campaigns
 */

import { NextRequest } from 'next/server';
import { createCampaign, getCampaigns } from '@/lib/supabase/data-access/campaign-management';
import { getEmailTemplateById } from '@/lib/supabase/data-access/templates';
import { validateAdminAccess, handleServerError } from '@/lib/supabase/route-handler';

/**
 * GET /api/admin/campaigns
 * List all campaigns with optional filtering
 */
export async function GET(request: NextRequest) {
  try {
    // Validate admin or marketing role
    const validation = await validateAdminAccess();
    if ('error' in validation) {
      return Response.json({ error: validation.error }, { status: validation.status });
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get campaigns
    const { data, count } = await getCampaigns({ status, limit, offset });

    return Response.json({
      campaigns: data,
      total: count,
      limit,
      offset,
    });
  } catch (error) {
    return handleServerError(error, 'Failed to fetch campaigns');
  }
}

/**
 * POST /api/admin/campaigns
 * Create a new campaign
 */
export async function POST(request: NextRequest) {
  try {
    // Validate admin or marketing role
    const validation = await validateAdminAccess();
    if ('error' in validation) {
      return Response.json({ error: validation.error }, { status: validation.status });
    }

    // Parse request body
    const body = await request.json();
    const {
      name,
      description,
      template_id,
      sender_email,
      sender_name,
      is_ab_test,
      segment_ids,
    } = body;

    // Validate required fields
    if (!name || !template_id || !sender_email || !sender_name) {
      return Response.json(
        { error: 'Missing required fields: name, template_id, sender_email, and sender_name are required' },
        { status: 400 }
      );
    }

    // Fetch the template details
    const emailTemplate = await getEmailTemplateById(template_id);

    if (!emailTemplate) {
      return Response.json(
        { error: `Template with id ${template_id} not found` },
        { status: 404 }
      );
    }

    // Create campaign using details from the fetched template
    const campaign = await createCampaign({
      name,
      description: description || undefined,
      status: 'draft',
      template_id, // Store the original template_id
      selected_template_id: template_id, // Initially, selected is same as base template
      campaign_design_json: emailTemplate.design_json || {},
      campaign_html_body: emailTemplate.html_content || '',
      sender_email,
      sender_name,
      is_ab_test: is_ab_test || false,
      // Add missing required fields from EmailCampaignInsert with defaults
      scheduled_at: null,
      completed_at: null,
      ab_test_variant_count: null,
      ab_test_winner_version: null,
      ab_test_winner_selected_at: null,
      // content_json is part of EmailCampaign in campaign-management.ts, default to null or empty if not used
      content_json: null, 
      segment_ids: segment_ids || [],
      // user_id will be handled by RLS or createCampaign function internally
    });

    return Response.json({ campaign }, { status: 201 });
  } catch (error) {
    return handleServerError(error, 'Failed to create campaign');
  }
}
