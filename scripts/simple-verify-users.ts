/**
 * Simplified verification script for healed users
 * Tests a fixed list of users to ensure they can be accessed via the Admin API
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

// Function to fetch and verify users
async function verifyUser(userId: string) {
  try {
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId)
    
    if (error) {
      console.error(`❌ Error fetching user ${userId}:`, error)
      return false
    }
    
    if (!data.user) {
      console.error(`❌ User ${userId} not found`)
      return false
    }
    
    console.log(`✅ User ${userId} (${data.user.email}) successfully verified`)
    return true
  } catch (err) {
    console.error(`❌ Unexpected error for ${userId}:`, err)
    return false
  }
}

// List of users to test - our known test user plus others
const usersToTest = [
  'da21beed-cac7-4278-8be3-6d03f8ea0fac', // Rob (migrated)
  '8b74be4e-9549-4ddd-a248-62f26df0fd9e'  // Normal user
];

// Main function
async function main() {
  try {
    console.log('=== VERIFYING USERS ===')
    
    let successCount = 0
    for (const userId of usersToTest) {
      const success = await verifyUser(userId)
      if (success) successCount++
    }
    
    console.log(`\n=== VERIFICATION SUMMARY ===`)
    console.log(`Successfully verified ${successCount} out of ${usersToTest.length} users`)
    
    if (successCount === usersToTest.length) {
      console.log('✅ ALL USERS SUCCESSFULLY VERIFIED!')
      console.log('The healing process was successful!')
    } else {
      console.log('⚠️ Some users failed verification. Further investigation needed.')
    }

    // Now let's try to get some migrated users to verify a few more
    console.log('\n=== CHECKING FOR OTHER MIGRATED USERS ===')
    // Use direct SQL to get a sample of migrated users
    const { data: migratedUsers, error } = await supabaseAdmin.from('auth.users')
      .select('id, email')
      .contains('raw_user_meta_data', { source: 'clean_migration' })
      .neq('id', 'da21beed-cac7-4278-8be3-6d03f8ea0fac')  // Exclude our already verified user
      .limit(3)
    
    if (error) {
      console.error('Error fetching additional migrated users:', error)
    } else if (migratedUsers && migratedUsers.length > 0) {
      console.log(`Found ${migratedUsers.length} additional migrated users to verify`)
      
      for (const user of migratedUsers) {
        await verifyUser(user.id)
      }
    } else {
      console.log('No additional migrated users found to verify')
    }
    
  } catch (error) {
    console.error('Error in verification process:', error)
  }
}

// Run the verification
main()
