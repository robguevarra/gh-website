/**
 * Data Access Layer Index
 * 
 * This file exports all data access modules for easy importing.
 * It follows the module pattern for clean organization and separation of concerns.
 */

// Import from admin-users
import { 
  adminUsersDb, 
  cachedSearchUsers, 
  cachedGetUserCount,
  searchUsers,
  getUserById,
  getUserDetail,
  updateUserProfile,
  addUserNote,
  updateUserNote,
  deleteUserNote,
  logAdminAction,
  getAdminAuditLog,
  getUserActivityLog,
  logUserActivity,
  getUserPurchaseHistory,
  getUserEnrollments as getAdminUserEnrollments,
  getUserCount
} from './admin-users';

// Import from admin-tools
import {
  resetUserPassword,
  updateUserStatus,
  updateUserPermissions,
  sendAdminNotification
} from './admin-tools';

// Import from student-dashboard
import * as studentDashboard from './student-dashboard';

// Import from templates
import * as templates from './templates';

// Export everything
export {
  // Admin users
  adminUsersDb,
  cachedSearchUsers,
  cachedGetUserCount,
  searchUsers,
  getUserById,
  getUserDetail,
  updateUserProfile,
  addUserNote,
  updateUserNote,
  deleteUserNote,
  logAdminAction,
  getAdminAuditLog,
  getUserActivityLog,
  logUserActivity,
  
  // Admin tools
  resetUserPassword,
  updateUserStatus,
  updateUserPermissions,
  sendAdminNotification,
  getUserPurchaseHistory,
  getAdminUserEnrollments,
  getUserCount,
  
  // Re-export other modules
  studentDashboard,
  templates
};
