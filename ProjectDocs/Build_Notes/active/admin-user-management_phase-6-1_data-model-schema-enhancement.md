# Admin User Management - Phase 6-1: User Data Model & Schema Enhancement

## Task Objective
Audit, enhance, and optimize the existing database schema to support comprehensive admin user management capabilities, ensuring all necessary user data is accessible, properly related, and efficiently queryable.

## Current State Assessment
The platform currently stores user data across several tables:

- `unified_profiles`: Contains core user profile data from our unified data model
- `enrollments`: Contains course enrollment data for users
- `shopify_orders` and `shopify_order_items`: Purchase data with Shopify as PIM
- `transactions`: Contains financial transaction records
- Future tables `ecommerce_orders` and `ecommerce_order_items`: Will contain purchase data as we migrate from Shopify to our custom storefront

While these tables store the necessary data, they lack some specific fields and relationships needed for efficient admin management. Additionally, there is no dedicated structure for tracking administrative actions on user accounts or for storing admin-specific annotations.

## Future State Goal
An enhanced database schema that:

1. **Maintains complete user information**: Ensures all necessary user data fields are present and properly typed
2. **Supports efficient querying**: Optimized for common admin operations like searching and filtering
3. **Enables administrative tracking**: Includes audit logging for all admin actions
4. **Facilitates data relationships**: Clearly defines relationships between users, enrollments, and purchases
5. **Provides annotation capabilities**: Allows administrators to add notes to user accounts
6. **Supports reconciliation**: Enables linking user records across different data sources

## Implementation Plan

### 1. Audit Existing Tables
- [ ] Analyze `unified_profiles` table
  - Verify presence of all required fields for admin management
  - Check data types and constraints
  - Review indexing for search performance
- [ ] Review relationships between tables
  - Map connections between `unified_profiles`, `enrollments`, and order tables
  - Verify foreign key relationships and constraints
  - Document any missing relationships
- [ ] Analyze query patterns
  - Test performance of common user management queries
  - Identify potential bottlenecks or inefficiencies
  - Document optimization opportunities

### 2. Add Administrative Tables
- [ ] Create `admin_audit_log` table
  - Design schema with fields: id, admin_user_id, action_type, target_table, target_id, changes_json, timestamp
  - Add appropriate constraints and indices
  - Implement trigger functions for automatic logging
- [ ] Create `user_notes` table
  - Design schema with fields: id, user_id, admin_id, note_text, category, visibility, timestamp
  - Add appropriate constraints and indices
  - Consider implementing note categories for better organization
- [ ] Create `user_account_links` table
  - Design schema to track manual linking between accounts
  - Include fields for source_id, target_id, link_type, admin_id, timestamp
  - Add appropriate constraints to prevent invalid links

### 3. Enhance Existing Tables
- [ ] Add administrative fields to `unified_profiles`
  - Add `is_admin` boolean field with default false
  - Add `account_status` enum field (active, suspended, restricted)
  - Add `admin_verified` boolean field with default false
  - Add `last_admin_action` timestamp field
- [ ] Add tracking fields to related tables
  - Add `modified_by_admin_id` and `last_modified` to enrollment records
  - Add appropriate logging fields to transaction records
  - Ensure consistent tracking across all user-related tables

### 4. Implement Database Functions and Triggers
- [ ] Create user search functions
  - Implement full-text search across user profile fields
  - Create specialized fuzzy matching for user reconciliation
  - Optimize search performance with appropriate indices
- [ ] Develop admin action tracking triggers
  - Create triggers to populate audit log on data changes
  - Implement before/after state capturing
  - Ensure secure tracking of all sensitive operations
- [ ] Build user data aggregation functions
  - Create functions to efficiently retrieve user enrollment summaries
  - Implement transaction aggregation for financial overviews
  - Develop engagement metric calculation functions

### 5. Database Migrations and Documentation
- [ ] Create migration scripts
  - Develop and test database migration scripts
  - Ensure backward compatibility with existing data
  - Include rollback procedures for each migration
- [ ] Update database documentation
  - Create ERD (Entity Relationship Diagram) for the enhanced schema
  - Document all new tables, fields, and relationships
  - Update data dictionary with new fields and their purposes
- [ ] Create query examples
  - Document example queries for common administrative operations
  - Include performance considerations and best practices
  - Create templates for report generation queries

## Technical Considerations

### Performance Optimization
- Add appropriate indices for fields commonly used in filtering and searching
- Consider partial indices for frequently filtered boolean fields
- Design queries to minimize table scans for large datasets

### Security and Privacy
- Implement row-level security for access to administrative tables
- Ensure proper access controls for audit logging
- Use appropriate data types to prevent SQL injection

### Data Integrity
- Use constraints and triggers to maintain data consistency
- Implement validation logic for all user data fields
- Ensure referential integrity across all related tables

## Completion Criteria
This phase will be considered complete when:

1. All necessary database enhancements are implemented and tested
2. Migration scripts are verified in development environment
3. Documentation is updated to reflect schema changes
4. Performance testing confirms efficient querying for admin operations
5. Security review ensures proper access controls and data protection

## Next Steps After Completion
Proceed with **Phase 6-2: User List View Implementation**, leveraging the enhanced data model to build the user listing interface with search, filter, and sort capabilities.

---

> **Note to AI Developers**: When working on this project, always ensure that you:
> 1. Review previously completed build notes for context and established patterns
> 2. Consult the implementation strategy and architecture planning documents
> 3. Align your work with the project context and design context guidelines
> 4. Follow the established folder structure, naming conventions, and coding standards
> 5. Include this reminder in all future build notes to maintain consistency
