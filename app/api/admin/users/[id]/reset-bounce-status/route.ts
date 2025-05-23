import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { validateAdminAccess, handleServerError } from '@/lib/supabase/route-handler';

/**
 * POST /api/admin/users/[id]/reset-bounce-status
 * Resets the email_bounced flag to false for a given user.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const validation = await validateAdminAccess();
    if ('error' in validation) {
      return NextResponse.json({ error: validation.error }, { status: validation.status });
    }

    const userId = params.id;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const adminClient = getAdminClient();

    const { error: updateError } = await adminClient
      .from('unified_profiles')
      .update({ email_bounced: false, updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (updateError) {
      return handleServerError(updateError, 'Failed to reset bounce status');
    }

    console.log(`[API ADMIN] Reset bounce status for user ${userId} by admin ${validation.user?.id}`);
    return NextResponse.json({ success: true, message: 'Email bounce status reset successfully.' });

  } catch (error: any) {
    return handleServerError(error, 'Unexpected error resetting bounce status');
  }
} 