import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { createRouteHandlerClient, handleServerError, handleUnauthorized } from '@/lib/supabase/route-handler';
import { affiliateProfileSchema, affiliateProfileUpdateSchema } from '@/lib/validation/affiliate/profile-schema';
import { cookies } from 'next/headers';
import { Database } from '@/lib/database.types';

/**
 * Verifies that the authenticated user is an active affiliate
 * @returns Object containing supabase client and affiliate data if valid, throws otherwise
 */
async function verifyActiveAffiliate() {
  const supabase = await createRouteHandlerClient();
  
  // Check if user is authenticated
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError || !session) {
    throw new Error('Unauthorized: User not authenticated');
  }
  
  // Get user's affiliate profile
  const { data: profile, error: profileError } = await supabase
    .from('unified_profiles')
    .select('affiliate_id, affiliate_general_status')
    .eq('id', session.user.id)
    .single();
  
  if (profileError || !profile || !profile.affiliate_id) {
    throw new Error('Unauthorized: User is not an affiliate');
  }
  
  // Verify affiliate status is active
  if (profile.affiliate_general_status !== 'active') {
    throw new Error(`Unauthorized: Affiliate status is '${profile.affiliate_general_status}', must be 'active'`);
  }
  
  return { supabase, userId: session.user.id, affiliateId: profile.affiliate_id };
}

/**
 * GET /api/affiliate/profile
 * Retrieves the authenticated user's affiliate profile
 */
export async function GET(request: NextRequest) {
  try {
    const { supabase, affiliateId } = await verifyActiveAffiliate();
    
    // Get affiliate details
    const { data: affiliate, error } = await supabase
      .from('affiliates')
      .select('id, user_id, slug, commission_rate, is_member, status, created_at, updated_at')
      .eq('id', affiliateId)
      .single();
    
    if (error) {
      console.error('Error fetching affiliate profile:', error);
      return handleServerError('Failed to fetch affiliate profile');
    }
    
    if (!affiliate) {
      return handleServerError('Affiliate profile not found');
    }
    
    // Validate the data against our schema to ensure it matches our expected format
    const validatedData = affiliateProfileSchema.parse(affiliate);
    
    return NextResponse.json(validatedData, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/affiliate/profile:', error);
    if (error instanceof Error && error.message.startsWith('Unauthorized:')) {
      return handleUnauthorized();
    }
    return handleServerError('Internal server error');
  }
}

/**
 * PATCH /api/affiliate/profile
 * Updates the authenticated user's affiliate profile
 * Regular affiliates can only update their slug, admins can update status, commission_rate, etc.
 */
export async function PATCH(request: NextRequest) {
  try {
    const { supabase, userId, affiliateId } = await verifyActiveAffiliate();
    
    // Parse and validate request body
    const requestBody = await request.json();
    const validatedData = affiliateProfileUpdateSchema.parse(requestBody);
    
    // Check if user is trying to update admin-only fields
    const adminOnlyFields = ['status', 'commission_rate', 'is_member'];
    const isUpdatingAdminFields = adminOnlyFields.some(field => field in validatedData);
    
    if (isUpdatingAdminFields) {
      // Check if user is an admin
      const adminClient = getAdminClient();
      const { data: roles, error: rolesError } = await adminClient
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);
      
      // Check if user has admin role
      if (rolesError || !roles || roles.length === 0 || !roles.some((r: any) => r.role === 'admin')) {
        return NextResponse.json({ error: 'You do not have permission to update these fields' }, { status: 401 });
      }
    }
    
    // Update affiliate profile
    const { data: updatedAffiliate, error } = await supabase
      .from('affiliates')
      .update(validatedData)
      .eq('id', affiliateId)
      .select('id, user_id, slug, commission_rate, is_member, status, created_at, updated_at')
      .single();
    
    if (error) {
      console.error('Error updating affiliate profile:', error);
      
      // Check for slug uniqueness error
      if (error.code === '23505' && error.message?.includes('slug')) {
        return NextResponse.json(
          { error: 'Slug is already in use. Please choose a different slug.' },
          { status: 409 }
        );
      }
      
      return handleServerError('Failed to update affiliate profile');
    }
    
    return NextResponse.json(updatedAffiliate, { status: 200 });
  } catch (error) {
    console.error('Error in PATCH /api/affiliate/profile:', error);
    
    if (error instanceof Error) {
      if (error.message.startsWith('Unauthorized:')) {
        return handleUnauthorized();
      }
      
      // Check for Zod validation errors
      if (error.name === 'ZodError') {
        return NextResponse.json(
          { error: 'Invalid request data', details: error.message },
          { status: 400 }
        );
      }
    }
    
    return handleServerError('Internal server error');
  }
}
