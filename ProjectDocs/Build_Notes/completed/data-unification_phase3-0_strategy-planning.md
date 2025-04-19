# Data Unification - Phase 3-0: Strategy Planning

## Task Objective
Develop a comprehensive strategy for unifying data from existing Xendit and Systemeio tables into a cohesive data model that can power business intelligence features, particularly for the admin dashboard.

## Current State Assessment
The platform currently has two separate data sources with different structures and information:
1. **Xendit table**: Contains payment data with customer emails, purchase details, and transaction dates, but lacks complete user profile information. This is the definitive source of truth for payment status.
2. **Systemeio table**: Contains user profile data (first name, last name, tags) tied to emails, including information about which landing page users signed up through ("squeeze" for Papers to Profits and "Canva" for Canva ebook).
3. The connection between these systems was manual since Systemeio lacks native integration with Xendit.

There is also a manually created user_enrollments table for testing course functionality, but it's not yet integrated with real payment data from Xendit.

## Future State Goal
A clearly defined data unification strategy that outlines:
1. How user records from Xendit and Systemeio will be matched and merged
2. The data model for a unified user profile with complete information
3. A clear approach for transforming payment records into proper enrollment records
4. How to maintain historical data while creating a normalized structure
5. The approach for future integrations (Shopify, Facebook ads)

This strategy will be the foundation for implementing the actual database schema changes and data migrations in subsequent phases.

## Relevant Context

> **Important**: When working on this build note, always ensure proper context integration from:
> 1. Project context (`ProjectContext.md`)
> 2. Architecture planning (Phase 1-1)
>
> This ensures consistency and alignment with project goals and standards.

### From Project Context
The project uses Supabase PostgreSQL for data storage and management, with a focus on:
- TypeScript for type safety
- Functional, declarative programming principles
- Server-side logic emphasis with minimal client-side code

### From Architecture Planning
The database architecture includes:
- Core user table leveraging Supabase Auth with extension for profile data
- Separate profiles table for extensible user information beyond auth
- Many-to-many relationships through junction tables (user_courses)

## Implementation Plan

### 1. Data Analysis and Mapping (Progress Update)

#### Xendit Table Structure (Payment Data)
- **Primary Key:** `External ID` (text)
- **Key Fields:**
  - `Email`, `Customer Email`: User email (nullable, text)
  - `Status`: Payment status (nullable, text)
  - `Description`: Product or transaction description (nullable, text)
  - `Created Timestamp`, `Paid Timestamp`, `Settled Timestamp`, `Expiry Date`: Timestamps (nullable, text)
  - `Amount`: Payment amount (nullable, bigint)
  - `Currency`: Payment currency (nullable, text)
  - Other: `Payment Method`, `Bank Name`, `Promotion(s)`, etc.

#### Systemeio Table Structure (User Profile Data)
- **Primary Key:** `Email` (text), `Date Registered` (timestamp with time zone)
- **Key Fields:**
  - `First name`, `Last name`: User names (nullable, text)
  - `Tag`: User tag (nullable, text)
  - `Date Registered`: Registration timestamp (not null)

#### Enumerated Status and Tag Values

#### Xendit `Status` Values (from data)
- `PAID`
- `SETTLED`
- `EXPIRED`
- `UNPAID`

#### Systemeio `Tag` Values (from data)
- Tags are comma-separated and can include:
  - `squeeze` (Papers to Profits landing page)
  - `Canva` (Canva ebook landing page)
  - `PaidP2P` (Paid for Papers to Profits)
  - `PaidCanva` (Paid for Canva ebook)
  - `FBInviteSent`, `InvitedtoCourse`, `Imported`, `JoinCommunity`, `Enrolled P2P`, `TestTag`, etc.
- Tags may be empty or null.
- Multiple tags can be present in a single field, separated by commas.

### Best-Practice Mapping & Normalization Plan

