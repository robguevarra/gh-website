# User Data Schema Audit for Admin User Management

## Overview
This document provides a comprehensive audit of the existing user-related tables, views, and functions in the Graceful Homeschooling database. The audit focuses on identifying the current structure, relationships, and potential gaps that need to be addressed for implementing the admin user management system.

## Core User-Related Tables

### 1. `unified_profiles` Table
This is the central user profile table that stores core user information.

| Column Name | Data Type | Nullable | Default | Description |
|-------------|-----------|----------|---------|-------------|
| id | uuid | NO | NULL | Primary key, references auth.users.id |
| email | text | NO | NULL | User's email address (normalized) |
| first_name | text | YES | NULL | User's first name |
| last_name | text | YES | NULL | User's last name |
| phone | text | YES | NULL | User's phone number |
| tags | text[] | YES | NULL | Array of tags associated with the user |
| acquisition_source | text | YES | NULL | Source of user acquisition (e.g., 'squeeze', 'canva') |
| created_at | timestamptz | NO | now() | Timestamp when profile was created |
| updated_at | timestamptz | NO | now() | Timestamp when profile was last updated |

**Notes:**
- This table implements the unified user profile structure defined in Phase 3-0.
- The `id` field links to Supabase Auth users, ensuring authentication integration.
- Email is normalized (lowercase, trimmed) as per the data unification strategy.
- Tags are stored as an array, split from comma-separated values in the original Systemeio data.

### 2. `transactions` Table
Stores payment and transaction information from various sources.

| Column Name | Data Type | Nullable | Default | Description |
|-------------|-----------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| user_id | uuid | YES | NULL | Foreign key to unified_profiles.id |
| amount | numeric | NO | NULL | Transaction amount |
| currency | text | NO | 'PHP' | Currency code |
| status | text | NO | 'pending' | Transaction status (completed, pending, expired) |
| payment_method | text | YES | NULL | Method of payment |
| created_at | timestamptz | YES | now() | Timestamp when transaction was created |
| updated_at | timestamptz | YES | now() | Timestamp when transaction was last updated |
| transaction_type | text | NO | 'unknown' | Type of transaction (P2P, Canva, etc.) |
| external_id | text | YES | NULL | External reference ID (e.g., from Xendit) |
| paid_at | timestamptz | YES | NULL | Timestamp when payment was made |
| settled_at | timestamptz | YES | NULL | Timestamp when payment was settled |
| expires_at | timestamptz | YES | NULL | Timestamp when transaction expires |
| metadata | jsonb | YES | NULL | Additional transaction metadata |
| contact_email | text | YES | NULL | Contact email for the transaction |

**Notes:**
- This table consolidates payment information from Xendit and potentially other sources.
- Status values are normalized according to the mapping defined in Phase 3-0.
- The `transaction_type` field identifies the product or service purchased.
- Timestamps follow the ISO 8601 format in UTC as specified in the data unification strategy.

### 3. `enrollments` Table
Tracks user enrollments in courses, linking users, courses, and transactions.

| Column Name | Data Type | Nullable | Default | Description |
|-------------|-----------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| user_id | uuid | NO | NULL | Foreign key to unified_profiles.id |
| course_id | uuid | NO | NULL | Foreign key to courses.id |
| transaction_id | uuid | YES | NULL | Foreign key to transactions.id |
| status | text | NO | NULL | Enrollment status (active, expired, pending) |
| enrolled_at | timestamptz | NO | now() | Timestamp when user was enrolled |
| expires_at | timestamptz | YES | NULL | Timestamp when enrollment expires |
| last_accessed_at | timestamptz | YES | NULL | Timestamp when course was last accessed |
| metadata | jsonb | YES | '{}' | Additional enrollment metadata |

**Notes:**
- This table implements the enrollment data model defined in Phase 3-0.
- It creates a many-to-many relationship between users and courses.
- Enrollments are typically created automatically via the `handle_transaction_insert` trigger when a P2P transaction is completed.
- The `status` field tracks whether the enrollment is active, expired, or pending.

