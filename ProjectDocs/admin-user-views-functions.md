# User-Related Views and Functions Documentation

## Overview
This document provides a detailed analysis of the views, functions, and triggers in the Graceful Homeschooling database that interact with user data. These database objects are crucial for the admin user management system as they provide the underlying logic for data transformation, business rules, and reporting capabilities.

## Key Views

### 1. `revenue_analysis_view`

**Purpose:** Provides a unified view of revenue data from both Xendit transactions and Shopify orders.

**Implementation Details:**
- Combines data from `transactions` (Xendit) and `shopify_orders` (Shopify) tables
- Normalizes status values across platforms (e.g., 'PAID'/'SETTLED' → 'completed')
- Includes product details as JSON for detailed reporting
- Links to user profiles via `user_id` or `unified_profile_id`

**Key Fields:**
- `transaction_id`: Unique identifier for the transaction
- `source_platform`: Platform source ('xendit' or 'shopify')
- `user_id`: Reference to unified_profiles.id
- `email`: User's email address
- `transaction_datetime`: When the transaction occurred
- `amount`, `currency`: Transaction amount and currency
- `status`: Normalized status (completed, pending, expired, etc.)
- `payment_method`: Method used for payment
- `product_details`: JSON object with product information
- `external_reference`: External reference ID

**Usage in Admin System:**
- Powers revenue reporting in the admin dashboard
- Provides transaction history for user detail views
- Enables filtering and searching across all revenue sources

### 2. `user_purchase_history_view`

**Purpose:** Provides a consolidated view of all user purchases across different platforms.

**Implementation Details:**
- Combines data from `transactions` and `shopify_orders`
- Standardizes field names and formats for consistent display
- Includes detailed product information for Shopify orders
- Directly links to unified user profiles

**Key Fields:**
- `user_id`: Reference to unified_profiles.id
- `email`, `first_name`, `last_name`: User identification
- `record_type`: Type of record ('transaction' or 'shopify_order')
- `record_id`: ID of the original record
- `amount`, `currency`: Purchase amount and currency
- `status`: Status of the purchase
- `product_type`: Type of product purchased
- `purchase_date`: When the purchase was made
- `payment_method`: Method used for payment
- `reference`: External reference number
- `product_details`: JSON object with product details (for Shopify orders)

**Usage in Admin System:**
- Provides a unified purchase history for user detail views
- Enables comprehensive reporting across all purchase types
- Supports filtering and searching of purchase records

### 3. `marketing_performance_view`

**Purpose:** Combines marketing spend data with conversion metrics for ROI analysis.

**Implementation Details:**
- Joins ad spend data with enrollment and transaction data
- Uses user acquisition source from unified_profiles for attribution
- Provides a comprehensive view of marketing performance

**Key Fields:**
- `date`: Date of the marketing activity or conversion
- `spend`, `impressions`, `clicks`: Marketing metrics
- Campaign, adset, and ad information
- `transaction_id`, `enrollment_id`: Conversion identifiers
- `attributed_revenue`: Revenue attributed to marketing
- `source_channel`: Marketing channel or acquisition source

**Usage in Admin System:**
- Powers marketing ROI reporting in the admin dashboard
- Helps identify valuable user acquisition channels
- Supports user segmentation by acquisition source

## Key Functions

### 1. `handle_transaction_insert()`

**Type:** Trigger Function

**Purpose:** Automatically creates course enrollments when a completed P2P transaction is inserted.

**Implementation Details:**
```sql
CREATE OR REPLACE FUNCTION public.handle_transaction_insert()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.status = 'completed' AND NEW.transaction_type = 'P2P' THEN
    INSERT INTO enrollments (id, user_id, course_id, transaction_id, status, enrolled_at)
    SELECT
      gen_random_uuid(), NEW.user_id,
      (SELECT id FROM courses WHERE lower(title) = 'papers to profits' LIMIT 1),
      NEW.id, 'active', NEW.paid_at
    ON CONFLICT (user_id, course_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$
```

**Business Logic:**
- Triggered after a new transaction is inserted
- Checks if the transaction is completed and for the P2P product
- Creates an enrollment record linking the user to the "Papers to Profits" course
- Uses conflict handling to prevent duplicate enrollments
- Sets the enrollment status to 'active'

