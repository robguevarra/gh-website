/**
 * Comprehensive verification script for migrated users
 * Tests a larger sample of healed migrated accounts to ensure they can be accessed via the Admin API
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

// Main function
async function main() {
  try {
    console.log('=== VERIFYING MIGRATED USERS ===')
    
    // Create the stored procedure to get migrated users if it doesn't exist
    await createStoredProcedure()
    
    // Get a sample of migrated users
    console.log('Fetching sample of migrated users...')
    const { data: migratedUsers, error } = await supabaseAdmin.rpc('get_migrated_users_sample', { sample_size: 10 })
    
    if (error) {
      console.error('Error fetching migrated users:', error)
      return
    }
    
    if (!migratedUsers || migratedUsers.length === 0) {
      console.log('No migrated users found to verify')
      return
    }
    
    console.log(`Found ${migratedUsers.length} migrated users to verify`)
    
    // Track success rate
    let successCount = 0
    
    // Verify each user
    for (const user of migratedUsers) {
      const success = await verifyUser(user.id)
      if (success) successCount++
    }
    
    // Summary
    console.log(`\n=== VERIFICATION SUMMARY ===`)
    console.log(`Successfully verified ${successCount} out of ${migratedUsers.length} users (${Math.round(successCount / migratedUsers.length * 100)}%)`)
    
    if (successCount === migratedUsers.length) {
      console.log('✅ ALL USERS SUCCESSFULLY VERIFIED!')
      console.log('The healing process was successful!')
    } else if (successCount / migratedUsers.length > 0.9) {
      console.log('⚠️ Most users were successfully verified (>90%). The healing was mostly successful.')
    } else {
      console.log('❌ Many users failed verification. Further investigation needed.')
    }
    
  } catch (error) {
    console.error('Error in verification process:', error)
  }
}

// Create stored procedure to get migrated users
async function createStoredProcedure() {
  const query = `
    CREATE OR REPLACE FUNCTION get_migrated_users_sample(sample_size int)
    RETURNS TABLE(id uuid, email text) 
    SECURITY DEFINER
    AS $$
    BEGIN
      RETURN QUERY
      SELECT u.id, u.email
      FROM auth.users u
      WHERE u.raw_user_meta_data->>'source' = 'clean_migration'
      ORDER BY RANDOM()
      LIMIT sample_size;
    END;
    $$ LANGUAGE plpgsql;
  `
  
  try {
    const { error } = await supabaseAdmin.rpc('exec_sql', { sql: query })
    
    if (error) {
      // If the exec_sql function doesn't exist, we need to create it first
      if (error.message.includes('function exec_sql') || error.message.includes('not exist')) {
        console.log('Creating exec_sql function first...')
        await createExecSqlFunction()
        // Try again
        const retryResult = await supabaseAdmin.rpc('exec_sql', { sql: query })
        if (retryResult.error) {
          console.error('Failed to create stored procedure:', retryResult.error)
          // Try direct SQL as a last resort
          await supabaseAdmin.from('_exec_sql').select('*').eq('query', query).limit(1)
        } else {
          console.log('Stored procedure created successfully')
        }
      } else {
        console.error('Failed to create stored procedure:', error)
      }
    } else {
      console.log('Stored procedure created successfully')
    }
  } catch (err) {
    console.error('Error creating stored procedure:', err)
    // Try to create the function using direct SQL
    try {
      // Try direct SQL as a last resort
      await supabaseAdmin.from('_exec_sql').select('*').eq('query', query).limit(1)
    } catch (e) {
      console.error('All attempts to create stored procedure failed')
    }
  }
}

// Create the exec_sql function if it doesn't exist
async function createExecSqlFunction() {
  const query = `
    CREATE OR REPLACE FUNCTION exec_sql(sql text)
    RETURNS void 
    SECURITY DEFINER
    AS $$
    BEGIN
      EXECUTE sql;
    END;
    $$ LANGUAGE plpgsql;
  `
  
  try {
    // Try direct SQL as our only option since we can't use exec_sql yet
    await supabaseAdmin.from('_exec_sql').select('*').eq('query', query).limit(1)
  } catch (err) {
    console.error('Error creating exec_sql function:', err)
  }
}

// Fallback to direct approach if stored procedures fail
async function fallbackVerification() {
  try {
    // Direct SQL query for verification
    const { data: testUsers, error } = await supabaseAdmin.from('auth.users')
      .select('id, email')
      .filter('raw_user_meta_data->source', 'eq', 'clean_migration')
      .limit(10)
      
    if (error) {
      console.error('Fallback verification failed:', error)
      return
    }
    
    if (!testUsers || testUsers.length === 0) {
      console.log('No users found for fallback verification')
      return
    }
    
    console.log(`Testing ${testUsers.length} users with fallback method...`)
    
    let successCount = 0
    for (const user of testUsers) {
      const success = await verifyUser(user.id)
      if (success) successCount++
    }
    
    console.log(`Fallback verification: ${successCount}/${testUsers.length} successful`)
  } catch (err) {
    console.error('Error in fallback verification:', err)
  }
}

// Start the verification
main().then(() => {
  console.log('\nAttempting fallback verification if stored procedure failed...')
  return fallbackVerification()
}).catch(err => {
  console.error('Unhandled error:', err)
})