### 4. `shopify_customers` Table
Stores customer information from Shopify.

| Column Name | Data Type | Nullable | Default | Description |
|-------------|-----------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| unified_profile_id | uuid | YES | NULL | Foreign key to unified_profiles.id |
| shopify_customer_id | bigint | NO | NULL | Shopify's customer ID |
| email | text | YES | NULL | Customer's email address |
| first_name | text | YES | NULL | Customer's first name |
| last_name | text | YES | NULL | Customer's last name |
| phone | text | YES | NULL | Customer's phone number |
| accepts_marketing | boolean | YES | NULL | Whether customer accepts marketing |
| orders_count | integer | YES | NULL | Number of orders placed |
| total_spent | numeric | YES | NULL | Total amount spent |
| state | text | YES | NULL | Customer state (enabled, disabled, etc.) |
| tags | text[] | YES | NULL | Array of tags associated with the customer |
| created_at | timestamptz | YES | NULL | Timestamp when customer was created |
| updated_at | timestamptz | YES | NULL | Timestamp when customer was last updated |

**Notes:**
- This table stores Shopify customer data as part of the Shopify integration (Phase 5).
- The `unified_profile_id` field links Shopify customers to unified profiles, enabling cross-platform user identification.
- Customer data is synced from Shopify via webhooks as described in the Shopify integration strategy.

### 5. `shopify_orders` Table
Stores order information from Shopify.

| Column Name | Data Type | Nullable | Default | Description |
|-------------|-----------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| customer_id | uuid | YES | NULL | Foreign key to shopify_customers.id |
| shopify_order_id | bigint | NO | NULL | Shopify's order ID |
| order_number | text | YES | NULL | Order number |
| email | text | YES | NULL | Customer's email address |
| phone | text | YES | NULL | Customer's phone number |
| total_price | numeric | YES | NULL | Total order price |
| subtotal_price | numeric | YES | NULL | Subtotal price |
| total_tax | numeric | YES | NULL | Total tax amount |
| total_discounts | numeric | YES | NULL | Total discounts applied |
| currency | text | YES | NULL | Currency code |
| financial_status | text | YES | NULL | Financial status (paid, refunded, etc.) |
| fulfillment_status | text | YES | NULL | Fulfillment status |
| landing_site | text | YES | NULL | Landing site URL |
| referring_site | text | YES | NULL | Referring site URL |
| source_name | text | YES | NULL | Source of the order |
| tags | text[] | YES | NULL | Array of tags associated with the order |
| created_at | timestamptz | YES | NULL | Timestamp when order was created |
| updated_at | timestamptz | YES | NULL | Timestamp when order was last updated |
| processed_at | timestamptz | YES | NULL | Timestamp when order was processed |
| closed_at | timestamptz | YES | NULL | Timestamp when order was closed |
| cancelled_at | timestamptz | YES | NULL | Timestamp when order was cancelled |

**Notes:**
- This table stores Shopify order data as part of the Shopify integration (Phase 5).
- Orders are linked to Shopify customers via the `customer_id` field.
- The financial and fulfillment status fields track the order's state.

### 6. `shopify_order_items` Table
Stores line items for Shopify orders.

| Column Name | Data Type | Nullable | Default | Description |
|-------------|-----------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| order_id | uuid | YES | NULL | Foreign key to shopify_orders.id |
| shopify_line_item_id | bigint | NO | NULL | Shopify's line item ID |
| product_id | uuid | YES | NULL | Foreign key to shopify_products.id |
| variant_id | uuid | YES | NULL | Foreign key to shopify_variants.id |
| shopify_product_id | bigint | YES | NULL | Shopify's product ID |
| shopify_variant_id | bigint | YES | NULL | Shopify's variant ID |
| title | text | YES | NULL | Product title |
| variant_title | text | YES | NULL | Variant title |
| sku | text | YES | NULL | Stock keeping unit |
| quantity | integer | YES | NULL | Quantity ordered |
| price | numeric | YES | NULL | Price per unit |
| total_discount | numeric | YES | NULL | Total discount applied |
| vendor | text | YES | NULL | Product vendor |