- **Status Normalization:**
  - Map Xendit `Status` to a unified enum: `PAID`, `SETTLED` → `completed`; `UNPAID` → `pending`; `EXPIRED` → `expired`.
  - Document all mappings for traceability.
- **Tag Normalization:**
  - Split comma-separated tags into arrays for easier querying.
  - Standardize tag names (trim spaces, consistent casing).
  - Map tags to product/enrollment types (e.g., `PaidP2P` = enrolled in Papers to Profits).
- **Timestamp Normalization:**
  - Convert all timestamps to ISO 8601, UTC.
  - Document source field and transformation for each timestamp.
- **Email Normalization:**
  - Always lowercase and trim emails before matching.
  - Document and handle duplicates or nulls.
- **Field Mapping Table (Updated):**

| Unified Field         | Xendit Source(s)         | Systemeio Source(s) | Normalization/Transformation Rule                |
|----------------------|-------------------------|---------------------|--------------------------------------------|
| email                | Email, Customer Email   | Email               | Lowercase, trim, deduplicate               |
| payment_status       | Status                  | Tag                 | Map to unified enum                        |
| product_type         | Description             | Tag                 | Map to product/course type                 |
| amount               | Amount                  | (N/A)               | Integer, currency standardization          |
| currency             | Currency                | (N/A)               | ISO 4217                                   |
| created_at           | Created Timestamp       | Date Registered     | ISO 8601, UTC                             |
| paid_at              | Paid Timestamp          | (N/A)               | ISO 8601, UTC                             |
| settled_at           | Settled Timestamp       | (N/A)               | ISO 8601, UTC                             |
| tags                 | (N/A)                   | Tag                 | Array, standardized, split by comma        |
| ...                  | ...                     | ...                 | ...                                       |

// Comments:
// - This mapping ensures all key business intelligence fields are unified and queryable.
// - All normalization rules are industry best practice for data warehousing and analytics.
// - Document all transformation logic for future migrations and audits.

- [x] Create field mapping document showing relationships between tables (complete)

### 2. Data Model Design (Progress Update)

#### Unified User Profile Structure
- **Table:** `unified_profiles`
- **Fields:**
  - `id` (UUID, PK, references `auth.users.id`)
  - `email` (text, unique, indexed)
  - `first_name` (text)
  - `last_name` (text)
  - `phone` (text)
  - `tags` (text[], array of normalized tags)
  - `acquisition_source` (text)
  - `created_at` (timestamptz, default now())
  - `updated_at` (timestamptz, default now())
- **Notes:**
  - Email is always lowercased and trimmed.
  - Tags are split and normalized from Systemeio.
  - Profile is always linked to Supabase Auth user.

#### Normalized Transaction/Payment Model
- **Table:** `payments`
- **Fields:**
  - `id` (UUID, PK)
  - `external_id` (text, unique, from Xendit)
  - `user_id` (UUID, FK to `unified_profiles.id`)
  - `amount` (integer)
  - `currency` (text, ISO 4217)
  - `status` (enum: 'completed', 'pending', 'expired')
  - `product_type` (text, e.g., 'P2P', 'Canva')
  - `created_at` (timestamp)
  - `paid_at` (timestamp)
  - `settled_at` (timestamp)
- **Notes:**
  - All timestamps are stored in UTC, ISO 8601.
  - Status is normalized from Xendit.
  - Product type is mapped from Description/Tag.

#### Enrollment Data Model
- **Table:** `enrollments`
- **Fields:**
  - `id` (UUID, PK)
  - `user_id` (UUID, FK to `unified_profiles.id`)
  - `course_id` (UUID, FK to `courses.id`)
  - `payment_id` (UUID, FK to `payments.id`)
  - `status` (enum: 'active', 'expired', 'pending')
  - `enrolled_at` (timestamp)
  - `expires_at` (timestamp, nullable)
- **Notes:**
  - Enrollment is created when payment is completed.
  - Supports future access control and expiration.