**Usage in Admin System:**
- Ensures automatic enrollment creation when transactions are processed
- Maintains referential integrity between transactions and enrollments
- Supports the user enrollment management features

### 2. `generate_enrollments()`

**Type:** Function

**Purpose:** Batch generates enrollment records for completed P2P transactions.

**Implementation Details:**
```sql
CREATE OR REPLACE FUNCTION public.generate_enrollments()
RETURNS void
LANGUAGE plpgsql
AS $function$
DECLARE
  course_uuid UUID;
BEGIN
  SELECT id INTO course_uuid FROM courses WHERE lower(name) = 'papers to profits' LIMIT 1;
  IF course_uuid IS NULL THEN
    RAISE NOTICE 'Course "Papers to Profits" not found';
    RETURN;
  END IF;
  INSERT INTO enrollments (id, user_id, course_id, transaction_id, status, enrolled_at, expires_at)
  SELECT
    gen_random_uuid(),
    t.user_id,
    course_uuid,
    t.id,
    'active',
    t.paid_at,
    NULL
  FROM transactions t
  WHERE t.status = 'completed' AND t.transaction_type = 'P2P'
  ON CONFLICT (user_id, course_id) DO NOTHING;
END;
$function$
```

**Business Logic:**
- Finds the "Papers to Profits" course ID
- Inserts enrollment records for all completed P2P transactions
- Uses conflict handling to prevent duplicate enrollments
- Sets enrollment status to 'active'

**Usage in Admin System:**
- Used for bulk enrollment generation during data migration
- Can be called manually to fix missing enrollments
- Ensures data consistency between transactions and enrollments

### 3. `sync_profile_data()`

**Type:** Function

**Purpose:** Synchronizes user profile data from source systems to the unified_profiles table.

**Implementation Details:**
```sql
CREATE OR REPLACE FUNCTION public.sync_profile_data()
RETURNS void
LANGUAGE plpgsql
AS $function$
BEGIN
  -- Merge logic: upsert from both sources, normalize email, tags, etc.
  -- Conflict resolution: Systemeio for profile, Xendit for payment info
  -- Audit logging for all changes
END;
$function$
```

**Business Logic:**
- Merges profile data from multiple sources
- Normalizes email addresses and other fields
- Applies conflict resolution rules (Systemeio for profile, Xendit for payment)
- Logs all changes for audit purposes

**Usage in Admin System:**
- Used during data migration and synchronization
- Ensures consistent user profile data across systems
- Supports the unified user view in the admin interface

### 4. `search_users()`

**Type:** Function

**Purpose:** Provides advanced user searching capabilities for the admin interface.