**Notes:**
- This table stores line items for Shopify orders as part of the Shopify integration (Phase 5).
- Line items are linked to orders via the `order_id` field.
- Line items are also linked to products and variants via the respective foreign keys.

### 7. `shopify_products` Table
Stores product information from Shopify.

| Column Name | Data Type | Nullable | Default | Description |
|-------------|-----------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| shopify_product_id | bigint | NO | NULL | Shopify's product ID |
| title | text | YES | NULL | Product title |
| handle | text | YES | NULL | Product handle (URL slug) |
| product_type | text | YES | NULL | Product type |
| status | text | YES | NULL | Product status (active, archived, etc.) |
| created_at | timestamptz | YES | NULL | Timestamp when product was created |
| updated_at | timestamptz | YES | NULL | Timestamp when product was last updated |
| published_at | timestamptz | YES | NULL | Timestamp when product was published |
| vendor | text | YES | NULL | Product vendor |
| tags | text[] | YES | NULL | Array of tags associated with the product |
| featured_image_url | text | YES | NULL | URL of the featured image |
| google_drive_file_id | text | YES | NULL | Google Drive file ID for the product |
| description_html | text | YES | NULL | HTML description of the product |
| image_urls | jsonb | YES | NULL | JSON object with image URLs |
| collection_handles | text[] | YES | NULL | Array of collection handles |
| is_one_time_purchase | boolean | YES | false | Whether the product is a one-time purchase |

**Notes:**
- This table stores Shopify product data as part of the Shopify integration (Phase 5).
- Products are synced from Shopify via webhooks as described in the Shopify integration strategy.
- The `tags` field includes access control tags like `access:public` or `access:members`.
- The `google_drive_file_id` field links products to Google Drive files, which is relevant for the admin product-drive mapping functionality.

## Key Views

### 1. `revenue_analysis_view`
Combines transaction data from both Xendit (transactions table) and Shopify (shopify_orders table) to provide a unified view of revenue.

**Purpose:**
- Provides a consolidated view of all transactions across platforms
- Normalizes status values and payment methods
- Includes product details for reporting

**Key Fields:**
- transaction_id
- source_platform (xendit, shopify)
- user_id (linked to unified_profiles)
- email
- transaction_datetime
- amount, currency, status
- payment_method
- product_details (as JSON)
- external_reference

**Notes:**
- This view is crucial for the admin dashboard's revenue reporting
- It demonstrates how data from different sources is unified
- The product_details JSON structure varies between Xendit and Shopify sources

### 2. `marketing_source_view`
Provides attribution data for marketing sources based on user tags and acquisition sources.

### 3. `monthly_enrollments_view`
Aggregates enrollment data by month for trend analysis.

## Key Functions and Triggers

### 1. `sync_profile_data()`
Synchronizes user profile data from source systems to the unified_profiles table.

### 2. `migrate_profiles()` and `migrate_profiles_upsert()`
Handles the migration of profile data from legacy systems to the unified data model.

### 3. `migrate_transactions()` and `migrate_transactions_upsert()`
Handles the migration of transaction data from legacy systems to the unified data model.

### 4. `generate_enrollments()`
Creates enrollment records based on completed transactions.

### 5. `handle_transaction_insert()`
Trigger function that automatically creates enrollments when a transaction is inserted.

### 6. `handle_profile_update()`
Trigger function that handles updates to user profiles.

### 7. `sync_new_data()`
Synchronizes new data from source systems to the unified data model.

### 8. `calculate_enrollment_metrics()`
Calculates metrics related to user enrollments for reporting.

### 9. `update_revenue_metrics()`
Updates revenue metrics for reporting.

## Entity Relationships

1. `unified_profiles` ←→ `transactions` (one-to-many)
   - A user can have multiple transactions
   - Each transaction belongs to one user

2. `unified_profiles` ←→ `enrollments` (one-to-many)
   - A user can have multiple enrollments
   - Each enrollment belongs to one user

3. `transactions` ←→ `enrollments` (one-to-many)
   - A transaction can generate multiple enrollments
   - Each enrollment is typically linked to one transaction

