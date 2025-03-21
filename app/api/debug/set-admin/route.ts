import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient as createServiceRoleClient } from '@/lib/supabase/client';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();
    
    if (!userId) {
      return NextResponse.json({ 
        status: 'error',
        message: 'User ID is required'
      }, { status: 400 });
    }
    
    // Create a service role Supabase client to bypass RLS
    const serviceClient = createServiceRoleClient();
    
    // Update user profile to set admin role and is_admin flag
    const { data, error } = await serviceClient
      .from('profiles')
      .update({ 
        role: 'admin',
        is_admin: true
      })
      .eq('id', userId)
      .select()
      .single();
    
    if (error) {
      return NextResponse.json({ 
        status: 'error',
        message: error.message
      }, { status: 500 });
    }
    
    return NextResponse.json({
      status: 'success',
      message: 'User has been set as admin',
      profile: data
    });
  } catch (error) {
    console.error('Set admin error:', error);
    return NextResponse.json({ 
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
} 