# Graceful Homeschooling Database Schema Documentation

This document provides an overview of the database schema implemented for the Graceful Homeschooling platform using Supabase.

## Database Structure

The database schema is organized into several logical groups:

### User Management
- **profiles**: Extended user information beyond auth.users
- **membership_tiers**: Subscription levels with pricing and features
- **user_memberships**: Many-to-many relationship between users and membership tiers

### Course Content
- **courses**: Main course information (title, description, etc.)
- **modules**: Course sections organized in sequence
- **lessons**: Individual content units within modules
- **tags**: Categories for organizing courses
- **course_tags**: Many-to-many relationship between courses and tags
- **user_progress**: Tracks user progress through lessons
- **user_enrollments**: Tracks user enrollment in courses

### Payment System
- **transactions**: Payment records
- **invoices**: Billing records linked to transactions
- **subscription_payments**: Recurring billing records
- **payment_methods**: Stored payment information
- **discount_codes**: Promotional codes

### Email Marketing
- **email_templates**: Reusable email designs
- **email_campaigns**: Marketing initiatives
- **campaign_recipients**: Email campaign targeting
- **email_automations**: Triggered email sequences
- **user_email_preferences**: User subscription preferences

### Access Control
- **roles**: User role definitions with permissions
- **permissions**: Granular capabilities
- **role_permissions**: Many-to-many relationship between roles and permissions
- **user_roles**: Many-to-many relationship between users and roles
- **access_grants**: Temporary privileges for specific resources

## Row-Level Security (RLS)

Each table has appropriate row-level security policies to ensure data protection:

- Users can only view and edit their own data
- Admins have broader access to manage platform content
- Marketing roles can manage email campaigns
- Instructors can manage course content
- Published content is visible to all users

## Type Definitions

TypeScript type definitions for the database schema are available in `types/supabase.ts`.

## Client Utilities

Database connection utilities are available in `lib/supabase/client.ts`:

- `createServerSupabaseClient()`: For server-side operations using service role key
- `createBrowserSupabaseClient()`: For client-side operations using anon key

## Next Steps

After the database schema implementation, we will proceed to:

1. Implement data access functions for common operations
2. Set up proper error handling
3. Create admin user account and configure initial data
4. Implement authentication system 
5. Test database functionality in the application 