#### Entity Relationship Diagram (ERD) Notes
- `unified_profiles` (1) ←→ (M) `payments`
- `unified_profiles` (1) ←→ (M) `enrollments` (M) ←→ (1) `courses`
- `payments` (1) ←→ (M) `enrollments`
- All FKs are indexed for performance.
- Use ON DELETE CASCADE for user-related FKs, but consider soft deletes for audit/history.

#### Indexing & Constraints
- Unique index on `unified_profiles.email` and `payments.external_id`.
- Foreign key constraints for all relationships.
- Indexes on `payments.status`, `enrollments.status`, and all timestamp fields for dashboard queries.

// Comments:
// - This model is modular, extensible, and follows best practice for analytics and BI.
// - All relationships and constraints are explicit for data integrity.
// - Indexing strategy is designed for common dashboard/reporting queries.

- [x] Design unified user profile structure
- [x] Design normalized transaction/payment model
- [x] Design enrollment data model
- [x] Create entity relationship diagrams and document key relationships

### 3. Data Transformation Rules (Progress Update)

#### Email Matching and Normalization
- Always lowercase and trim emails before matching.
- Use email as the primary key for user matching between Xendit and Systemeio.
- Detect and resolve duplicates by preferring the most recent or authoritative record.
- Log all duplicate resolutions for audit.

#### Timestamp Standardization
- Convert all timestamps to ISO 8601 format, stored in UTC.
- Document the source of each timestamp (e.g., Xendit `Created Timestamp`, Systemeio `Date Registered`).
- Handle missing or malformed timestamps with clear error logging.

#### Status Mapping and Normalization
- Map Xendit `Status` values:
  - `PAID`, `SETTLED` → `completed`
  - `UNPAID` → `pending`
  - `EXPIRED` → `expired`
- Map Systemeio tags to enrollment/product types (e.g., `PaidP2P` → enrolled in P2P course).
- Store all status values as enums for consistency.

#### Data Validation Rules
- Validate all required fields (email, status, timestamps, amount, etc.).
- Enforce correct data types (e.g., integer for amount, ISO 8601 for timestamps).
- Apply business rule validation (e.g., payment must be `completed` for enrollment).
- Log and handle validation errors with clear messages for manual review.

// Comments:
// - These transformation rules ensure data integrity and consistency across unified tables.
// - All normalization and validation steps are industry best practice for ETL/data warehousing.
// - Logging and error handling are critical for audit and troubleshooting.

- [x] Define email matching and normalization rules
- [x] Establish timestamp standardization approach
- [x] Define status mapping and normalization
- [x] Create data validation rules

### 4. Historical Data Handling (Progress Update)

#### Preserving Original Data
- Retain original Xendit and Systemeio tables as read-only archives.
- Restrict write access to prevent accidental changes.
- Document schema and data snapshot at migration start for audit.

#### Phased Migration Approach
- Migrate data in batches to minimize risk and allow for incremental validation.
- Use migration scripts with logging and progress tracking.
- Validate each batch before proceeding to the next.

#### Data Verification Process
- Cross-check migrated records with source tables for completeness and accuracy.
- Use row counts, checksums, and spot checks for verification.
- Log all discrepancies and resolve before finalizing migration.

#### Rollback Strategy
- Maintain backup snapshots of all affected tables before migration.
- Provide automated rollback scripts to restore previous state if needed.
- Document all rollback procedures and test them before production migration.

#### Data Reconciliation Process
- Identify and log all conflicts (e.g., duplicate emails, mismatched statuses).
- Provide manual review workflows for unresolved conflicts.
- Maintain an audit trail of all changes and conflict resolutions.

// Comments:
// - This approach ensures data integrity, auditability, and minimal risk during migration.
// - All steps follow industry best practice for data warehousing and ETL migrations.
// - Manual review and audit trails are critical for compliance and troubleshooting.

- [x] Define approach for preserving original data
- [x] Plan for historical data migration
- [x] Document data reconciliation process

### 5. Future Integration Planning (Progress Update)

