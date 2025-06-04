import { createRouteHandlerClient } from '@/lib/supabase/route-handler';
import { Database } from '@/types/supabase';
import { SupabaseClient, User } from '@supabase/supabase-js';

type AffiliateVerificationResult = {
  userId: string;
  affiliateId: string;
  supabase: SupabaseClient<Database>;
};

/**
 * Securely verifies that the authenticated user is an active affiliate using getUser() for authentication
 * This addresses the security issue with getSession() which doesn't validate with Supabase Auth server
 * 
 * @returns Object containing supabase client and affiliate data if valid, throws otherwise
 */
export async function verifyActiveAffiliate(): Promise<AffiliateVerificationResult> {
  const supabase = await createRouteHandlerClient();
  
  // Use getUser() instead of getSession() for secure authentication
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    throw new Error('Unauthorized: User not authenticated');
  }
  
  // Get user's affiliate profile
  const { data: profile, error: profileError } = await supabase
    .from('unified_profiles')
    .select('affiliate_id, affiliate_general_status')
    .eq('id', user.id)
    .single();
  
  if (profileError || !profile || !profile.affiliate_id) {
    throw new Error('Unauthorized: User is not an affiliate');
  }
  
  // Verify affiliate status is active
  if (profile.affiliate_general_status !== 'active') {
    throw new Error(`Unauthorized: Affiliate status is '${profile.affiliate_general_status}', must be 'active'`);
  }
  
  return { 
    supabase, 
    userId: user.id, 
    affiliateId: profile.affiliate_id 
  };
}

/**
 * Securely gets the current authenticated user
 * Uses getUser() instead of getSession() for improved security
 * 
 * @returns User object if authenticated, null otherwise
 */
export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createRouteHandlerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return null;
  }
  
  return user;
}
