# Platform Integration - Phase 1-3: Database Schema Implementation

## Task Objective
Implement the core database schema in Supabase to support user authentication, course management, membership capabilities, payment tracking, email marketing, and comprehensive access control for the Graceful Homeschooling platform.

## Current State Assessment
The architecture planning (Phase 1-1) and infrastructure planning (Phase 1-2) are complete. Currently, no actual database tables exist in Supabase, and we need to implement the planned schema to enable further development.

## Future State Goal
A fully implemented database schema in Supabase with proper tables, relationships, and row-level security policies that will support all platform functionality including user management, course delivery, membership features, payment processing, email marketing, and granular access controls.

## Relevant Context

### Design Principles
- **Functional & Declarative**: Structure database for functional data operations following project-wide functional programming approach
- **Modularity**: Create clear table separations with well-defined relationships to support maximum file size of 150 lines
- **TypeScript Integration**: Ensure database schema generates accurate TypeScript types for type safety
- **Naming Conventions**: Follow consistent naming patterns for tables and columns

### Architectural Decisions
- **User Management Architecture**
  - Core user table leverages Supabase Auth with extension for profile data
  - Separate profiles table for extensible user information beyond auth
  - Many-to-many relationships through junction tables (user_courses)
  - Role-based access control through dedicated roles field with hierarchical permissions

- **Content Structure Architecture**
  - Three-tier content hierarchy: Courses → Modules → Lessons
  - Content metadata separation from delivery mechanism
  - Media assets referenced through URLs rather than stored directly
  - Tagging system for cross-referencing and categorization

- **Access Control Architecture**
  - Membership tiers defined in dedicated table with access rights
  - Time-based access through start/end date fields
  - Row-level security policies in Supabase for data protection
  - Special access grants for promotional or limited-time access
  - Granular permission system with role-based capabilities

- **Payment Processing Architecture**
  - Transaction records linked to users and purchases
  - Subscription payment tracking with renewal information
  - Invoice and receipt generation capability
  - Payment status tracking and history

- **Email Marketing Architecture**
  - Template-based email design system
  - Campaign tracking and management
  - Automated sequences based on user actions
  - Segmentation and targeting capabilities

- **Data Relationships Overview**
  - User → Enrollments → Courses (many-to-many)
  - Courses → Modules → Lessons (one-to-many hierarchical)
  - Users → Subscriptions → Membership Tiers
  - Users → Transactions → Products/Courses
  - Users → Progress → Lessons
  - Campaigns → Email Templates → Sends → Users

### Technical Requirements
- Use Supabase (PostgreSQL) for database implementation
- Implement row-level security (RLS) policies for data protection
- Follow the schema specifications from infrastructure planning
- Create proper indexes for performance optimization
- Ensure schema supports Next.js 15+ with App Router and React Server Components
- Design schema to work efficiently with server-side data fetching

## Implementation Plan

### 1. Core User Management Tables
- [ ] Create auth.users table (managed by Supabase Auth)
  - Include fields: id, email, created_at, updated_at
- [ ] Implement public.profiles table for extended user information
  - Include fields: id, first_name, last_name, phone, avatar_url, role, preferences
  - Set role default to 'user'
  - Ensure alignment with Graceful Homeschooling brand identity
- [ ] Create membership_tiers table for subscription levels
  - Include fields: name, description, price_monthly, price_yearly, features (JSONB)
  - Structure features as JSON to support flexible membership benefits
- [ ] Add user_memberships table to track active subscriptions
  - Include fields: user_id, tier_id, status, started_at, expires_at, payment_reference
  - Enable tracking of subscription lifecycle
- [ ] Configure row-level security policies for user tables
  - Users can view/edit only their own profiles
  - Admins can view all profiles but edit only specific fields

### 2. Course Content Tables
- [ ] Create courses table for main course information
  - Include fields: title, slug, description, thumbnail_url, trailer_url, status, is_featured, required_tier_id, metadata
  - Support rich course descriptions and media
- [ ] Add modules table for organizing course sections
  - Include fields: course_id, title, description, position
  - Ensure position field for maintaining order
- [ ] Implement lessons table for individual content units
  - Include fields: module_id, title, description, video_url, duration, position, is_preview, content, attachments, metadata
  - Support markdown content format for lesson text
  - Store attachments as JSONB array of objects
- [ ] Create user_progress table to track completion
  - Include fields: user_id, lesson_id, status, progress_percentage, last_position, completed_at
  - Add unique constraint on user_id and lesson_id
  - Support video position tracking for resume functionality
- [ ] Add user_enrollments table for many-to-many course access
  - Include fields: user_id, course_id, enrolled_at, expires_at, status, payment_id
  - Add unique constraint on user_id and course_id
  - Support tracking of enrollment lifecycle
- [ ] Implement tags and course_tags tables for categorization
  - Tags: name, description
  - Course_tags: course_id, tag_id with unique constraint
  - Support flexible content categorization
- [ ] Configure row-level security policies for content tables
  - Published courses viewable by everyone
  - Course management limited to admins
  - Users can only view/update their own progress

### 3. Payment and Transaction Tables
- [ ] Create transactions table for payment records
  - Include fields: user_id, amount, currency, status, payment_method, provider_reference, metadata
  - Support comprehensive transaction tracking
- [ ] Implement invoices table for billing records
  - Include fields: user_id, transaction_id, invoice_number, due_date, paid_date, amount, items (JSONB)
  - Store line items as structured JSON
