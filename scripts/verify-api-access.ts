/**
 * API Verification Script
 * 
 * This script tests Admin API access for a sample of migrated users
 * to ensure they are properly accessible after healing
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

// Sample of user IDs from our previous SQL query to test
// These are randomly selected migrated users
const userIdsToTest = [
  'da21beed-cac7-4278-8be3-6d03f8ea0fac', // Rob (already verified)
  '21ee5ff3-0a9c-4e32-8a9a-733334ee55b7', // cheesecake.emme@gmail.com
  'b32461ef-fb35-4954-84f0-31cd30f8b124', // jennietweety@yahoo.com 
  'c7e1b5d6-197b-4b87-983c-8df31a0b6e4d', // smmrovituazon@gmail.com
  'fda88e53-b5d6-4f0c-a232-ff7a4b3388a1', // lykaabdurahim@yahoo.com
  '8e6e1c88-b01e-44be-b4ce-bbe2a379ec01'  // empot94@yahoo.com
]

// Test API access for a single user
async function testUserApiAccess(userId: string) {
  console.log(`\nTesting API access for user: ${userId}`)
  
  try {
    console.log('Fetching user via Admin API...')
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId)
    
    if (error) {
      console.error(`❌ API ERROR: ${error.message}`)
      return {
        success: false,
        userId,
        error: error.message
      }
    }
    
    if (!data || !data.user) {
      console.error('❌ User not found')
      return {
        success: false,
        userId,
        error: 'User not found'
      }
    }
    
    console.log(`✅ SUCCESS: User ${data.user.email} retrieved via Admin API`)
    console.log(`- Email confirmed: ${data.user.email_confirmed_at ? 'Yes' : 'No'}`)
    console.log(`- Has user metadata: ${Object.keys(data.user.user_metadata || {}).length > 0 ? 'Yes' : 'No'}`)
    
    return {
      success: true,
      userId,
      email: data.user.email
    }
  } catch (err: any) {
    console.error(`❌ UNEXPECTED ERROR: ${err.message || err}`)
    return {
      success: false,
      userId,
      error: err.message || 'Unknown error'
    }
  }
}

// Main function
async function main() {
  console.log('=== TESTING ADMIN API ACCESS FOR MIGRATED USERS ===')
  
  const results = {
    total: userIdsToTest.length,
    successful: 0,
    failed: 0,
    details: [] as any[]
  }
  
  for (const userId of userIdsToTest) {
    const result = await testUserApiAccess(userId)
    results.details.push(result)
    
    if (result.success) {
      results.successful++
    } else {
      results.failed++
    }
  }
  
  // Print summary
  console.log('\n=== VERIFICATION SUMMARY ===')
  console.log(`Total users tested: ${results.total}`)
  console.log(`Successfully verified: ${results.successful} (${Math.round(results.successful / results.total * 100)}%)`)
  console.log(`Failed verification: ${results.failed}`)
  
  if (results.failed === 0) {
    console.log('\n✅ ALL USERS SUCCESSFULLY VERIFIED!')
    console.log('The healing process was successful!')
  } else {
    console.log('\n⚠️ Some users failed verification. Further investigation may be needed.')
  }
  
  // Print details of failed users
  if (results.failed > 0) {
    console.log('\nFailed users:')
    results.details
      .filter(r => !r.success)
      .forEach(r => {
        console.log(`- User ${r.userId}: ${r.error}`)
      })
  }
}

// Run verification
main()
