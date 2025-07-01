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
    const normalizedEmail = email.toLowerCase()
    
    // First strategy: Look up the user ID from unified_profiles
    // This is more efficient than using listUsers API
    let userId = null
    let user = null

    try {
      console.log('[UpdatePassword] Looking up user in unified_profiles table...')
      const { data: profileData, error: profileError } = await adminClient
        .from('unified_profiles')
        .select('id')
        .eq('email', normalizedEmail)
        .maybeSingle()

      if (profileError) {
        console.error('[UpdatePassword] Error looking up user in profiles:', profileError)
      } else if (profileData?.id) {
        userId = profileData.id
        console.log('[UpdatePassword] Found user ID in profiles:', userId)
      }
    } catch (profileLookupError) {
      console.error('[UpdatePassword] Exception during profile lookup:', profileLookupError)
      // Continue to next strategy
    }
    
    // Second strategy: If we have the userId, fetch the user details directly
    if (userId) {
      try {
        const { data: userData, error: userError } = await adminClient.auth.admin.getUserById(userId)
        
        if (userError) {
          console.error('[UpdatePassword] Error fetching user by ID:', userError)
        } else if (userData?.user) {
          user = userData.user
          console.log('[UpdatePassword] Successfully retrieved user details by ID')
        }
      } catch (userLookupError) {
        console.error('[UpdatePassword] Exception fetching user by ID:', userLookupError)
        // Will continue to next strategy if needed
      }
    }
    
    // Third strategy: Try to use the ID from the profile to fetch user info
    if (userId && !user) {
      try {
        console.log('[UpdatePassword] Fetching user by ID:', userId)
        const { data, error } = await adminClient.auth.admin.getUserById(userId)
        if (error) {
          console.error('[UpdatePassword] Error fetching user by ID:', error)
        } else if (data?.user) {
          user = data.user
          console.log('[UpdatePassword] Found user by ID:', user.id)
        }
      } catch (idLookupError) {
        console.error('[UpdatePassword] Exception fetching user by ID:', idLookupError)
      }
    }
    
    // If we still don't have the user, it doesn't exist
    if (!user) {
      console.error('[UpdatePassword] User not found after all lookup attempts:', email)
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