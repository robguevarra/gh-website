import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createServerSupabaseClient as createServiceRoleClient } from '@/lib/supabase/client';

export async function GET() {
  try {
    // Create a Supabase client
    const supabase = await createServerSupabaseClient();
    
    // Get auth user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({
        status: 'unauthenticated',
        authError: authError?.message || 'No user found',
        user: null,
        profile: null
      }, { status: 401 });
    }
    
    // Use service role client to bypass RLS for admin-related queries
    const serviceClient = createServiceRoleClient();
    
    // Get user profile using service role client
    const { data: profile, error: profileError } = await serviceClient
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    // Get roles using service role client
    const { data: roles, error: rolesError } = await serviceClient
      .from('roles')
      .select('*');
    
    return NextResponse.json({
      status: 'authenticated',
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        updated_at: user.updated_at,
      },
      profile,
      profileError: profileError?.message,
      roles,
      rolesError: rolesError?.message,
    });
  } catch (error) {
    console.error('Debug route error:', error);
    return NextResponse.json({ 
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
} 