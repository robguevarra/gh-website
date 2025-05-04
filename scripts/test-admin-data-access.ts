/**
 * Admin Data Access Layer Test Script
 * 
 * This script tests the admin data access layer by performing basic operations.
 * Run this script to verify that the data access layer is functioning correctly.
 * 
 * Usage: 
 * npx ts-node -r tsconfig-paths/register scripts/test-admin-data-access.ts
 */

import { adminUsersDb } from '../lib/supabase/data-access';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Test function
async function testAdminDataAccess() {
  console.log('🔍 Testing Admin Data Access Layer...');
  
  try {
    // Test user search
    console.log('\n📋 Testing searchUsers...');
    const searchResult = await adminUsersDb.searchUsers({
      limit: 5
    });
    
    if (searchResult.error) {
      console.error('❌ Error searching users:', searchResult.error);
    } else {
      console.log(`✅ Found ${searchResult.data?.length || 0} users`);
      if (searchResult.data && searchResult.data.length > 0) {
        // Get the first user for further testing
        const testUserId = searchResult.data[0].id;
        console.log(`📌 Using test user ID: ${testUserId}`);
        
        // Test getting user details
        console.log('\n👤 Testing getUserDetail...');
        const userDetailResult = await adminUsersDb.getUserDetail(testUserId);
        
        if (userDetailResult.error) {
          console.error('❌ Error getting user details:', userDetailResult.error);
        } else {
          console.log('✅ Successfully retrieved user details');
          console.log('📊 User Profile:', {
            id: userDetailResult.data?.id,
            email: userDetailResult.data?.email,
            name: `${userDetailResult.data?.first_name || ''} ${userDetailResult.data?.last_name || ''}`.trim(),
            status: userDetailResult.data?.status,
            notes: userDetailResult.data?.notes?.length || 0,
            activities: userDetailResult.data?.activities?.length || 0,
            purchases: userDetailResult.data?.purchases?.length || 0,
            enrollments: userDetailResult.data?.enrollments?.length || 0
          });
          
          // Test adding a note
          if (process.env.TEST_ADMIN_ID) {
            console.log('\n📝 Testing addUserNote...');
            const noteResult = await adminUsersDb.addUserNote(
              testUserId,
              process.env.TEST_ADMIN_ID,
              'Test note from data access test script',
              'test',
              false
            );
            
            if (noteResult.error) {
              console.error('❌ Error adding note:', noteResult.error);
            } else {
              console.log('✅ Successfully added note:', noteResult.data?.id);
              
              // Test updating the note
              if (noteResult.data) {
                console.log('\n✏️ Testing updateUserNote...');
                const updateNoteResult = await adminUsersDb.updateUserNote(
                  noteResult.data.id,
                  {
                    note_text: 'Updated test note',
                    is_pinned: true
                  }
                );
                
                if (updateNoteResult.error) {
                  console.error('❌ Error updating note:', updateNoteResult.error);
                } else {
                  console.log('✅ Successfully updated note');
                  
                  // Test deleting the note
                  console.log('\n🗑️ Testing deleteUserNote...');
                  const deleteNoteResult = await adminUsersDb.deleteUserNote(noteResult.data.id);
                  
                  if (deleteNoteResult.error) {
                    console.error('❌ Error deleting note:', deleteNoteResult.error);
                  } else {
                    console.log('✅ Successfully deleted note');
                  }
                }
              }
            }
          } else {
            console.log('⚠️ Skipping note tests: TEST_ADMIN_ID not set in .env');
          }
          
          // Test getting audit log
          console.log('\n📜 Testing getAdminAuditLog...');
          const auditLogResult = await adminUsersDb.getAdminAuditLog({
            limit: 5
          });
          
          if (auditLogResult.error) {
            console.error('❌ Error getting audit log:', auditLogResult.error);
          } else {
            console.log(`✅ Found ${auditLogResult.data?.length || 0} audit log entries`);
          }
          
          // Test getting user activity log
          console.log('\n🔄 Testing getUserActivityLog...');
          const activityLogResult = await adminUsersDb.getUserActivityLog(testUserId, {
            limit: 5
          });
          
          if (activityLogResult.error) {
            console.error('❌ Error getting activity log:', activityLogResult.error);
          } else {
            console.log(`✅ Found ${activityLogResult.data?.length || 0} activity log entries`);
          }
          
          // Test getting user purchase history
          console.log('\n💰 Testing getUserPurchaseHistory...');
          const purchaseHistoryResult = await adminUsersDb.getUserPurchaseHistory(testUserId, {
            limit: 5
          });
          
          if (purchaseHistoryResult.error) {
            console.error('❌ Error getting purchase history:', purchaseHistoryResult.error);
          } else {
            console.log(`✅ Found ${purchaseHistoryResult.data?.length || 0} purchase history entries`);
          }
          
          // Test getting user enrollments
          console.log('\n📚 Testing getUserEnrollments...');
          const enrollmentsResult = await adminUsersDb.getUserEnrollments(testUserId, {
            limit: 5
          });
          
          if (enrollmentsResult.error) {
            console.error('❌ Error getting enrollments:', enrollmentsResult.error);
          } else {
            console.log(`✅ Found ${enrollmentsResult.data?.length || 0} enrollment entries`);
          }
        }
      }
    }
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
  
  console.log('\n✨ Admin Data Access Layer Test Complete');
}

// Run the test
testAdminDataAccess();
