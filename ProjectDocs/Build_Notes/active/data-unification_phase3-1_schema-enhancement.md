# Data Unification - Phase 3-1: Database Schema Enhancement

## Task Objective
Implement the database schema changes necessary to create a unified data model that combines information from Xendit and Systemeio into a consistent, normalized structure for business intelligence and admin dashboard features.

## Current State Assessment
Based on the data unification strategy defined in Phase 3-0, we have two primary data sources (Xendit and Systemeio) with separate table structures. The Xendit table contains payment transaction data as the source of truth for payments, while the Systemeio table contains user profile information. Currently, there's no formal schema that properly relates these data sources or transforms the raw data into a structure optimized for business intelligence.

## Future State Goal
A properly normalized database schema with:
1. A unified user profile table that combines information from both sources
2. A standardized transactions table for payment data
3. A properly structured enrollments table connecting users to courses
4. Appropriate indexes and relationships for efficient querying
5. Views or materialized views for common dashboard queries

This enhanced schema will enable efficient querying for the admin dashboard while maintaining data integrity and supporting future platform growth.

## Relevant Context

> **Important**: When working on this build note, always ensure proper context integration from:
> 1. Data Unification Strategy (Phase 3-0)
> 2. Architecture Planning (Phase 1-1)
> 3. Project Context (`ProjectContext.md`)
>
> This ensures consistency and alignment with project goals and standards.

### From Data Unification Strategy
The strategy established:
- Email as the primary matching key between systems
- Clear data precedence rules (Xendit for payments, Systemeio for profiles)
- Validation rules for data types and formats
- Historical data preservation requirements

### From Architecture Planning
The database architecture includes:
- Core user table leveraging Supabase Auth with extension for profile data
- Normalized transaction and enrollment models
- Appropriate indexing for query performance

## Implementation Plan

### 1. Create Unified User Profiles Table
- [ ] Design and create `unified_profiles` table with:
  - Primary key linked to auth.users where available
  - Email field (indexed) for matching between systems
  - Name fields (first_name, last_name) from Systemeio
  - Contact information fields (email, phone)
  - Metadata fields for acquisition source and tags
  - Timestamps for record creation and updates
- [ ] Add appropriate indexes for common queries
  - Email index for fast lookups
  - Source/tag indexes for filtering
- [ ] Implement database constraints
  - NOT NULL constraints for required fields
  - Unique constraints for email addresses
  - CHECK constraints for data validation

### 2. Create Normalized Transactions Table
- [ ] Design and create `transactions` table with:
  - UUID primary key
  - Foreign key to unified_profiles (user_id)
  - Standard transaction fields:
    - amount (numeric with proper precision)
    - currency (standardized format)
    - status (normalized values)
    - transaction_type (product identifier)
    - payment_method
    - external_id (reference to Xendit ID)
  - Properly typed timestamp fields:
    - created_at
    - paid_at
    - settled_at
    - expires_at
- [ ] Add appropriate indexes
  - Status index for filtering
  - Timestamp indexes for date range queries
  - Transaction type index for product filtering
- [ ] Implement constraints
  - Foreign key constraints with appropriate actions
  - CHECK constraints for valid status values
  - NOT NULL constraints for required fields

### 3. Create Enrollments Table Structure
- [ ] Design and create normalized `enrollments` table:
  - UUID primary key
  - Foreign key to unified_profiles (user_id)
  - Foreign key to courses (course_id)
  - Foreign key to transactions (transaction_id)
  - Status field with normalized values
  - Properly typed timestamp fields:
    - enrolled_at
    - expires_at
    - last_accessed_at
  - Metadata fields for additional enrollment information
- [ ] Add appropriate indexes:
  - Status index for active enrollment filtering
  - Timestamp indexes for expiration/recency queries
  - Compound indexes for common dashboard queries