**Implementation Details:**
```sql
CREATE OR REPLACE FUNCTION public.search_users(
  p_search_term text DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_tags text[] DEFAULT NULL,
  p_acquisition_source text DEFAULT NULL,
  p_created_after timestamptz DEFAULT NULL,
  p_created_before timestamptz DEFAULT NULL,
  p_has_transactions boolean DEFAULT NULL,
  p_has_enrollments boolean DEFAULT NULL,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  id uuid,
  email text,
  first_name text,
  last_name text,
  phone text,
  tags text[],
  acquisition_source text,
  status text,
  admin_metadata jsonb,
  created_at timestamptz,
  updated_at timestamptz,
  last_login_at timestamptz,
  login_count integer,
  transaction_count bigint,
  enrollment_count bigint,
  total_spent numeric
)
LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  WITH user_counts AS (
    SELECT
      up.id,
      COUNT(DISTINCT t.id) AS transaction_count,
      COUNT(DISTINCT e.id) AS enrollment_count,
      COALESCE(SUM(t.amount), 0) AS total_spent
    FROM
      unified_profiles up
      LEFT JOIN transactions t ON up.id = t.user_id
      LEFT JOIN enrollments e ON up.id = e.user_id
    GROUP BY
      up.id
  )
  SELECT
    up.id,
    up.email,
    up.first_name,
    up.last_name,
    up.phone,
    up.tags,
    up.acquisition_source,
    up.status,
    up.admin_metadata,
    up.created_at,
    up.updated_at,
    up.last_login_at,
    up.login_count,
    COALESCE(uc.transaction_count, 0) AS transaction_count,
    COALESCE(uc.enrollment_count, 0) AS enrollment_count,
    COALESCE(uc.total_spent, 0) AS total_spent
  FROM
    unified_profiles up
    JOIN user_counts uc ON up.id = uc.id
  WHERE
    (p_search_term IS NULL OR 
     up.email ILIKE '%' || p_search_term || '%' OR
     up.first_name ILIKE '%' || p_search_term || '%' OR
     up.last_name ILIKE '%' || p_search_term || '%' OR
     (up.first_name || ' ' || up.last_name) ILIKE '%' || p_search_term || '%')
    AND (p_status IS NULL OR up.status = p_status)
    AND (p_tags IS NULL OR up.tags @> p_tags)
    AND (p_acquisition_source IS NULL OR up.acquisition_source = p_acquisition_source)
    AND (p_created_after IS NULL OR up.created_at >= p_created_after)
    AND (p_created_before IS NULL OR up.created_at <= p_created_before)
    AND (p_has_transactions IS NULL OR 
         (p_has_transactions = true AND uc.transaction_count > 0) OR
         (p_has_transactions = false AND uc.transaction_count = 0))
    AND (p_has_enrollments IS NULL OR 
         (p_has_enrollments = true AND uc.enrollment_count > 0) OR
         (p_has_enrollments = false AND uc.enrollment_count = 0))
  ORDER BY
    up.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$function$
```

**Business Logic:**
- Provides flexible search parameters (text search, status, tags, etc.)
- Calculates transaction and enrollment counts for each user
- Supports pagination for large result sets
- Returns comprehensive user information including admin metadata

**Usage in Admin System:**
- Powers the user list view in the admin interface
- Enables advanced filtering and searching of users
- Provides aggregated metrics for each user

### 5. `log_user_activity()`

**Type:** Function

**Purpose:** Records user activity and updates login statistics.

**Implementation Details:**
```sql
CREATE OR REPLACE FUNCTION log_user_activity(
  p_user_id uuid,
  p_activity_type text,
  p_resource_type text DEFAULT NULL,
  p_resource_id uuid DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}',
  p_ip_address text DEFAULT NULL,
  p_user_agent text DEFAULT NULL,
  p_session_id text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_log_id uuid;
BEGIN
  -- Insert the activity log entry
  INSERT INTO user_activity_log (
    user_id,
    activity_type,
    resource_type,
    resource_id,
    metadata,
    ip_address,
    user_agent,
    session_id
  ) VALUES (
    p_user_id,
    p_activity_type,
    p_resource_type,
    p_resource_id,
    p_metadata,
    p_ip_address,
    p_user_agent,
    p_session_id
  ) RETURNING id INTO v_log_id;
  
  -- If this is a login activity, update the user's login statistics
  IF p_activity_type = 'login' THEN
    UPDATE unified_profiles
    SET 
      last_login_at = now(),
      login_count = COALESCE(login_count, 0) + 1
    WHERE id = p_user_id;
  END IF;
  
  RETURN v_log_id;
END;
$function$
```

**Business Logic:**
- Records various types of user activity (login, view_course, etc.)
- Updates login statistics in the unified_profiles table
- Captures contextual information (IP, user agent, session)
- Returns the log entry ID for reference

**Usage in Admin System:**
- Tracks user engagement for reporting
- Provides activity history for user detail views
- Supports user behavior analysis

### 6. `log_admin_action()`

**Type:** Function

**Purpose:** Records administrative actions for audit and compliance.

**Implementation Details:**
```sql
CREATE OR REPLACE FUNCTION log_admin_action(
  p_admin_id uuid,
  p_user_id uuid,
  p_action_type text,
  p_entity_type text,
  p_entity_id uuid,
  p_previous_state jsonb DEFAULT NULL,
  p_new_state jsonb DEFAULT NULL,
  p_ip_address text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_log_id uuid;
BEGIN
  -- Insert the audit log entry
  INSERT INTO admin_audit_log (
    admin_id,
    user_id,
    action_type,
    entity_type,
    entity_id,
    previous_state,
    new_state,
    ip_address,
    user_agent
  ) VALUES (
    p_admin_id,
    p_user_id,
    p_action_type,
    p_entity_type,
    p_entity_id,
    p_previous_state,
    p_new_state,
    p_ip_address,
    p_user_agent
  ) RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$function$
```

