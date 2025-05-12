/**
 * Campaign Management API Routes - Individual Campaign Operations
 * 
 * Endpoints for getting, updating, and deleting specific campaigns
 */

import { NextRequest } from 'next/server';
import { 
  getCampaignById, 
  updateCampaign, 
  deleteCampaign 
} from '@/lib/supabase/data-access/campaign-management';
import { validateAdminAccess, handleServerError, handleNotFound } from '@/lib/supabase/route-handler';

/**
 * GET /api/admin/campaigns/[id]
 * Get a specific campaign by ID
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
    
    // Get campaign
    const campaign = await getCampaignById(id);
    
    if (!campaign) {
      return handleNotFound('Campaign');
    }

    return Response.json({ campaign });
  } catch (error) {
    return handleServerError(error, 'Failed to fetch campaign');
  }
}

/**
 * PATCH /api/admin/campaigns/[id]
 * Update a specific campaign
 */
export async function PATCH(
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
    
    // Validate campaign exists
    const existingCampaign = await getCampaignById(id);
    if (!existingCampaign) {
      return handleNotFound('Campaign');
    }
    
    // Prevent updating certain fields based on status
    if (existingCampaign.status === 'sending' || existingCampaign.status === 'completed') {
      return Response.json(
        { error: 'Cannot update a campaign that is currently sending or has completed' },
        { status: 400 }
      );
    }
    
    // Update campaign
    const updatedCampaign = await updateCampaign(id, body);

    return Response.json({ campaign: updatedCampaign });
  } catch (error) {
    return handleServerError(error, 'Failed to update campaign');
  }
}

/**
 * DELETE /api/admin/campaigns/[id]
 * Delete a specific campaign
 */
export async function DELETE(
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
    const existingCampaign = await getCampaignById(id);
    if (!existingCampaign) {
      return handleNotFound('Campaign');
    }
    
    // Prevent deleting campaigns that are sending or completed
    if (existingCampaign.status === 'sending') {
      return Response.json(
        { error: 'Cannot delete a campaign that is currently sending' },
        { status: 400 }
      );
    }
    
    // Delete campaign
    await deleteCampaign(id);

    return Response.json({ success: true });
  } catch (error) {
    return handleServerError(error, 'Failed to delete campaign');
  }
}
