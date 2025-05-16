/**
 * Campaign Templates API Route
 * 
 * Endpoints for managing templates associated with a campaign
 */

import { NextRequest } from 'next/server';
import { 
  getCampaignById,
  getCampaignTemplates,
  createCampaignTemplate,
  setActiveTemplate
} from '@/lib/supabase/data-access/campaign-management';
import { validateAdminAccess, handleServerError, handleNotFound } from '@/lib/supabase/route-handler';

/**
 * GET /api/admin/campaigns/[id]/templates
 * Get templates for a specific campaign
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Validate admin or marketing role
    const validation = await validateAdminAccess();
    if ('error' in validation) {
      return Response.json({ error: validation.error }, { status: validation.status });
    }

    // Await params to avoid Next.js dynamic API warning
    const resolvedParams = await Promise.resolve(params);
    const { id } = resolvedParams;
    
    // Validate campaign exists
    const campaign = await getCampaignById(id);
    if (!campaign) {
      return handleNotFound('Campaign');
    }
    
    // Get campaign templates
    const templates = await getCampaignTemplates(id);

    return Response.json({ templates });
  } catch (error) {
    return handleServerError(error, 'Failed to fetch campaign templates');
  }
}

/**
 * POST /api/admin/campaigns/[id]/templates
 * Create a new template version for a campaign
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Validate admin or marketing role
    const validation = await validateAdminAccess();
    if ('error' in validation) {
      return Response.json({ error: validation.error }, { status: validation.status });
    }

    // Await params to avoid Next.js dynamic API warning
    const resolvedParams = await Promise.resolve(params);
    const { id } = resolvedParams;
    const body = await request.json();
    const { template_id, html_content, text_content, subject, version } = body;
    
    // Validate required fields
    if (!template_id || !html_content || !text_content || !subject) {
      return Response.json(
        { error: 'Missing required fields: template_id, html_content, text_content, and subject are required' },
        { status: 400 }
      );
    }
    
    // Validate campaign exists
    const campaign = await getCampaignById(id);
    if (!campaign) {
      return handleNotFound('Campaign');
    }
    
    // Create campaign template with better error handling
    let template;
    try {
      template = await createCampaignTemplate({
        campaign_id: id,
        template_id,
        html_content,
        text_content,
        subject,
        version: version || 1,
        is_active: true
      });
      
      console.log('Campaign template created with ID:', template.id);
      
      // Set as active template
      try {
        await setActiveTemplate(template.id, id);
        console.log('Template successfully set as active');
      } catch (activateError) {
        console.error('Failed to set template as active, but template was created:', activateError);
        // Continue with the template creation response even if setting as active fails
        // We'll return the template anyway since it was created successfully
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Unknown error occurred when creating campaign template';
      
      console.error('Error creating campaign template:', error);
      return Response.json(
        { error: errorMessage },
        { status: 500 }
      );
    }

    return Response.json({ 
      template,
      message: 'Template created and set as active'
    }, { status: 201 });
  } catch (error) {
    return handleServerError(error, 'Failed to create campaign template');
  }
}