**Business Logic:**
- Records all administrative actions with detailed context
- Captures before and after states for change tracking
- Includes security information (IP, user agent)
- Returns the log entry ID for reference

**Usage in Admin System:**
- Ensures compliance with audit requirements
- Provides accountability for administrative actions
- Supports troubleshooting and security monitoring

### 7. `calculate_enrollment_metrics()`

**Type:** Function

**Purpose:** Calculates metrics related to user enrollments for reporting.

**Business Logic:**
- Aggregates enrollment data by various dimensions
- Calculates key metrics like enrollment count and conversion rate
- Provides trend analysis over time

**Usage in Admin System:**
- Powers enrollment reporting in the admin dashboard
- Supports user cohort analysis
- Enables tracking of enrollment trends

### 8. `check_if_user_is_admin()`

**Type:** Function

**Purpose:** Determines if a user has administrative privileges.

**Business Logic:**
- Checks user metadata or role assignments
- Returns a boolean indicating admin status
- Used for access control to administrative features

**Usage in Admin System:**
- Controls access to the admin interface
- Restricts sensitive administrative operations
- Supports role-based security

## Triggers

### 1. `after_transaction_insert`

**Purpose:** Automatically creates enrollments when a transaction is inserted.

**Implementation:**
- Calls the `handle_transaction_insert()` function
- Triggered after INSERT on the transactions table
- Runs for each row inserted

**Business Logic:**
- Ensures automatic enrollment creation
- Maintains data consistency between transactions and enrollments
- Implements the business rule that P2P purchases grant course access

### 2. `update_user_notes_updated_at_trigger`

**Purpose:** Updates the timestamp when a user note is modified.

**Implementation:**
- Calls the `update_user_notes_updated_at()` function
- Triggered before UPDATE on the user_notes table
- Runs for each row updated

**Business Logic:**
- Ensures the updated_at timestamp reflects the latest modification
- Supports tracking of note history
- Maintains data integrity for audit purposes

## Integration Points

### 1. User Profile Management

The database objects support user profile management through:
- The unified_profiles table as the central user repository
- Functions for profile synchronization and updates
- Triggers for maintaining data integrity
- Views for comprehensive user information

### 2. Transaction and Enrollment Tracking

The database objects support transaction and enrollment tracking through:
- The transactions and enrollments tables for storing core data
- Functions for generating and managing enrollments
- Triggers for automatic enrollment creation
- Views for unified purchase history

### 3. Reporting and Analytics

The database objects support reporting and analytics through:
- Views that combine data from multiple sources
- Functions for calculating metrics and trends
- Aggregation logic for summarizing user activity
- Filtering capabilities for segmentation

## Recommendations for Enhancement

1. **Add User Activity Aggregation View**
   - Create a view that aggregates user activity by type and time period
   - Include engagement metrics like session count and duration
   - Support trend analysis over time

2. **Implement User Segmentation Functions**
   - Create functions for segmenting users by behavior and attributes
   - Support cohort analysis based on acquisition date
   - Enable targeting for marketing and communication

3. **Enhance Audit Logging**
   - Add more granular logging for specific administrative actions
   - Implement retention policies for audit logs
   - Create views for simplified audit reporting

4. **Optimize Performance**
   - Add materialized views for frequently accessed reports
   - Implement refresh strategies for materialized views
   - Add indexes for common query patterns

## Conclusion

The existing views, functions, and triggers provide a solid foundation for the admin user management system. They implement key business logic, maintain data integrity, and support reporting needs. The recommended enhancements will further improve the system's capabilities and performance.

The next steps should focus on:
1. Creating the entity relationship diagram (ERD) to visualize the data model
2. Implementing the user interface components that leverage these database objects
3. Developing additional functions and views as needed for specific admin features
