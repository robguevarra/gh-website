import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

// Create a Supabase client with service role for admin operations (bypasses RLS)
export function createServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables for service role client');
  }
  
  return createClient<Database>(supabaseUrl, supabaseKey);
} 