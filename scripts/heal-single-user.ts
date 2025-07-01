/**
 * Simple user healing script - minimal version
 * This script only updates the metadata for a specific user
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

// Validate required environment variables
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('ERROR: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required')
  process.exit(1)
}

// Create Supabase admin client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// User ID to heal
const userId = 'da21beed-cac7-4278-8be3-6d03f8ea0fac'

async function healUser() {
  try {
    console.log(`Attempting to heal user ${userId}...`)

    // First, try to get the user
    console.log('Fetching user details...')
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId)

    if (error) {
      console.error('Error fetching user:', error)
      return
    }

    if (!data.user) {
      console.error('User not found')
      return
    }

    console.log('User found:', data.user.email)
    console.log('Current metadata:', JSON.stringify(data.user.user_metadata, null, 2))

    // Update the user metadata
    console.log('Updating user metadata...')
    const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      {
        email_confirm: true,
        user_metadata: {
          ...data.user.user_metadata,
          email_verified: true,
          healed_at: new Date().toISOString()
        }
      }
    )

    if (updateError) {
      console.error('Error updating user:', updateError)
      return
    }

    console.log('User metadata updated successfully!')
    console.log('New metadata:', JSON.stringify(updateData.user.user_metadata, null, 2))
    
  } catch (err) {
    console.error('Unexpected error:', err)
  }
}

// Run the script
healUser()
