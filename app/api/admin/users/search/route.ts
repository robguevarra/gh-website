import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { validateAdminAccess } from '@/lib/supabase/route-handler';

export async function GET(request: NextRequest) {
  try {
    // Validate admin access
    const validation = await validateAdminAccess();
    if ('error' in validation) {
      return NextResponse.json(
        { error: validation.error },
        { status: validation.status }
      );
    }
    
    // Use admin client for database operations
    const adminClient = getAdminClient();
    
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
    let query = adminClient
      .from('profiles')
      .select(`
        id,
        first_name,
        last_name,
        email,
        role,
        status,
        created_at,
        updated_at,
        auth_users:auth.users!user_id(
          email_confirmed_at,
          last_sign_in_at
        )
      `)
      .limit(10);
    
    // Apply filters based on parameters
    if (email) {
      query = query.ilike('email', `%${email}%`);
    }
    
    if (name) {
      query = query.or(`first_name.ilike.%${name}%,last_name.ilike.%${name}%`);
    }
    
    // Execute query
    const { data: users, error } = await query;
    
    if (error) {
      console.error('Error searching users:', error);
      return NextResponse.json(
        { error: 'Failed to search users' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ users });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 