/**
 * Admin Data Access Layer Test Script
 * 
 * This script tests the admin data access layer by performing basic operations.
 * Run this script to verify that the data access layer is functioning correctly.
 * 
 * Usage: 
 * node scripts/test-admin-data-access.js
 */

// Import required dependencies
require('dotenv').config();

// Mock the createServerSupabaseClient function
const supabaseClient = {
  from: (table) => {
    console.log(`Querying table: ${table}`);
    return {
      select: (query) => {
        console.log(`Select query: ${query || '*'}`);
        return {
          eq: (field, value) => {
            console.log(`Filter: ${field} = ${value}`);
            return {
              single: () => {
                console.log('Executing single query');
                return Promise.resolve({ 
                  data: mockUserProfile, 
                  error: null 
                });
              },
              order: (field, options) => {
                console.log(`Order by: ${field} ${options?.ascending ? 'ASC' : 'DESC'}`);
                return {
                  limit: (limit) => {
                    console.log(`Limit: ${limit}`);
                    return Promise.resolve({ 
                      data: mockActivities, 
                      error: null 
                    });
                  }
                };
              }
            };
          },
          order: (field, options) => {
            console.log(`Order by: ${field} ${options?.ascending ? 'ASC' : 'DESC'}`);
            return {
              limit: (limit) => {
                console.log(`Limit: ${limit}`);
                return Promise.resolve({ 
                  data: mockPurchases, 
                  error: null 
                });
              }
            };
          }
        };
      },
      insert: (data) => {
        console.log(`Insert data: ${JSON.stringify(data)}`);
        return {
          select: (query) => {
            console.log(`Return select: ${query || '*'}`);
            return {
              single: () => {
                console.log('Executing single query');
                return Promise.resolve({ 
                  data: mockNote, 
                  error: null 
                });
              }
            };
          }
        };
      },
      update: (data) => {
        console.log(`Update data: ${JSON.stringify(data)}`);
        return {
          eq: (field, value) => {
            console.log(`Filter: ${field} = ${value}`);
            return {
              select: (query) => {
                console.log(`Return select: ${query || '*'}`);
                return {
                  single: () => {
                    console.log('Executing single query');
                    return Promise.resolve({ 
                      data: mockUserProfile, 
                      error: null 
                    });
                  }
                };
              }
            };
          }
        };
      },
      delete: () => {
        console.log('Delete operation');
        return {
          eq: (field, value) => {
            console.log(`Filter: ${field} = ${value}`);
            return Promise.resolve({ error: null });
          }
        };
      }
    };
  },
  rpc: (func, params) => {
    console.log(`RPC call: ${func} with params: ${JSON.stringify(params)}`);
    return Promise.resolve({ 
      data: mockSearchResults, 
      error: null 
    });
  }
};

// Mock data
const mockUserProfile = {
  id: 'user-123',
  email: 'test@example.com',
  first_name: 'Test',
  last_name: 'User',
  status: 'active',
  admin_metadata: { role: 'student' },
  last_login_at: '2023-01-01T00:00:00Z',
  login_count: 5,
  created_at: '2022-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z'
};

const mockSearchResults = [
  mockUserProfile,
  {
    id: 'user-456',
    email: 'another@example.com',
    first_name: 'Another',
    last_name: 'User',
    status: 'inactive',
    admin_metadata: { role: 'student' },
    last_login_at: '2023-01-01T00:00:00Z',
    login_count: 2,
    created_at: '2022-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z'
  }
];

const mockNote = {
  id: 'note-123',
  user_id: 'user-123',
  admin_id: 'admin-123',
  note_text: 'Test note',
  note_type: 'general',
  is_pinned: false,
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
  admin: {
    email: 'admin@example.com',
    first_name: 'Admin',
    last_name: 'User'
  }
};

const mockActivities = [
  {
    id: 'activity-123',
    user_id: 'user-123',
    activity_type: 'login',
    created_at: '2023-01-01T00:00:00Z'
  }
];

