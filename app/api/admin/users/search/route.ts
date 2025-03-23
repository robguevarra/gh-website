import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/route-handler';
import { createServerSupabaseClient as createServiceRoleClient } from '@/lib/supabase/client';

export async function GET(request: NextRequest) {
  try {
    // Create a Supabase client for auth validation
    const supabase = await createRouteHandlerClient();
    
    // Verify user is authenticated and has admin role
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Check if user has admin role - use service client to bypass RLS
    const serviceClient = createServiceRoleClient();
    const { data: profile, error: profileError } = await serviceClient
      .from('profiles')
      .select('role, is_admin')
      .eq('id', user.id)
      .single();
    
    if (profileError || (profile?.role !== 'admin' && !profile?.is_admin)) {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }
    
    // Get search parameters
    const searchParams = request.nextUrl.searchParams;
    const email = searchParams.get('email');
    const name = searchParams.get('name');
    
    if (!email && !name) {
      return NextResponse.json(
        { error: 'Email or name search parameter is required' },
        { status: 400 }
      );
    }
    
    // Create base query
    let query = serviceClient
      .from('profiles')
      .select('id, first_name, last_name, email')
      .limit(10);
    
    // Apply filters based on parameters
    if (email) {
      query = query.ilike('email', `%${email}%`);
    }
    
    if (name) {
      const nameParts = name.split(' ');
      if (nameParts.length > 1) {
        // If multiple name parts, search first and last names
        query = query.or(`first_name.ilike.%${nameParts[0]}%,last_name.ilike.%${nameParts[1]}%`);
      } else {
        // Single name part, search in both first and last name
        query = query.or(`first_name.ilike.%${name}%,last_name.ilike.%${name}%`);
      }
    }
    
    // Execute query
    const { data: users, error: searchError } = await query;
    
    if (searchError) {
      console.error('Error searching users:', searchError);
      return NextResponse.json(
        { error: 'Failed to search users' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ users: users || [] });
    
  } catch (error) {
    console.error('Error in user search route:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
} 