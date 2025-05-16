/**
 * Campaign Scheduling API Route
 * 
 * Endpoint for scheduling a campaign for delivery
 */

import { NextRequest } from 'next/server';
import { 
  getCampaignById, 
  scheduleCampaign,
  getActiveCampaignTemplate,
  createCampaignTemplate
} from '@/lib/supabase/data-access/campaign-management';
import { validateAdminAccess, handleServerError, handleNotFound } from '@/lib/supabase/route-handler';

/**
 * POST /api/admin/campaigns/[id]/schedule
 * Schedule a campaign for delivery
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

    const { id } = await params;
    const body = await request.json();
    const { scheduledAt } = body;
    
    // Validate required fields
    if (!scheduledAt) {
      return Response.json(
        { error: 'Missing required field: scheduledAt' },
        { status: 400 }
      );
    }
    
    // Validate date format
    const scheduledDate = new Date(scheduledAt);
    if (isNaN(scheduledDate.getTime())) {
      return Response.json(
        { error: 'Invalid date format for scheduledAt' },
        { status: 400 }
      );
    }
    
    // Validate campaign exists
    const campaign = await getCampaignById(id);
    if (!campaign) {
      return handleNotFound('Campaign');
    }
    
    // Validate campaign status
    if (campaign.status !== 'draft') {
      return Response.json(
        { error: 'Only draft campaigns can be scheduled' },
        { status: 400 }
      );
    }
    
    // Validate campaign has an active template
    console.log('Checking if campaign has an active template...');
    
    try {
      const template = await getActiveCampaignTemplate(id);
      
      if (!template) {
        console.log('No active template found - attempting to create one automatically');
        
        // If campaign has proper content but no active template, create one automatically
        if (campaign.campaign_html_body && campaign.template_id) {
          try {
            const textContent = campaign.campaign_html_body
              .replace(/<[^>]*>/g, '') // Remove HTML tags
              .replace(/\s+/g, ' ')   // Replace multiple spaces with single space
              .trim() || 'Campaign content';
              
            const templateSubject = campaign.subject || campaign.name || 'Untitled Campaign';
            
            console.log('Creating template automatically with campaign content');
            
            // Create template
            const newTemplate = await createCampaignTemplate({
              campaign_id: id,
              template_id: campaign.selected_template_id || campaign.template_id,
              html_content: campaign.campaign_html_body,
              text_content: textContent,
              subject: templateSubject,
              version: 1,
              is_active: true
            });
            
            console.log('Template created successfully:', newTemplate.id);
          } catch (templateError) {
            console.error('Failed to auto-create template:', templateError);
            return Response.json(
              { error: 'Campaign must have an active template before scheduling. Automatic creation failed.' },
              { status: 400 }
            );
          }
        } else {
          return Response.json(
            { error: 'Campaign must have an active template before scheduling' },
            { status: 400 }
          );
        }
      } else {
        console.log(`Found active template with ID ${template.id}`);
      }
    } catch (templateError) {
      console.error('Error checking for active template:', templateError);
      return Response.json(
        { error: 'Error validating campaign template: ' + (templateError instanceof Error ? templateError.message : 'Unknown error') },
        { status: 500 }
      );
    }
    
    // Schedule campaign
    const updatedCampaign = await scheduleCampaign(id, scheduledAt);

    return Response.json({ 
      campaign: updatedCampaign,
      message: 'Campaign scheduled successfully'
    });
  } catch (error) {
    return handleServerError(error, 'Failed to schedule campaign');
  }
}
