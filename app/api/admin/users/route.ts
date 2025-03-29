import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/route-handler';
import { getAdminClient } from '@/lib/supabase/admin';
import { validateAdminAccess } from '@/lib/supabase/route-handler';

// GET all users with their profiles and subscriptions
export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || 'all';
    const status = searchParams.get('status') || 'all';
    const sort = searchParams.get('sort') || 'created_at';
    const order = searchParams.get('order') || 'desc';
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');

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
    
    // Build the query
    let query = adminClient
      .from('profiles')
      .select(`
        *,
        user:auth.users!user_id(*),
        subscription:subscriptions(
          *,
          tier:tiers(*)
        )
      `);
    
    // Apply search filter if provided
    if (search) {
      query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`);
    }
    
    // Apply role filter if not 'all'
    if (role !== 'all') {
      query = query.eq('role', role);
    }
    
    // Apply status filter if not 'all'
    if (status !== 'all') {
      query = query.eq('status', status);
    }
    
    // Apply sorting
    query = query.order(sort, { ascending: order === 'asc' });
    
    // Apply pagination
    query = query
      .range((page - 1) * pageSize, page * pageSize - 1)
      .limit(pageSize);
    
    // Execute query
    const { data: users, error, count } = await query;
    
    if (error) throw error;
    
    return NextResponse.json({
      users,
      pagination: {
        page,
        pageSize,
        total: count || 0
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// POST to create a new user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate admin access
    const validation = await validateAdminAccess();
    if ('error' in validation) {
      return NextResponse.json(
        { error: validation.error },
        { status: validation.status }
      );
    }
    
    // Validate required fields
    if (!body.email || !body.password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }
    
    // Use admin client for database operations
    const adminClient = getAdminClient();
    
    // Create the user in auth.users
    const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true
    });
    
    if (authError) throw authError;
    
    // Create the user profile
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .insert({
        id: authUser.user.id,
        email: body.email,
        full_name: body.full_name || null,
        role: body.role || 'user',
        status: body.status || 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (profileError) {
      // Rollback auth user creation if profile creation fails
      await adminClient.auth.admin.deleteUser(authUser.user.id);
      throw profileError;
    }
    
    return NextResponse.json(profile);
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
} 