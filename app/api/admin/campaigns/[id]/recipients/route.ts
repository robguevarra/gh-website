import { NextRequest, NextResponse } from 'next/server';
import { validateAdminAccess, handleServerError, handleNotFound } from '@/lib/supabase/route-handler';
import { getCampaignRecipients } from '@/lib/supabase/data-access/campaign-management';

/**
 * GET /api/admin/campaigns/[id]/recipients
 * 
 * Retrieves a list of recipients for a campaign with pagination support.
 * Used for the recipient preview feature in the campaign management UI.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Validate admin access
    const validation = await validateAdminAccess();
    if ('error' in validation) {
      return NextResponse.json({ error: validation.error }, { status: validation.status });
    }

    // Extract query parameters for pagination
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Await params to avoid Next.js dynamic API warning
    const resolvedParams = await Promise.resolve(params);
    const campaignId = resolvedParams.id;
    
    if (!campaignId) {
      return NextResponse.json(
        { error: 'Campaign ID is required' },
        { status: 400 }
      );
    }

    // Fetch recipients with pagination
    const { data, count } = await getCampaignRecipients(campaignId, { 
      limit, 
      offset 
    });

    // Return recipients and total count
    return NextResponse.json({ data, count });
  } catch (error: any) {
    console.error('Error fetching campaign recipients:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch recipients' },
      { status: 500 }
    );
  }
}