const mockPurchases = [
  {
    user_id: 'user-123',
    email: 'test@example.com',
    record_type: 'transaction',
    record_id: 'transaction-123',
    amount: 100,
    currency: 'USD',
    status: 'completed',
    product_type: 'course',
    purchase_date: '2023-01-01T00:00:00Z'
  }
];

// Mock the admin users DB functions
const adminUsersDb = {
  // Error handling wrapper
  withErrorHandling: async (operation, errorMessage) => {
    try {
      const result = await operation();
      return { data: result, error: null };
    } catch (error) {
      console.error(`${errorMessage}:`, error);
      return { data: null, error: error };
    }
  },

  // Search users
  searchUsers: async (params = {}) => {
    console.log('📋 Simulating searchUsers with params:', params);
    return { data: mockSearchResults, error: null };
  },

  // Get user by ID
  getUserById: async (userId) => {
    console.log(`👤 Simulating getUserById: ${userId}`);
    return { data: mockUserProfile, error: null };
  },

  // Get detailed user information
  getUserDetail: async (userId) => {
    console.log(`👤 Simulating getUserDetail: ${userId}`);
    return { 
      data: {
        ...mockUserProfile,
        notes: [mockNote],
        activities: mockActivities,
        purchases: mockPurchases,
        enrollments: []
      }, 
      error: null 
    };
  },

  // Update user profile
  updateUserProfile: async (userId, profileData) => {
    console.log(`✏️ Simulating updateUserProfile for ${userId}:`, profileData);
    return { data: mockUserProfile, error: null };
  },

  // Add user note
  addUserNote: async (userId, adminId, noteText, noteType = 'general', isPinned = false) => {
    console.log(`📝 Simulating addUserNote for ${userId} by ${adminId}: ${noteText}`);
    return { data: mockNote, error: null };
  },

  // Update user note
  updateUserNote: async (noteId, updates) => {
    console.log(`✏️ Simulating updateUserNote for ${noteId}:`, updates);
    return { data: mockNote, error: null };
  },

  // Delete user note
  deleteUserNote: async (noteId) => {
    console.log(`🗑️ Simulating deleteUserNote: ${noteId}`);
    return { data: true, error: null };
  },

  // Log admin action
  logAdminAction: async (adminId, actionType, entityType, entityId = null, userId = null, previousState = null, newState = null) => {
    console.log(`📝 Simulating logAdminAction: ${adminId} performed ${actionType} on ${entityType}`);
    return { data: { id: 'audit-123' }, error: null };
  },

  // Get admin audit log
  getAdminAuditLog: async (filters = {}) => {
    console.log('📜 Simulating getAdminAuditLog with filters:', filters);
    return { data: [{ 
      id: 'audit-123',
      admin_id: 'admin-123',
      action_type: 'view',
      entity_type: 'user',
      created_at: '2023-01-01T00:00:00Z'
    }], error: null };
  },

  // Get user activity log
  getUserActivityLog: async (userId, filters = {}) => {
    console.log(`🔄 Simulating getUserActivityLog for ${userId} with filters:`, filters);
    return { data: mockActivities, error: null };
  },

  // Log user activity
  logUserActivity: async (userId, activityType, resourceType = null, resourceId = null, metadata = {}) => {
    console.log(`📝 Simulating logUserActivity: ${userId} performed ${activityType}`);
    return { data: { id: 'activity-123' }, error: null };
  },

  // Get user purchase history
  getUserPurchaseHistory: async (userId, filters = {}) => {
    console.log(`💰 Simulating getUserPurchaseHistory for ${userId} with filters:`, filters);
    return { data: mockPurchases, error: null };
  },

  // Get user enrollments
  getUserEnrollments: async (userId, filters = {}) => {
    console.log(`📚 Simulating getUserEnrollments for ${userId} with filters:`, filters);
    return { data: [], error: null };
  }
};

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
          const testAdminId = process.env.TEST_ADMIN_ID || 'admin-123';
          console.log('\n📝 Testing addUserNote...');
          const noteResult = await adminUsersDb.addUserNote(
            testUserId,
            testAdminId,
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