- [ ] Implement constraints:
  - Foreign key constraints with appropriate actions
  - CHECK constraints for valid status values
  - NOT NULL constraints for required fields

### 4. Create Analytics Views
- [ ] Design and create `monthly_enrollments_view`:
  - Monthly aggregation of enrollment counts
  - Segmentation by course/product
  - Calculation of growth metrics
- [ ] Design and create `revenue_analysis_view`:
  - Monthly revenue aggregation
  - Segmentation by product
  - Calculation of average transaction value
- [ ] Design and create `marketing_source_view`:
  - Aggregation of user acquisition by source
  - Conversion metrics from signup to payment
  - Cohort-based analysis capabilities

### 5. Implement Database Functions
- [ ] Create `sync_profile_data` function:
  - Logic to merge Xendit and Systemeio data
  - Conflict resolution based on precedence rules
  - Transaction safety with error handling
- [ ] Create `calculate_enrollment_metrics` function:
  - Aggregation of enrollment statistics
  - Caching of common calculations
  - Parameterized for flexible dashboard queries
- [ ] Create `update_revenue_metrics` function:
  - Calculation of revenue KPIs
  - Historical comparison calculations
  - Trend analysis for dashboard charts

### 6. Create Database Triggers
- [ ] Implement `after_transaction_insert` trigger:
  - Automatic enrollment creation based on transaction type
  - Status updates based on payment status changes
  - Notification entries for admin alerts
- [ ] Implement `after_profile_update` trigger:
  - Audit logging for profile changes
  - Cache invalidation for dashboard metrics
  - Analytics event recording

### 7. Create Database Migrations
- [ ] Develop schema migration scripts:
  - Create tables with proper types and constraints
  - Add indexes and foreign keys
  - Create views and functions
- [ ] Create test data validation scripts:
  - Verify data consistency after migration
  - Check referential integrity
  - Validate business rules

## Technical Considerations

### Schema Design Principles
1. **Normalization Level**:
   - Use 3NF (Third Normal Form) for most tables
   - Consider denormalization only where performance requires it
   - Document any denormalization decisions

2. **Type Safety**:
   - Use specific PostgreSQL types (not just TEXT for everything)
   - Implement proper precision for numeric fields
   - Use TIMESTAMPTZ for all timestamp fields to handle timezones

3. **Naming Conventions**:
   - Use snake_case for all database objects
   - Prefix views with 'v_' for clarity
   - Use plural for table names, singular for column names
   - Be consistent with abbreviations

### Performance Considerations
1. **Indexing Strategy**:
   - Index fields used in WHERE clauses and joins
   - Consider partial indexes for filtered queries
   - Use composite indexes for multi-column filters
   - Document expected query patterns for each index

2. **View Performance**:
   - Consider materialized views for expensive calculations
   - Implement refresh strategies for materialized views
   - Document refresh frequency requirements

### Security and Access Control
1. **Row-Level Security**:
   - Implement RLS policies for sensitive tables
   - Document policy intentions and test cases
   - Consider admin override capabilities

2. **Role-Based Access**:
   - Define appropriate database roles
   - Document permission grants
   - Consider service roles for application access

## Completion Status

This phase is currently in progress. Tasks completed:
- Initial schema design for unified_profiles table
- Preliminary indexing strategy

Challenges identified:
- Handling historical data during migration
- Optimizing view performance for dashboard queries
- Balancing normalization with query performance

## Next Steps After Completion
After implementing the database schema enhancements, we will move to Phase 3-2: Data Migration Implementation, which will populate the new schema with data from the existing Xendit and Systemeio tables.

---

> **Note to AI Developers**: When working with this project, always ensure that you:
> 1. Review previously completed build notes for context and established patterns
> 2. Consult the implementation strategy and architecture planning documents
> 3. Align your work with the project context and design context guidelines
> 4. Follow the established folder structure, naming conventions, and coding standards
> 5. Include this reminder in all future build notes to maintain consistency
