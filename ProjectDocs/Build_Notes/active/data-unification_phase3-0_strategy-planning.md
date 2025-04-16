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

### 1. Data Analysis and Mapping
- [ ] Analyze Xendit table structure and identify key fields for business intelligence
  - Document payment status values and their meanings
  - Identify transaction type identifiers ("Papers to Profits Learning Fee" vs "Canva Ebook")
  - Map timestamp fields and their relationships (created, paid, settled)
- [ ] Analyze Systemeio table structure and identify key user profile fields
  - Document tag values and their meanings ("squeeze", "Canva", "PaidP2P", "PaidCanva")
  - Map relationship between tags and product purchases
- [ ] Create field mapping document showing relationships between tables
  - Define email as the primary matching key between systems
  - Document transformation rules for data normalization

### 2. Data Model Design
- [ ] Design unified user profile structure
  - Define required fields from both Xendit and Systemeio
  - Establish relationship to auth.users in Supabase
  - Plan for extensibility with future integrations
- [ ] Design normalized transaction/payment model
  - Define transaction types and statuses
  - Plan for consistent timestamp handling
  - Document amount/currency standardization
- [ ] Design enrollment data model
  - Define enrollment lifecycle states
  - Establish course-user-payment relationships
  - Plan for access control and expiration handling
- [ ] Create entity relationship diagrams
  - Document primary and foreign key relationships
  - Define constraints and validation rules
  - Document indexing strategy for query performance

### 3. Data Transformation Rules
- [ ] Define email matching and normalization rules
  - Case sensitivity handling
  - Duplicate detection and resolution approach
- [ ] Establish timestamp standardization approach
  - Timezone handling strategy
  - Date format consistency rules
- [ ] Define status mapping and normalization
  - Map Xendit status values to standardized states
  - Document business rules for status interpretation
- [ ] Create data validation rules
  - Required field validation
  - Data type and format validation
  - Business rule validation

### 4. Historical Data Handling
- [ ] Define approach for preserving original data
  - Strategy for maintaining original tables
  - Approach for incremental synchronization
- [ ] Plan for historical data migration
  - Phased migration approach
  - Data verification process
  - Rollback strategy
- [ ] Document data reconciliation process
  - Strategy for handling conflicts
  - Approach for manual review cases
  - Audit trail requirements

### 5. Future Integration Planning
- [ ] Plan for Shopify integration
  - Data model extensions for products and orders
  - Approach for customer matching
  - Synchronization strategy
- [ ] Plan for Facebook ads integration
  - Data model for ad campaign tracking
  - Attribution model for conversions
  - Performance metrics storage
- [ ] Document API integration requirements
  - Authentication and security considerations
  - Polling vs webhook strategies
  - Error handling and retry logic

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

## Completion Status

This phase is currently in progress. The following has been accomplished:
- Initial analysis of Xendit and Systemeio table structures
- Identification of email as primary matching key
- Overview of data model requirements

Challenges identified:
- Data inconsistency between Xendit and Systemeio records
- Diverse status values in Xendit requiring normalization
- Complex timestamp handling across different formats

## Next Steps After Completion
After establishing the data unification strategy, we will move to Phase 3-1: Database Schema Enhancement, which will implement the actual database changes based on this strategy.

---

> **Note to AI Developers**: When working with this project, always ensure that you:
> 1. Review previously completed build notes for context and established patterns
> 2. Consult the implementation strategy and architecture planning documents
> 3. Align your work with the project context and design context guidelines
> 4. Follow the established folder structure, naming conventions, and coding standards
> 5. Include this reminder in all future build notes to maintain consistency
