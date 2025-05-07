# Admin User Tabs Implementation Documentation

## Overview

The Admin User Management interface provides a comprehensive set of tabs for managing user accounts, including Profile, Security, Membership, Courses, Activity, Purchases, Enrollments, and Reconciliation. This document details the implementation of each tab, their data sources, and functionality.

## Table of Contents

1. [Tab Structure](#tab-structure)
2. [Profile Tab](#profile-tab)
3. [Security Tab](#security-tab)
4. [Membership Tab](#membership-tab)
5. [Courses Tab](#courses-tab)
6. [Activity Tab](#activity-tab)
7. [Purchases Tab](#purchases-tab)
8. [Enrollments Tab](#enrollments-tab)
9. [Reconciliation Tab](#reconciliation-tab)
10. [Database Integration](#database-integration)
11. [Future Enhancements](#future-enhancements)

## Tab Structure

The user detail page is implemented in `app/admin/users/[id]/page.tsx` and uses the Shadcn UI Tabs component to organize the different sections. Each tab is rendered as a `TabsContent` component with a corresponding component that handles the specific functionality.

```tsx
<Tabs defaultValue="profile" className="space-y-6">
  <TabsList className="grid grid-cols-8 w-full">
    <TabsTrigger value="profile"><Pencil className="h-4 w-4 mr-2" /> Profile</TabsTrigger>
    <TabsTrigger value="security"><Shield className="h-4 w-4 mr-2" /> Security</TabsTrigger>
    <TabsTrigger value="membership"><CreditCard className="h-4 w-4 mr-2" /> Membership</TabsTrigger>
    <TabsTrigger value="courses"><BookOpen className="h-4 w-4 mr-2" /> Courses</TabsTrigger>
    <TabsTrigger value="activity"><Activity className="h-4 w-4 mr-2" /> Activity</TabsTrigger>
    <TabsTrigger value="purchases"><Receipt className="h-4 w-4 mr-2" /> Purchases</TabsTrigger>
    <TabsTrigger value="enrollments"><GraduationCap className="h-4 w-4 mr-2" /> Enrollments</TabsTrigger>
    <TabsTrigger asChild>
      <Link href="/admin/users/reconciliation" className="flex items-center justify-center">
        <Link2 className="h-4 w-4 mr-2" /> Reconcile
      </Link>
    </TabsTrigger>
  </TabsList>
  
  {/* Tab content components */}
</Tabs>
```

## Profile Tab

### Implementation

The Profile tab is implemented by the `UserProfileForm` component in `components/admin/user-profile-form.tsx`.

### Data Sources

- **Primary Table**: `unified_profiles`
- **Related Tables**: None
- **Server Action**: `updateUserProfile` in `app/actions/admin-users.ts`

### Functionality

1. **Display User Information**:
   - First Name, Last Name, Email, Phone
   - Role selection (user, admin, moderator)
   - Status indicator

2. **Edit User Information**:
   - Form validation using Zod schema
   - Client-side validation for required fields and format
   - Server-side validation and error handling

3. **Update Process**:
   - Form submission triggers the `updateUserProfile` server action
   - Optimistic updates for better UX
   - Toast notifications for success/failure
   - Audit logging of all changes

### Code Structure

```tsx
// Form schema definition
const profileFormSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  role: z.string(),
  // Additional fields...
});

// Component implementation
export function UserProfileForm({ user, roles }: UserProfileFormProps) {
  // Form initialization with React Hook Form
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      first_name: user.first_name || "",
      // Other fields...
    },
  });
  
  // Form submission handler
  const onSubmit = async (values: ProfileFormValues) => {
    // Call server action to update profile
    const result = await updateUserProfile(user.id, values);
    // Handle result...
  };
  
  // Render form...
}
```

## Security Tab

### Implementation

The Security tab is implemented by the `UserSecurityForm` component in `components/admin/user-security-form.tsx`.

### Data Sources

- **Primary Table**: `unified_profiles`
- **Related Tables**: None
- **Server Actions**: 
  - `resetUserPassword` in `app/actions/admin-users.ts`
  - `updateUserSecurity` in `app/actions/admin-users.ts`

### Functionality

1. **Security Information**:
   - Account creation date
   - Last login date and time
   - Login count
   - Two-factor authentication status

2. **Security Actions**:
   - Password reset (sends email to user)
   - Force logout from all devices
   - Enable/disable two-factor authentication
   - Lock/unlock account

3. **Audit Trail**:
   - All security actions are logged to the `admin_audit_log` table
   - Includes admin ID, action type, timestamp, and affected user

### Implementation Status

⚠️ **Partially Implemented**: The UI components are in place, but some backend functionality (force logout, 2FA management) requires additional implementation.

## Membership Tab

### Implementation

The Membership tab is implemented by the `UserMembershipForm` component in `components/admin/user-membership-form.tsx`.

### Data Sources

- **Primary Table**: `memberships`
- **Related Tables**: `membership_tiers`
- **Server Actions**: 
  - `updateUserMembership` in `app/actions/admin-users.ts`
  - `cancelUserMembership` in `app/actions/admin-users.ts`

### Functionality

1. **Membership Information**:
   - Current membership tier
   - Subscription status (active, canceled, expired)
   - Billing cycle (monthly, annual)
   - Next billing date
   - Payment method

2. **Membership Actions**:
   - Change membership tier
   - Cancel membership
   - Apply discount or coupon
   - Override billing cycle

3. **Billing History**:
   - Recent invoices
   - Payment status

### Implementation Status

⚠️ **Partially Implemented**: The UI components are in place, but integration with payment providers (Stripe, etc.) requires additional implementation.

## Courses Tab

### Implementation

The Courses tab is implemented by the `UserCourses` component in `components/admin/user-courses.tsx`.

### Data Sources

- **Primary Table**: `enrollments`
- **Related Tables**: `courses`
- **Server Actions**: 
  - `enrollUserInCourse` in `app/actions/admin-users.ts`
  - `unenrollUserFromCourse` in `app/actions/admin-users.ts`

### Functionality

1. **Course Enrollments**:
   - List of courses the user is enrolled in
   - Enrollment date
   - Progress percentage
   - Completion status

2. **Course Actions**:
   - Enroll user in a new course
   - Unenroll user from a course
   - Reset course progress
   - Grant certificate manually

### Implementation Status

⚠️ **Partially Implemented**: The UI components are in place, but some actions (reset progress, grant certificate) require additional implementation.

## Activity Tab

### Implementation

The Activity tab is implemented by the `UserActivity` component in `components/admin/user-activity.tsx`.

### Data Sources

- **Primary Table**: `user_activity_log`
- **Related Tables**: None
- **Server Actions**: None (read-only)

### Functionality

1. **Activity Log**:
   - Chronological list of user activities
   - Activity type (login, content view, purchase, etc.)
   - Timestamp
   - IP address and device information
   - Resource identifier (course ID, lesson ID, etc.)

2. **Filtering and Search**:
   - Filter by activity type
   - Filter by date range
   - Search by resource or content

### Implementation Status

⚠️ **Partially Implemented**: Basic activity display is implemented, but filtering and search functionality requires additional implementation.

## Purchases Tab

### Implementation

The Purchases tab is implemented by the `UserPurchaseHistory` component in `components/admin/user-purchase-history.tsx`.

### Data Sources

- **Primary Tables**: `transactions`, `shopify_orders`
- **Related Tables**: `shopify_order_items`
- **Server Actions**: None (read-only)

### Functionality

1. **Purchase History**:
   - List of all purchases (courses, memberships, products)
   - Purchase date
   - Amount and currency
   - Payment method
   - Status (completed, refunded, failed)

2. **Purchase Details**:
   - Order/transaction ID
   - Line items
   - Discounts applied
   - Taxes and fees

3. **Actions**:
   - View receipt/invoice
   - Issue refund (admin only)
   - Resend receipt

### Implementation Status

⚠️ **Partially Implemented**: Basic purchase display is implemented, but detailed actions require integration with payment providers.

## Enrollments Tab

### Implementation

The Enrollments tab is implemented by the `UserEnrollments` component in `components/admin/user-enrollments.tsx`.

### Data Sources

- **Primary Table**: `enrollments`
- **Related Tables**: `courses`, `lessons`, `lesson_completions`
- **Server Actions**: 
  - `updateUserEnrollment` in `app/actions/admin-users.ts`
  - `deleteUserEnrollment` in `app/actions/admin-users.ts`

### Functionality

1. **Enrollment Management**:
   - List of course enrollments
   - Enrollment date and expiration
   - Progress tracking
   - Completion status

2. **Enrollment Actions**:
   - Extend enrollment period
   - Grant special access
   - Reset progress
   - Revoke enrollment

### Implementation Status

⚠️ **Partially Implemented**: Basic enrollment display is implemented, but advanced actions require additional implementation.

## Reconciliation Tab

### Implementation

The Reconciliation tab is implemented as a separate page at `/admin/users/reconciliation` and uses the `AccountReconciliation` component in `components/admin/account-reconciliation.tsx`.

See the [Account Reconciliation Implementation Documentation](./account-reconciliation-implementation.md) for detailed information.

## Database Integration

### Key Tables

1. **unified_profiles**
   - Primary user accounts table
   - Contains basic user information (name, email, phone)
   - Contains `admin_metadata` JSONB field for additional data

2. **memberships**
   - User membership information
   - Links to `membership_tiers` for plan details

3. **enrollments**
   - Course enrollment records
   - Links users to courses with enrollment metadata

4. **transactions**
   - Purchase records
   - Contains payment information and status

5. **user_activity_log**
   - User activity tracking
   - Records all user actions in the system

6. **admin_audit_log**
   - Admin action tracking
   - Records all admin actions for accountability

### Views

1. **monthly_enrollments_view**
   - Aggregates enrollment data by month
   - Used for reporting and analytics

2. **revenue_analysis_view**
   - Aggregates transaction data for revenue reporting
   - Used in admin dashboards

3. **marketing_source_view**
   - Tracks user acquisition sources
   - Used for marketing analysis

### Functions/Triggers

1. **sync_profile_data**
   - Synchronizes data between related user tables

2. **calculate_enrollment_metrics**
   - Updates enrollment statistics

3. **update_revenue_metrics**
   - Updates revenue statistics

4. **handle_transaction_insert**
   - Trigger for new transactions

5. **handle_profile_update**
   - Trigger for profile updates

## Future Enhancements

1. **Profile Tab**:
   - Add avatar upload functionality
   - Implement tag management
   - Add custom field support

2. **Security Tab**:
   - Complete two-factor authentication management
   - Implement session management
   - Add IP restriction capabilities

3. **Membership Tab**:
   - Complete integration with payment providers
   - Implement subscription management
   - Add proration handling

4. **Courses Tab**:
   - Implement progress reset functionality
   - Add certificate management
   - Implement bulk enrollment

5. **Activity Tab**:
   - Implement advanced filtering
   - Add export functionality
   - Implement anomaly detection

6. **Purchases Tab**:
   - Complete integration with payment providers
   - Implement refund processing
   - Add receipt generation

7. **Enrollments Tab**:
   - Implement enrollment extension
   - Add bulk operations
   - Implement detailed progress tracking

8. **Reconciliation Tab**:
   - Implement account merging
   - Add rollback capability
   - Implement bulk reconciliation

## Technical Notes

1. **Component Structure**:
   - Each tab is implemented as a separate React component
   - Components use React Hook Form for form handling
   - Zod schemas for validation

2. **Server Actions**:
   - Server-side functions in `app/actions/admin-users.ts`
   - Handle data validation and database operations
   - Implement proper error handling and logging

3. **Data Fetching**:
   - Server components fetch initial data
   - Client components use server actions for updates
   - Optimistic updates for better UX

4. **Security Considerations**:
   - Admin-only access to all tabs
   - Validation of admin status before each operation
   - Comprehensive audit logging