#### Shopify Integration Plan
- Extend data model to include `shopify_orders` and `shopify_customers` tables.
- Use email as the primary matching key for customer unification.
- Plan for periodic synchronization via Shopify API (webhooks preferred, fallback to polling).
- Document all field mappings and transformation rules for Shopify data.

#### Facebook Ads Integration Plan
- Add `ad_campaigns` and `ad_attributions` tables for campaign and conversion tracking.
- Store campaign metadata, ad spend, and conversion events.
- Attribute conversions to users via email or custom tracking parameters.
- Plan for periodic data import via Facebook Ads API.

#### API Integration Requirements
- Use secure authentication (OAuth2, API keys) for all external integrations.
- Prefer webhooks for real-time updates; use polling as a fallback.
- Implement robust error handling and retry logic for all API calls.
- Log all integration events and errors for monitoring and audit.

// Comments:
// - These plans ensure the data model is extensible for future integrations.
// - All integration strategies follow industry best practice for reliability and security.
// - Logging and error handling are critical for long-term maintainability.

- [x] Plan for Shopify integration
- [x] Plan for Facebook ads integration
- [x] Document API integration requirements

## Technical Considerations

### Matching Strategy
1. **Email as Primary Key**: Use email addresses to match records between Xendit and Systemeio, considering:
   - Case-insensitive matching
   - Possible typos or variations
   - Handling of duplicate emails across systems

2. **Data Precedence Rules**:
   - Xendit is authoritative for payment information and status
   - Systemeio is authoritative for user profile data
   - When conflicts occur, document which source takes precedence
   - Log all conflict resolutions for audit purposes

### Data Integrity
1. **Validation Approach**:
   - Define validation rules for each field type
   - Create consistent error handling for validation failures
   - Plan for validation during both migration and ongoing operations

2. **Referential Integrity**:
   - Design foreign key constraints to maintain data consistency
   - Plan for cascading updates/deletes where appropriate
   - Consider soft deletes for historical record preservation

### Performance Considerations
1. **Query Optimization**:
   - Identify common query patterns for the dashboard
   - Plan appropriate indexing strategy
   - Consider materialized views for complex aggregations

2. **Migration Performance**:
   - Batch processing strategy for large data sets
   - Progress tracking and resume capabilities
   - Resource utilization planning

## Completion Summary (Phase 3-0)

- All steps in the implementation plan have been executed and documented.
- Data analysis and mapping between Xendit and Systemeio are complete, with field mapping and normalization rules defined.
- Unified data model for user profiles, payments, and enrollments is designed, with clear ERD notes and indexing strategy.
- Data transformation, validation, and migration rules are established, following industry best practice.
- Historical data handling, rollback, and reconciliation strategies are documented for safe migration.
- Future integration plans for Shopify and Facebook Ads are outlined, ensuring extensibility.
- All technical considerations (matching, validation, referential integrity, performance) are addressed.

### Verification
- The strategy aligns with the original objective: to unify Xendit and Systemeio data into a normalized, extensible model for business intelligence and admin dashboard use.
- All checklist items are marked as complete, and the build note is ready for the next phase (schema implementation).

// Comments:
// - This document provides a clear, traceable foundation for future schema and migration work.
// - All decisions and mappings are documented for audit and onboarding.
// - Review this summary before starting Phase 3-1: Database Schema Enhancement.

- [x] Implementation plan complete
- [x] Summary and verification added

## Next Steps After Completion
After establishing the data unification strategy, we will move to Phase 3-1: Database Schema Enhancement, which will implement the actual database changes based on this strategy.

---

> **Note to AI Developers**: When working with this project, always ensure that you:
> 1. Review previously completed build notes for context and established patterns
> 2. Consult the implementation strategy and architecture planning documents
> 3. Align your work with the project context and design context guidelines
> 4. Follow the established folder structure, naming conventions, and coding standards
> 5. Include this reminder in all future build notes to maintain consistency
