import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { validateAdminAccess, handleServerError } from '@/lib/supabase/route-handler';

/**
 * GET /api/admin/users/[id]/subscription-status
 * Fetches the email marketing subscription status for a user.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const adminValidation = await validateAdminAccess();
    const resolvedParams = await params;
    const userId = resolvedParams.id;
    
    if ('error' in adminValidation) {
      return NextResponse.json({ error: adminValidation.error }, { status: adminValidation.status });
    }

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const adminDbClient = getAdminClient(); // Use admin client for reading profile data

    const { data: profile, error: profileError } = await adminDbClient
      .from('unified_profiles')
      .select('id, email_marketing_subscribed')
      .eq('id', userId)
      .single(); // Expect a single profile

    if (profileError) {
      if (profileError.code === 'PGRST116') { // PostgREST error for "No rows found"
        return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
      }
      console.error(`[API Sub Status GET /${userId}] Error fetching profile:`, profileError);
      return handleServerError(profileError, 'Failed to fetch user subscription status');
    }

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    return NextResponse.json({
      userId: profile.id,
      email_marketing_subscribed: profile.email_marketing_subscribed,
    });

  } catch (error: any) {
    console.error('[API Sub Status GET] General Error:', error);
    if (error instanceof NextResponse) return error;
    return handleServerError(error, 'An unexpected error occurred while fetching subscription status');
  }
}

/**
 * PATCH /api/admin/users/[id]/subscription-status
 * Updates the email marketing subscription status for a user and logs the change.
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const adminValidation = await validateAdminAccess();
    const resolvedParams = await params;
    const userId = resolvedParams.id;

    if ('error' in adminValidation) {
      return NextResponse.json({ error: adminValidation.error }, { status: adminValidation.status });
    }
    
    const adminUserId = adminValidation.user?.id;
    if (!adminUserId) {
      return NextResponse.json({ error: 'Admin user ID not found after validation' }, { status: 500 });
    }

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const body = await req.json();
    const { new_status, notes } = body;

    if (typeof new_status !== 'boolean') {
      return NextResponse.json({ error: 'Invalid new_status: must be a boolean' }, { status: 400 });
    }
    if (notes && typeof notes !== 'string') {
      return NextResponse.json({ error: 'Invalid notes: must be a string' }, { status: 400 });
    }

    const adminDbClient = getAdminClient();

    // 1. Get current status for audit log
    const { data: currentProfile, error: fetchError } = await adminDbClient
      .from('unified_profiles')
      .select('email_marketing_subscribed')
      .eq('id', userId)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
      }
      console.error(`[API Sub Status PATCH /${userId}] Error fetching current profile:`, fetchError);
      return handleServerError(fetchError, 'Failed to fetch current subscription status');
    }
    if (!currentProfile) {
        return NextResponse.json({ error: 'User profile not found when fetching for PATCH' }, { status: 404 });
    }
    const previous_status = currentProfile.email_marketing_subscribed;

    // 2. Update unified_profiles
    const { error: updateError } = await adminDbClient
      .from('unified_profiles')
      .update({ email_marketing_subscribed: new_status })
      .eq('id', userId);

    if (updateError) {
      console.error(`[API Sub Status PATCH /${userId}] Error updating profile:`, updateError);
      return handleServerError(updateError, 'Failed to update subscription status');
    }

    // 3. Create audit log entry
    const auditAction = new_status ? 'subscribed_marketing' : 'unsubscribed_marketing';
    const { error: auditError } = await adminDbClient
      .from('email_preference_audit_logs')
      .insert({
        user_id: userId,
        admin_user_id: adminUserId,
        action: auditAction,
        previous_status: previous_status,
        new_status: new_status,
        notes: notes,
      });

    if (auditError) {
      console.error(`[API Sub Status PATCH /${userId}] Error creating audit log:`, auditError);
      // Log this error but don't fail the request if profile update was successful
      // Alternatively, one might choose to roll back or mark the profile update as potentially inconsistent
    }

    return NextResponse.json({
      userId: userId,
      email_marketing_subscribed: new_status,
      message: 'Subscription status updated successfully.',
    });

  } catch (error: any) {
    console.error('[API Sub Status PATCH] General Error:', error);
    if (error instanceof NextResponse) return error;
    return handleServerError(error, 'An unexpected error occurred while updating subscription status');
  }
} 