4. `unified_profiles` ←→ `shopify_customers` (one-to-one)
   - A unified profile can be linked to one Shopify customer
   - Each Shopify customer is linked to one unified profile

5. `shopify_customers` ←→ `shopify_orders` (one-to-many)
   - A Shopify customer can have multiple orders
   - Each order belongs to one customer

6. `shopify_orders` ←→ `shopify_order_items` (one-to-many)
   - An order can have multiple line items
   - Each line item belongs to one order

7. `shopify_products` ←→ `shopify_order_items` (one-to-many)
   - A product can appear in multiple order items
   - Each order item refers to one product

## Identified Gaps for Admin User Management

### 1. User Administrative Metadata
- **Gap:** No dedicated fields for admin-specific user metadata (notes, flags, admin-set status)
- **Recommendation:** Add an `admin_metadata` JSONB field to `unified_profiles` or create a separate `user_admin_data` table

### 2. Audit Logging
- **Gap:** No comprehensive audit logging for administrative actions
- **Recommendation:** Create an `admin_audit_log` table to track all administrative actions on user accounts

### 3. User Activity Tracking
- **Gap:** Limited tracking of user activity beyond course access
- **Recommendation:** Implement a `user_activity_log` table to track logins, feature usage, and other engagement metrics

### 4. User Notes
- **Gap:** No capability for administrators to add notes to user accounts
- **Recommendation:** Create a `user_notes` table with timestamps, author, and note content

### 5. User Permissions and Roles
- **Gap:** Basic role system exists but lacks granular permissions for the admin interface
- **Recommendation:** Enhance the permissions system to support role-based access control for admin features

### 6. User Search and Filtering
- **Gap:** No optimized indexes or search functions for admin user lookup
- **Recommendation:** Add appropriate indexes and create helper functions for efficient user searching

### 7. Relationship Between Transactions and Shopify Orders
- **Gap:** No direct link between the `transactions` table and `shopify_orders`
- **Recommendation:** Consider adding a reference or creating a view that unifies these for complete purchase history

### 8. User Status Management
- **Gap:** No centralized way to manage user account status (active, suspended, etc.)
- **Recommendation:** Add a `status` field to `unified_profiles` with appropriate constraints

## Recommendations for Schema Enhancement

1. **Add Administrative Fields to `unified_profiles`:**
   ```sql
   ALTER TABLE unified_profiles 
   ADD COLUMN status text NOT NULL DEFAULT 'active',
   ADD COLUMN admin_metadata jsonb DEFAULT '{}',
   ADD COLUMN last_login_at timestamptz,
   ADD COLUMN login_count integer DEFAULT 0;
   ```

2. **Create User Notes Table:**
   ```sql
   CREATE TABLE user_notes (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id uuid NOT NULL REFERENCES unified_profiles(id) ON DELETE CASCADE,
     admin_id uuid NOT NULL REFERENCES unified_profiles(id),
     note_text text NOT NULL,
     created_at timestamptz NOT NULL DEFAULT now(),
     updated_at timestamptz NOT NULL DEFAULT now()
   );
   CREATE INDEX user_notes_user_id_idx ON user_notes(user_id);
   ```

3. **Create Admin Audit Log Table:**
   ```sql
   CREATE TABLE admin_audit_log (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     admin_id uuid NOT NULL REFERENCES unified_profiles(id),
     user_id uuid REFERENCES unified_profiles(id),
     action_type text NOT NULL,
     entity_type text NOT NULL,
     entity_id uuid,
     previous_state jsonb,
     new_state jsonb,
     ip_address text,
     created_at timestamptz NOT NULL DEFAULT now()
   );
   CREATE INDEX admin_audit_log_user_id_idx ON admin_audit_log(user_id);
   CREATE INDEX admin_audit_log_admin_id_idx ON admin_audit_log(admin_id);
   CREATE INDEX admin_audit_log_action_type_idx ON admin_audit_log(action_type);
   CREATE INDEX admin_audit_log_created_at_idx ON admin_audit_log(created_at);
   ```

