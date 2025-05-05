# Admin User Management System Documentation

## Overview

The admin user management system provides comprehensive capabilities for administrators to manage users, their profiles, security settings, course enrollments, purchase history, and other related data. This document explains the components, database interactions, and functionality of the entire user management tab.

## Table of Contents

1. [Database Schema](#database-schema)
2. [User List Page](#user-list-page)
3. [User Detail Page](#user-detail-page)
4. [Components](#components)
5. [Data Access Layer](#data-access-layer)
6. [State Management](#state-management)
7. [Workflows](#workflows)

## Database Schema

The user management system interacts with several tables in the Supabase database:

### Core Tables

| Table Name | Description | Key Fields |
|------------|-------------|------------|
| `auth.users` | Core user authentication data | `id`, `email`, `created_at`, `last_sign_in_at` |
| `public.profiles` | Extended user profile information | `id`, `full_name`, `avatar_url`, `user_id` |
| `public.memberships` | User membership details | `id`, `user_id`, `status`, `plan`, `start_date`, `end_date` |
| `public.course_enrollments` | User course enrollment records | `id`, `user_id`, `course_id`, `status`, `enrolled_at`, `completed_at` |
| `public.transactions` | User purchase/transaction history | `id`, `user_id`, `amount`, `status`, `created_at`, `product_id` |
| `public.user_activity` | Audit log of user actions | `id`, `user_id`, `action`, `details`, `created_at` |

### Relationships

- `profiles` has a one-to-one relationship with `auth.users` via `user_id`
- `memberships` has a one-to-one relationship with `auth.users` via `user_id`
- `course_enrollments` has a many-to-one relationship with `auth.users` via `user_id`
- `transactions` has a many-to-one relationship with `auth.users` via `user_id`
- `user_activity` has a many-to-one relationship with `auth.users` via `user_id`

## User List Page

The user list page (`app/admin/users/page.tsx`) displays a table of all users with filtering, sorting, and search capabilities.

### Key Features

- **Search**: Full-text search across user fields (name, email, etc.)
- **Filtering**: Filter users by status, role, membership plan, join date, etc.
- **Sorting**: Sort users by various columns (name, email, join date, etc.)
- **Pagination**: Navigate through large sets of user data
- **Quick Actions**: View user details, edit profile, manage security

### Database Interactions

- **Read Operations**: 
  - `searchUsers` function in `admin-users.ts` retrieves users based on search parameters
  - Uses Supabase query builder to filter, sort, and paginate results
  - Joins `auth.users`, `profiles`, and `memberships` tables

## User Detail Page

The user detail page (`app/admin/users/[id]/page.tsx`) provides a comprehensive view of a single user with multiple tabs for different aspects of user data.

### Tabs

1. **Profile**: Basic user information and profile settings
2. **Membership**: Membership plan details and management
3. **Security**: Account security settings and access control
4. **Courses**: Course enrollment information
5. **Activity**: User activity log and audit trail
6. **Purchase History**: Transaction history and payment details
7. **Enrollments**: Detailed course enrollment management

### Database Interactions

- **Read Operations**:
  - `getUserProfile` retrieves comprehensive user data
  - `getUserActivity` fetches user activity logs
  - `getUserCourses` gets course enrollment data
  - `getUserTransactions` retrieves purchase history
  - `getUserEnrollments` gets detailed enrollment information

- **Write Operations**:
  - `updateUserProfile` updates user profile information
  - `updateUserSecurity` modifies security settings
  - `updateUserMembership` changes membership details
  - `manageUserEnrollment` modifies course enrollment status
  - `processTransaction` handles transaction updates (refunds, cancellations)
  - `logUserAction` records administrative actions in the audit log

## Components

### User List Components

- **UserTable** (`components/admin/user-table.tsx`): 
  - Displays users in a sortable, paginated table
  - Handles column sorting with visual indicators
  - Provides action buttons for each user

- **UserFilters** (`components/admin/user-filters.tsx`):
  - Provides advanced filtering options
  - Includes date range pickers, status filters, role selectors
  - Handles filter application and reset

- **UserPageClient** (`components/admin/user-page-client.tsx`):
  - Client-side component for the users page
  - Manages filter toggle state

### User Detail Components

- **UserProfileForm** (`components/admin/user-profile-form.tsx`):
  - Form for viewing and editing user profile information
  - Handles validation and submission

- **UserMembershipForm** (`components/admin/user-membership-form.tsx`):
  - Manages user membership details
  - Handles plan changes and date modifications

- **UserSecurityForm** (`components/admin/user-security-form.tsx`):
  - Manages user security settings
  - Handles password resets, 2FA, and account status

- **UserCourses** (`components/admin/user-courses.tsx`):
  - Displays user course enrollments
  - Provides course management actions

- **UserActivity** (`components/admin/user-activity.tsx`):
  - Displays user activity logs
  - Provides filtering and sorting of activity data

- **UserPurchaseHistory** (`components/admin/user-purchase-history.tsx`):
  - Displays user transaction history
  - Provides filtering, sorting, and pagination
  - Includes transaction management actions (refund, cancel)

- **UserEnrollments** (`components/admin/user-enrollments.tsx`):
  - Displays detailed course enrollment information
  - Provides enrollment management actions (pause, resume, extend)
  - Includes filtering, sorting, and pagination

- **UserConfirmationDialog** (`components/admin/user-confirmation-dialog.tsx`):
  - Reusable confirmation dialog for sensitive actions
  - Displays field changes for review

- **UserAdminTools** (`components/admin/user-admin-tools.tsx`):
  - Provides administrative actions for user management
  - Includes account suspension, deletion, etc.

## Data Access Layer

The data access layer is primarily implemented in `lib/supabase/data-access/admin-users.ts` and provides functions for interacting with the database.

### Key Functions

- **searchUsers**: Retrieves users based on search parameters
  ```typescript
  async function searchUsers({
    query,
    status,
    role,
    plan,
    startDate,
    endDate,
    sortBy,
    sortOrder,
    page,
    pageSize
  }: UserSearchParams): Promise<UserSearchResult>
  ```

- **getUserProfile**: Retrieves comprehensive user data
  ```typescript
  async function getUserProfile(userId: string): Promise<UserProfile>
  ```

- **updateUserProfile**: Updates user profile information
  ```typescript
  async function updateUserProfile(userId: string, data: Partial<UserProfileUpdate>): Promise<UserProfile>
  ```

- **updateUserSecurity**: Modifies security settings
  ```typescript
  async function updateUserSecurity(userId: string, data: UserSecurityUpdate): Promise<void>
  ```

- **updateUserMembership**: Changes membership details
  ```typescript
  async function updateUserMembership(userId: string, data: UserMembershipUpdate): Promise<void>
  ```

- **getUserActivity**: Fetches user activity logs
  ```typescript
  async function getUserActivity(userId: string, params?: ActivityParams): Promise<UserActivityItem[]>
  ```

- **getUserTransactions**: Retrieves purchase history
  ```typescript
  async function getUserTransactions(userId: string, params?: TransactionParams): Promise<UserTransaction[]>
  ```

- **processTransaction**: Handles transaction updates
  ```typescript
  async function processTransaction(transactionId: string, action: 'refund' | 'cancel'): Promise<void>
  ```

- **getUserEnrollments**: Gets detailed enrollment information
  ```typescript
  async function getUserEnrollments(userId: string, params?: EnrollmentParams): Promise<UserEnrollment[]>
  ```

- **manageUserEnrollment**: Modifies course enrollment status
  ```typescript
  async function manageUserEnrollment(
    enrollmentId: string, 
    action: 'pause' | 'resume' | 'extend', 
    data?: any
  ): Promise<void>
  ```

- **logUserAction**: Records administrative actions
  ```typescript
  async function logUserAction(adminId: string, userId: string, action: string, details?: any): Promise<void>
  ```

## State Management

The admin user management system uses several state management approaches:

1. **URL Parameters**: For persisting filter, sort, and pagination state
2. **React State**: For component-level state (form values, dialogs, etc.)
3. **Server Components**: For data fetching and initial rendering
4. **Client Components**: For interactive elements and user actions

### URL Parameter State

The system uses URL search parameters to maintain state across page refreshes:

- `query`: Search query string
- `status`: User status filter
- `role`: User role filter
- `plan`: Membership plan filter
- `startDate`: Date range start
- `endDate`: Date range end
- `sortBy`: Column to sort by
- `sortOrder`: Sort direction ('asc' or 'desc')
- `page`: Current page number

## Workflows

### User Search and Filtering

1. User enters search criteria in the `UserFilters` component
2. Component updates URL parameters via `useRouter().push()`
3. Page component reads parameters from `searchParams`
4. `searchUsers` function is called with parameters
5. Results are displayed in the `UserTable` component

### User Profile Update

1. Admin navigates to user detail page
2. Edits profile information in the `UserProfileForm`
3. Form validates input and submits changes
4. `updateUserProfile` function is called
5. Success/error message is displayed
6. Audit log is updated via `logUserAction`

### Transaction Management

1. Admin views user purchase history in `UserPurchaseHistory`
2. Selects a transaction and chooses an action (refund/cancel)
3. Confirmation dialog is displayed
4. On confirmation, `processTransaction` function is called
5. Transaction status is updated in the database
6. Audit log is updated via `logUserAction`

### Enrollment Management

1. Admin views user enrollments in `UserEnrollments`
2. Selects an enrollment and chooses an action (pause/resume/extend)
3. Confirmation dialog is displayed
4. On confirmation, `manageUserEnrollment` function is called
5. Enrollment status is updated in the database
6. Audit log is updated via `logUserAction`

## Security Considerations

- All admin actions require authentication and authorization
- Sensitive actions require confirmation
- All actions are logged in the audit system
- Input validation is performed on both client and server
- Database queries use parameterized statements to prevent SQL injection

## Performance Optimizations

- Pagination for large data sets
- Selective column fetching
- Efficient joins and filtering at the database level
- Client-side caching where appropriate
- Server components for initial rendering
- Client components for interactive elements

## Future Enhancements

- Advanced search with typeahead suggestions
- Bulk user actions
- Export user data to CSV/Excel
- More detailed analytics and reporting
- Enhanced audit logging with diff tracking
- Improved performance for large data sets
