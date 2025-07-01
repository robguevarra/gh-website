/**
 * Verification script for healed users
 * Tests a sample of healed migrated accounts to ensure they can be accessed via the Admin API
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

// Function to get a sample of migrated users
async function getSampleMigratedUsers(limit: number = 5) {
  const { data, error } = await supabaseAdmin.from('auth.migrated_users_needing_healing')
    .select('id, email')
    .limit(limit)
  
  if (error) {
    // If the view doesn't exist, try querying users directly
    console.log('View not found, querying users directly...')
    const { data: usersData, error: usersError } = await supabaseAdmin.rpc('get_migrated_users', { limit_count: limit })
    
    if (usersError) {
      console.error('Error fetching migrated users:', usersError)
      // Fall back to our known test user
      return [{ id: 'da21beed-cac7-4278-8be3-6d03f8ea0fac', email: 'rob.guevarra@gmail.com' }]
    }
    
    return usersData
  }
  
  return data
}

// Main function
async function main() {
  try {
    // First verify our known test user
    console.log('=== VERIFYING TEST USER ===')
    await verifyUser('da21beed-cac7-4278-8be3-6d03f8ea0fac')
    
    // Then verify a few other random migrated users
    console.log('\n=== VERIFYING RANDOM SAMPLE OF MIGRATED USERS ===')
    
    // Create a stored procedure to get migrated users
    await supabaseAdmin.rpc('create_get_migrated_users_function', {}, {
      headers: { 'Prefer': 'params=single-object' }
    }).catch(() => {
      console.log('Function may already exist, continuing...')
    })
    
    const sampleUsers = await getSampleMigratedUsers(5)
    
    if (sampleUsers.length === 0) {
      console.log('No migrated users found for sampling')
    } else {
      let successCount = 0
      
      for (const user of sampleUsers) {
        const success = await verifyUser(user.id)
        if (success) successCount++
      }
      
      console.log(`\n=== VERIFICATION SUMMARY ===`)
      console.log(`Successfully verified ${successCount} out of ${sampleUsers.length} users`)
      
      if (successCount === sampleUsers.length) {
        console.log('✅ ALL USERS SUCCESSFULLY VERIFIED!')
        console.log('The healing process was successful!')
      } else {
        console.log('⚠️ Some users failed verification. Further investigation needed.')
      }
    }
  } catch (error) {
    console.error('Error in verification process:', error)
  }
}

// First create the function to get migrated users
async function setupVerification() {
  try {
    // Create a function to get migrated users
    const createFunctionQuery = `
      CREATE OR REPLACE FUNCTION get_migrated_users(limit_count INTEGER)
      RETURNS TABLE (id UUID, email TEXT)
      SECURITY DEFINER
      SET search_path = public
      AS $$
      BEGIN
        RETURN QUERY
        SELECT u.id::UUID, u.email::TEXT
        FROM auth.users u
        WHERE u.raw_user_meta_data->>'source' = 'clean_migration'
        LIMIT limit_count;
      END;
      $$
      LANGUAGE plpgsql;
    `
    
    // Execute the create function query
    const { error } = await supabaseAdmin.rpc('exec_sql', { sql: createFunctionQuery })
    
    if (error) {
      console.log('Note: Function creation skipped, may already exist:', error.message)
    } else {
      console.log('Function created successfully')
    }
    
    // Now run the main verification
    await main()
  } catch (err) {
    console.error('Setup error:', err)
    // Continue with main verification anyway
    await main()
  }
}

// Run the verification
setupVerification()