4. **Create User Activity Log Table:**
   ```sql
   CREATE TABLE user_activity_log (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id uuid NOT NULL REFERENCES unified_profiles(id) ON DELETE CASCADE,
     activity_type text NOT NULL,
     metadata jsonb DEFAULT '{}',
     ip_address text,
     user_agent text,
     created_at timestamptz NOT NULL DEFAULT now()
   );
   CREATE INDEX user_activity_log_user_id_idx ON user_activity_log(user_id);
   CREATE INDEX user_activity_log_activity_type_idx ON user_activity_log(activity_type);
   CREATE INDEX user_activity_log_created_at_idx ON user_activity_log(created_at);
   ```

5. **Optimize Indexes for User Searching:**
   ```sql
   CREATE INDEX unified_profiles_email_trgm_idx ON unified_profiles USING gin (email gin_trgm_ops);
   CREATE INDEX unified_profiles_first_name_trgm_idx ON unified_profiles USING gin (first_name gin_trgm_ops);
   CREATE INDEX unified_profiles_last_name_trgm_idx ON unified_profiles USING gin (last_name gin_trgm_ops);
   CREATE INDEX unified_profiles_tags_idx ON unified_profiles USING gin (tags);
   ```

6. **Create Unified Purchase History View:**
   ```sql
   CREATE OR REPLACE VIEW user_purchase_history_view AS
   SELECT
     up.id AS user_id,
     up.email,
     up.first_name,
     up.last_name,
     'transaction' AS record_type,
     t.id AS record_id,
     t.amount,
     t.currency,
     t.status,
     t.transaction_type AS product_type,
     t.created_at AS purchase_date,
     t.payment_method,
     t.external_id AS reference
   FROM
     unified_profiles up
     JOIN transactions t ON up.id = t.user_id
   UNION ALL
   SELECT
     up.id AS user_id,
     up.email,
     up.first_name,
     up.last_name,
     'shopify_order' AS record_type,
     so.id AS record_id,
     so.total_price AS amount,
     so.currency,
     so.financial_status AS status,
     'shopify' AS product_type,
     so.processed_at AS purchase_date,
     so.source_name AS payment_method,
     so.order_number AS reference
   FROM
     unified_profiles up
     JOIN shopify_customers sc ON up.id = sc.unified_profile_id
     JOIN shopify_orders so ON sc.id = so.customer_id;
   ```

## Next Steps

1. Review and validate this schema audit with stakeholders
2. Implement the recommended schema enhancements
3. Create appropriate indexes and constraints for performance and data integrity
4. Develop data access patterns and server-side functions for the admin interface
5. Design and implement the user interface components based on this data model

## Appendix: SQL Queries for Schema Validation

### Validate User Profile Completeness
```sql
SELECT
  COUNT(*) AS total_profiles,
  SUM(CASE WHEN email IS NULL THEN 1 ELSE 0 END) AS missing_email,
  SUM(CASE WHEN first_name IS NULL THEN 1 ELSE 0 END) AS missing_first_name,
  SUM(CASE WHEN last_name IS NULL THEN 1 ELSE 0 END) AS missing_last_name,
  SUM(CASE WHEN phone IS NULL THEN 1 ELSE 0 END) AS missing_phone
FROM
  unified_profiles;
```

### Check for Users Without Transactions
```sql
SELECT
  up.id,
  up.email,
  up.first_name,
  up.last_name,
  up.created_at
FROM
  unified_profiles up
  LEFT JOIN transactions t ON up.id = t.user_id
WHERE
  t.id IS NULL;
```

### Identify Orphaned Transactions
```sql
SELECT
  t.id,
  t.amount,
  t.status,
  t.transaction_type,
  t.created_at
FROM
  transactions t
  LEFT JOIN unified_profiles up ON t.user_id = up.id
WHERE
  up.id IS NULL;
```

### Check for Duplicate Emails
```sql
SELECT
  email,
  COUNT(*) AS count
FROM
  unified_profiles
GROUP BY
  email
HAVING
  COUNT(*) > 1;
```
