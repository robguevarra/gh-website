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
import { SegmentRules } from '@/types/campaigns'; // Import SegmentRules

// Helper function to validate SegmentRules structure
const isValidSegmentRules = (rules: any): rules is SegmentRules => {
  if (!rules || typeof rules !== 'object') return false;
  // Check for version property
  if (typeof rules.version !== 'number') return false;

  // Validate 'include' property
  if (!rules.include || typeof rules.include !== 'object') return false;
  if (typeof rules.include.operator !== 'string' || !['AND', 'OR'].includes(rules.include.operator))
    return false;
  if (!Array.isArray(rules.include.segmentIds) || !rules.include.segmentIds.every((id: any) => typeof id === 'string'))
    return false;

  // Validate 'exclude' property
  if (!rules.exclude || typeof rules.exclude !== 'object') return false;
  if (!Array.isArray(rules.exclude.segmentIds) || !rules.exclude.segmentIds.every((id: any) => typeof id === 'string'))
    return false;
  
  // Optional: Validate exclude operator if it exists
  if (rules.exclude.operator !== undefined && 
      (typeof rules.exclude.operator !== 'string' || !['AND', 'OR'].includes(rules.exclude.operator))) {
    return false;
  }

  return true;
};

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
    
    // Validate segment_rules if present in the body
    if (body.hasOwnProperty('segment_rules') && body.segment_rules !== null) {
      if (!isValidSegmentRules(body.segment_rules)) {
        return Response.json({ error: 'Invalid segment_rules structure' }, { status: 400 });
      }
    }
    
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
