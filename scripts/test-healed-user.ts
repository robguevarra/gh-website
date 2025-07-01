/**
 * Test if we can now fetch the healed user via the Admin API
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

// User IDs to test
const migratedUserId = 'da21beed-cac7-4278-8be3-6d03f8ea0fac';
const normalUserId = '8b74be4e-9549-4ddd-a248-62f26df0fd9e';

async function testUserAccess(userId: string) {
  try {
    console.log(`Attempting to fetch user ${userId}...`);
    
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
    
    if (error) {
      console.error(`Error fetching user ${userId}:`, error);
      return false;
    }
    
    if (!data.user) {
      console.log(`User ${userId} not found`);
      return false;
    }
    
    console.log(`User ${userId} successfully retrieved:`);
    console.log(`- Email: ${data.user.email}`);
    console.log(`- Email confirmed: ${data.user.email_confirmed_at ? 'Yes' : 'No'}`);
    console.log(`- Metadata:`, JSON.stringify(data.user.user_metadata, null, 2));
    
    return true;
  } catch (err) {
    console.error(`Unexpected error for ${userId}:`, err);
    return false;
  }
}

async function main() {
  console.log("=== TESTING MIGRATED USER ===");
  const migratedSuccess = await testUserAccess(migratedUserId);
  
  console.log("\n=== TESTING NORMAL USER ===");
  const normalSuccess = await testUserAccess(normalUserId);
  
  if (migratedSuccess) {
    console.log("\n✅ HEALING SUCCESSFUL: Migrated user can now be accessed through the Admin API!");
  } else {
    console.log("\n❌ HEALING FAILED: Migrated user still cannot be accessed through the Admin API.");
  }
  
  console.log(`Normal user access: ${normalSuccess ? '✅ Successful' : '❌ Failed'}`);
}

// Run the test
main();
