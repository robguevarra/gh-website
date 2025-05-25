import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const { email, password, userData } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      )
    }

    console.log('[UpdatePassword] Updating password for user:', email)

    const adminClient = getAdminClient()

    // First, get the user by email
    const { data: users, error: getUserError } = await adminClient.auth.admin.listUsers()
    
    if (getUserError) {
      console.error('[UpdatePassword] Error fetching users:', getUserError)
      return NextResponse.json(
        { success: false, error: 'Failed to find user' },
        { status: 500 }
      )
    }

    const user = users.users.find(u => u.email === email)
    
    if (!user) {
      console.error('[UpdatePassword] User not found:', email)
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    console.log('[UpdatePassword] Found user:', user.id)

    // Update the user's password using Admin API
    const { data: updateData, error: updateError } = await adminClient.auth.admin.updateUserById(
      user.id,
      {
        password: password,
        user_metadata: {
          ...user.user_metadata,
          ...userData,
          password_set_at: new Date().toISOString()
        }
      }
    )

    if (updateError) {
      console.error('[UpdatePassword] Error updating password:', updateError)
      return NextResponse.json(
        { success: false, error: 'Failed to update password' },
        { status: 500 }
      )
    }

    console.log('[UpdatePassword] Password updated successfully for user:', user.id)

    // Also update the unified_profiles table if userData is provided
    if (userData && (userData.first_name || userData.last_name)) {
      try {
        const { error: profileError } = await adminClient
          .from('unified_profiles')
          .update({
            first_name: userData.first_name,
            last_name: userData.last_name,
            updated_at: new Date().toISOString()
          })
          .eq('email', email)

        if (profileError) {
          console.error('[UpdatePassword] Error updating profile:', profileError)
          // Don't fail the password update for profile update issues
        } else {
          console.log('[UpdatePassword] Profile updated successfully for:', email)
        }
      } catch (profileError) {
        console.error('[UpdatePassword] Profile update exception:', profileError)
        // Don't fail the password update for profile update issues
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Password updated successfully',
      userId: user.id
    })

  } catch (error) {
    console.error('[UpdatePassword] Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
} 