/**
 * Campaign Analytics API Route
 * 
 * Endpoint for retrieving analytics for a specific campaign
 */

import { NextRequest } from 'next/server';
import { 
  getCampaignById,
  getCampaignAnalytics,
  recalculateCampaignAnalytics
} from '@/lib/supabase/data-access/campaign-management';
import { validateAdminAccess, handleServerError, handleNotFound } from '@/lib/supabase/route-handler';

/**
 * GET /api/admin/campaigns/[id]/analytics
 * Get analytics for a specific campaign
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
    
    // Also await searchParams for consistency
    const searchParams = request.nextUrl.searchParams;
    const refresh = searchParams.get('refresh') === 'true';
    
    // Validate campaign exists
    const campaign = await getCampaignById(id);
    if (!campaign) {
      return handleNotFound('Campaign');
    }
    
    // Recalculate analytics if requested
    if (refresh) {
      const analytics = await recalculateCampaignAnalytics(id);
      return Response.json({ analytics });
    }
    
    // Get campaign analytics
    const analytics = await getCampaignAnalytics(id);

    return Response.json({ analytics });
  } catch (error) {
    return handleServerError(error, 'Failed to fetch campaign analytics');
  }
}
