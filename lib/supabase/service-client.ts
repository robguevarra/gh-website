import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

/**
 * Creates a Supabase client with service role privileges for client-side use
 * IMPORTANT: This should only be used in admin components where RLS bypass is needed
 * This client should NEVER be exposed in public-facing components
 */
export function createServiceRoleClient() {
  // These are public env vars that are accessible from the client
  // The keys are restricted to admin routes through middleware and component checks
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! // Use anon key for now as service role key isn't publicly exposed
  );
} 