- [ ] Add subscription_payments table for recurring billing
  - Include fields: user_id, membership_id, transaction_id, billing_period_start, billing_period_end, status
  - Support tracking of payment periods
- [ ] Create payment_methods table for stored payment information
  - Include fields: user_id, type, provider_token, last_four, expiry_date, is_default
  - Implement proper security for payment data
- [ ] Implement discount_codes table for promotions
  - Include fields: code, discount_type, amount, start_date, end_date, usage_limit, usage_count
  - Support percentage and fixed amount discounts
- [ ] Configure row-level security policies for payment tables
  - Users can only view their own payment information
  - Financial administrators have special access rights

### 4. Email Marketing Tables
- [ ] Create email_templates table for reusable designs
  - Include fields: name, description, subject, html_content, text_content, variables (JSONB)
  - Support both HTML and plain text versions
- [ ] Implement email_campaigns table for marketing initiatives
  - Include fields: name, description, status, scheduled_at, completed_at, template_id, sender_email, sender_name
  - Support scheduling and tracking
- [ ] Add campaign_recipients table for targeting
  - Include fields: campaign_id, user_id, sent_at, opened_at, clicked_at, unsubscribed_at
  - Track full recipient interaction history
- [ ] Create email_automations table for triggered sequences
  - Include fields: name, trigger_type, trigger_condition (JSONB), status, template_id
  - Support event-based email triggers
- [ ] Implement user_email_preferences table for subscription management
  - Include fields: user_id, marketing_emails, transactional_emails, newsletter, course_updates
  - Support granular subscription preferences
- [ ] Configure row-level security policies for email marketing tables
  - Users can only view/edit their own email preferences
  - Only authorized marketing roles can manage campaigns and templates

### 5. Permissions and Access Control Tables
- [ ] Create roles table for user role definitions
  - Include fields: name, description, permissions (JSONB), priority
  - Support role hierarchy with priority field
- [ ] Implement permissions table for granular capabilities
  - Include fields: name, description, resource_type, action_type
  - Support resource-based permission model
- [ ] Add role_permissions junction table
  - Include fields: role_id, permission_id
  - Support many-to-many role-permission relationship
- [ ] Create user_roles junction table (if more than one role per user)
  - Include fields: user_id, role_id
  - Support multiple roles per user if needed
- [ ] Implement access_grants table for temporary privileges
  - Include fields: user_id, resource_type, resource_id, granted_by, expires_at, capabilities (JSONB)
  - Support time-limited special access
- [ ] Configure comprehensive row-level security based on permissions system
  - Define policies that check permission capabilities
  - Implement role hierarchy in access decisions

### 6. Security Policies
- [ ] Implement RLS policies for profiles table
  - Users can only view and edit their own profiles
  - Admins can view all profiles
- [ ] Add RLS policies for courses table
  - Everyone can view published courses
  - Only admins can manage courses
- [ ] Configure RLS policies for user_progress table
  - Users can only view and update their own progress
  - Admins can view all user progress for reporting
- [ ] Create RLS policies for user_enrollments
  - Users can only view their own enrollments
  - Admins can manage all enrollments
- [ ] Implement RLS policies for payment tables
  - Users can only view their own payment records
  - Financial administrators have special access rights
- [ ] Add RLS policies for email marketing tables
  - Marketing roles can manage campaigns and templates
  - Users can only manage their own preferences
- [ ] Set up RLS for other tables as needed
  - Comments, notes, and other user-specific data
- [ ] Test security policies with different user roles
  - Create test users with different roles
  - Verify proper access control

### 7. Additional Tables (Optional/Future)
- [ ] Create comments table for lesson discussions
  - Include fields: user_id, lesson_id, parent_id (for replies), content, is_pinned
  - Support threaded discussions
- [ ] Add user_notes table for personal note-taking
  - Include fields: user_id, lesson_id, content, timestamp (video position)
  - Support time-stamped video notes
- [ ] Implement notifications table for user alerts
  - Include fields: user_id, type, message, read_at, action_url
  - Support system notifications
- [ ] Consider activity_log table for user engagement tracking
  - Include fields: user_id, action_type, entity_type, entity_id, metadata
  - Support comprehensive user activity tracking

### 8. Type Generation
- [ ] Set up Supabase type generation
  - Install required packages: `npm install supabase @supabase/supabase-js`
  - Configure type generation script in package.json
- [ ] Generate TypeScript types from schema
  - Run type generation: `npx supabase gen types typescript --project-id <project-id> --schema public > types/supabase.ts`
  - Ensure types are available for development
- [ ] Create interfaces for database models
  - Define interfaces for each entity in the system
  - Create type utilities for common operations

## Implementation Approach
1. Create a Supabase migration script for each logical group of tables
   - User management tables
   - Course content tables
   - Payment and transaction tables
   - Email marketing tables
   - Permissions and access control tables
   - Additional functionality tables
2. Implement tables in order of dependencies
   - Start with tables that have no foreign key dependencies
   - Add tables with dependencies after their referenced tables exist
3. Add sample data for testing after each group of tables is created
4. Implement and test RLS policies immediately after creating each table
5. Generate TypeScript types after schema is complete and verified
6. Document the schema with relationship diagrams for future reference

## Design Considerations
- Ensure all tables follow the Graceful Homeschooling design principles of clarity and elegance
- Design database to support the mobile-first approach outlined in the design context
- Structure data to facilitate the creation of accessible and responsive interfaces
- Consider future extensibility when designing schema

## Next Steps After Completion
Once the database schema is implemented, we will proceed to Phase 1-4: Authentication System Implementation, which will build upon this database foundation. 