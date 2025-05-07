# Account Reconciliation Implementation Documentation

## Overview

The Account Reconciliation feature allows administrators to search, compare, link, and merge user accounts across different systems (Unified Profiles, Shopify, SystemeIO, and Xendit). This document provides a detailed explanation of the implementation, database schema, and functionality.

## Table of Contents

1. [Database Schema](#database-schema)
2. [Server-Side Implementation](#server-side-implementation)
3. [Client-Side Implementation](#client-side-implementation)
4. [Account Linking Process](#account-linking-process)
5. [Alternative Email Management](#alternative-email-management)
6. [Integration Points](#integration-points)
7. [Future Enhancements](#future-enhancements)

## Database Schema

### Key Tables

1. **unified_profiles**
   - Primary user accounts table
   - Contains `admin_metadata` JSONB field for storing:
     - `linkedAccounts`: Array of linked accounts from other systems
     - `alternativeEmails`: Array of alternative emails associated with this profile

2. **shopify_customers**
   - Contains Shopify customer data
   - Has `unified_profile_id` field to link to unified_profiles
   - Fields: `id`, `shopify_customer_id`, `email`, `first_name`, `last_name`, etc.

3. **systemeio_backup**
   - Contains SystemeIO user data
   - Fields: `Email`, `First name`, `Last name`, `Tag`, `Date Registered`

4. **xendit_backup**
   - Contains Xendit payment data
   - Fields: `Status`, `Description`, `External ID`, etc.

### Key Relationships

- `shopify_customers.unified_profile_id` → `unified_profiles.id`
- `unified_profiles.admin_metadata.linkedAccounts` → References to accounts in other systems
- `unified_profiles.admin_metadata.alternativeEmails` → List of alternative emails

## Server-Side Implementation

### Server Actions (`app/actions/admin-reconciliation.ts`)

1. **searchUserAccounts**
   ```typescript
   export async function searchUserAccounts({
     query,
     type = 'email',
     system = 'all',
     includeInactive = false,
     fuzzyMatch = false
   })
   ```
   - Searches for user accounts across all systems based on query
   - Parameters:
     - `query`: Search term (email, name, phone, etc.)
     - `type`: Search field type ('email', 'name', 'phone')
     - `system`: System to search ('all', 'unified', 'shopify', 'systemeio', 'xendit')
     - `includeInactive`: Whether to include inactive accounts
     - `fuzzyMatch`: Whether to use fuzzy matching
   - Returns array of `UserSearchResult` objects

2. **getAccountDetails**
   ```typescript
   export async function getAccountDetails(accountId: string)
   ```
   - Gets detailed information about a specific account
   - Parameter: `accountId` (format: "system-identifier" or UUID for unified profiles)
   - Returns `AccountDetail` object with basic info, activity info, and raw data

3. **linkAccounts**
   ```typescript
   export async function linkAccounts({
     primaryAccountId,
     secondaryAccountIds,
     linkType = 'same-person',
     notes,
     syncEmails = true
   })
   ```
   - Links accounts across different systems
   - Parameters:
     - `primaryAccountId`: UUID of the unified profile
     - `secondaryAccountIds`: Array of "system-identifier" strings
     - `linkType`: Relationship type ('same-person', 'related', 'duplicate')
     - `notes`: Optional admin notes
     - `syncEmails`: Whether to automatically add emails as alternatives
   - Updates:
     - Adds link info to `admin_metadata.linkedAccounts` in unified_profiles
     - Updates `unified_profile_id` in shopify_customers
     - Adds alternative emails if different from primary

4. **addAlternativeEmail**
   ```typescript
   export async function addAlternativeEmail({
     profileId,
     email,
     source = 'manual',
     notes
   })
   ```
   - Adds an alternative email to a unified profile
   - Parameters:
     - `profileId`: UUID of the unified profile
     - `email`: Email address to add
     - `source`: Source system ('shopify', 'systemeio', 'xendit', 'manual')
     - `notes`: Optional admin notes
   - Updates `admin_metadata.alternativeEmails` in unified_profiles

### Helper Functions

1. **ensureAdminMetadataColumn**
   ```typescript
   async function ensureAdminMetadataColumn(adminClient: any)
   ```
   - Ensures the `admin_metadata` JSONB column exists in unified_profiles
   - Creates it if it doesn't exist using database functions

## Client-Side Implementation

### Components

1. **AccountReconciliation** (`components/admin/account-reconciliation.tsx`)
   - Main component for the reconciliation interface
   - State management:
     - `searchQuery`, `searchType`, `searchSystem`, etc.: Search form state
     - `searchResults`: Array of search results
     - `selectedAccounts`: Array of selected account IDs
     - `selectedAccountDetails`: Object mapping account IDs to their details
   - Key functions:
     - `handleSearch`: Performs search using server action
     - `toggleAccountSelection`: Selects/deselects accounts and stores their details
     - `handleCompare`, `handleLink`, `handleMerge`: Actions for selected accounts

2. **AccountLinkingDialog** (`components/admin/account-linking-dialog.tsx`)
   - Dialog for linking accounts
   - Form for selecting:
     - Primary account (dropdown)
     - Relationship type (radio buttons)
     - Notes (textarea)
   - Calls `linkAccounts` server action on submission

3. **AccountComparisonView** (referenced but not shown)
   - Displays side-by-side comparison of selected accounts

4. **AccountMergePreview** (referenced but not shown)
   - Previews merging of selected accounts

## Account Linking Process

1. **Selection Phase**
   - Admin searches for accounts across systems
   - Admin selects accounts to link (checkbox selection)
   - Admin clicks "Link Accounts" button

2. **Linking Dialog**
   - Dialog shows all selected accounts
   - Admin selects primary account from dropdown
   - Admin selects relationship type:
     - "Same Person (Duplicate)"
     - "Family Member"
     - "Business Relation"
     - "Other"
   - Admin adds optional notes

3. **Server-Side Processing**
   - `linkAccounts` server action is called
   - For each secondary account:
     1. Ensures `admin_metadata` column exists
     2. Adds link information to `linkedAccounts` array
     3. If Shopify account:
        - Updates `unified_profile_id` in shopify_customers
        - Adds alternative email if different from primary

4. **Database Updates**
   - In unified_profiles:
     ```json
     {
       "admin_metadata": {
         "linkedAccounts": [
           {
             "system": "shopify",
             "identifier": "123456789",
             "linkType": "same-person",
             "notes": "Customer used different email for Shopify purchases",
             "linkedAt": "2025-05-07T09:31:07+08:00"
           }
         ],
         "alternativeEmails": [
           {
             "email": "alternative@example.com",
             "source": "shopify",
             "notes": "Added during account linking with Shopify customer 123456789",
             "addedAt": "2025-05-07T09:31:07+08:00"
           }
         ]
       }
     }
     ```
   - In shopify_customers:
     ```sql
     UPDATE shopify_customers
     SET unified_profile_id = 'uuid-of-primary-account'
     WHERE shopify_customer_id = '123456789';
     ```

## Alternative Email Management

1. **Storage**
   - Alternative emails are stored in `admin_metadata.alternativeEmails` array
   - Each entry contains:
     - `email`: The alternative email address
     - `source`: Where it came from ('shopify', 'systemeio', 'xendit', 'manual')
     - `notes`: Optional admin notes
     - `addedAt`: Timestamp

2. **Addition Methods**
   - Automatically during account linking (if emails differ)
   - Manually via `addAlternativeEmail` server action
   - Each email is validated and checked for duplicates

3. **Usage**
   - Alternative emails can be used for:
     - Account lookup
     - Authentication (future enhancement)
     - Purchase history reconciliation

## Integration Points

1. **Admin User Interface**
   - "Account Reconciliation" button in `/admin/users` page
   - Navigates to dedicated reconciliation page at `/admin/users/reconciliation`

2. **Database Functions**
   - `check_column_exists`: Checks if admin_metadata column exists
   - `add_jsonb_column`: Adds admin_metadata column if it doesn't exist

3. **Supabase Integration**
   - Uses admin client for database operations
   - Validates admin access before performing operations

## Future Enhancements

1. **Purchase History Reconciliation**
   - Display unified purchase history across all linked accounts
   - Implement in user detail view

2. **Merge Functionality**
   - Full implementation of account merging (currently only linking is implemented)
   - Data migration between accounts

3. **Rollback Capability**
   - Ability to undo recent account links or merges
   - Audit trail for all reconciliation actions

4. **Enhanced Search**
   - Fuzzy matching improvements
   - Additional search criteria (purchase history, course enrollments)

5. **Bulk Operations**
   - Batch linking of accounts
   - Import/export of reconciliation data

## Technical Notes

1. **TypeScript Types**
   - `UserSearchResult`: Search result from any system
   - `AccountDetail`: Detailed account information
   - `LinkedAccount`: Information about a linked account

2. **Error Handling**
   - Comprehensive error handling in server actions
   - User-friendly error messages in UI
   - Validation of all inputs

3. **Performance Considerations**
   - Limit on search results (10 per system)
   - Asynchronous loading of account details
   - Optimistic UI updates

4. **Security**
   - Admin-only access to all reconciliation features
   - Validation of admin status before each operation
   - Audit logging of all reconciliation actions
