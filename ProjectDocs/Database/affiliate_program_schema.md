# Affiliate Program Database Schema Documentation

## Overview
This document provides a comprehensive overview of the database schema designed for the affiliate program. It includes details on table structures, column definitions, data types, relationships (foreign keys), custom enum types, and the PL/pgSQL trigger functions that automate various aspects of the system.

## Project ID
Supabase Project ID: `cidenjydokpzpsnpywcf`

## Custom Enum Types

### 1. `public.affiliate_status_type`
This enum defines the possible statuses for an affiliate.
- **Values:**
  - `pending`: Affiliate application is awaiting review.
  - `active`: Affiliate is approved and can earn commissions.
  - `flagged`: Affiliate account is under review due to suspicious activity or other reasons.
  - `inactive`: Affiliate account is no longer active (e.g., by choice, or after a period of inactivity).

### 2. `public.conversion_status_type`
This enum defines the possible statuses for an affiliate conversion.
- **Values:**
  - `pending`: Conversion has been recorded but not yet verified or processed for payment.
  - `cleared`: Conversion has been verified and is eligible for payout.
  - `paid`: Commission for this conversion has been paid to the affiliate.
  - `flagged`: Conversion is under review due to potential issues (e.g., fraud, return).

## Table Schemas

### 1. `public.unified_profiles`
Stores unified user profile information. Relevant to the affiliate program as it links to affiliate-specific data.
- **Key Columns for Affiliate Program:**
  - `id` (uuid, PK): Primary key, usually matches `auth.users.id`.
  - `email` (text): User's email.
  - `affiliate_id` (uuid, FK -> `public.affiliates.id`, UNIQUE, NULLABLE): Link to the user's affiliate profile, if they are an affiliate.
  - `affiliate_general_status` (public.affiliate_status_type, NULLABLE): A cached/denormalized status of the affiliate, synced from `public.affiliates.status`.
  - `membership_level_id` (uuid, FK -> `public.membership_levels.id`, ON DELETE SET NULL, NULLABLE): Link to the user's membership level.

### 2. `public.membership_levels`
Defines different membership tiers and their associated commission rates.
- **Columns:**
  - `id` (uuid, PK, default: `gen_random_uuid()`): Primary key.
  - `name` (text, UNIQUE, NOT NULL): Name of the membership level (e.g., "Bronze Tier", "Gold Tier").
  - `commission_rate` (numeric(5,2), NOT NULL, CHECK `(commission_rate >= 0 AND commission_rate <= 1)`): The commission rate for this level (e.g., 0.05 for 5%). *Note: This is currently not directly used by the `calculate_and_set_conversion_commission` trigger for Level 1/2 conversions but is available for other logic.*
  - `created_at` (timestamptz, NOT NULL, default: `now()`): Timestamp of creation.
  - `updated_at` (timestamptz, NOT NULL, default: `now()`): Timestamp of last update.
- **Triggers:**
  - `set_membership_levels_updated_at` (BEFORE UPDATE): Executes `public.trigger_set_timestamp()` to update `updated_at`.

### 3. `public.affiliates`
Stores information about individuals or entities who are part of the affiliate program.
- **Columns:**
  - `id` (uuid, PK, default: `gen_random_uuid()`): Primary key.
  - `user_id` (uuid, NOT NULL, FK -> `public.unified_profiles.id` ON DELETE CASCADE): Links to the unified profile of the user.
  - `slug` (text, UNIQUE, NOT NULL): A unique, URL-friendly identifier for the affiliate (e.g., for referral links).
  - `commission_rate` (numeric(5,2), NOT NULL): Default commission rate for the affiliate. *Note: This is currently not directly used by the `calculate_and_set_conversion_commission` trigger for Level 1/2 conversions but is available for other logic or direct payout calculations.*
  - `is_member` (boolean, NOT NULL, default: `false`): Indicates if the affiliate is a "member" for commission calculation purposes (used by `calculate_and_set_conversion_commission`).
  - `status` (public.affiliate_status_type, NOT NULL, default: `pending`): Current status of the affiliate.
  - `created_at` (timestamptz, NOT NULL, default: `now()`): Timestamp of creation.
  - `updated_at` (timestamptz, NOT NULL, default: `now()`): Timestamp of last update.
- **Triggers:**
  - `set_affiliates_updated_at` (BEFORE UPDATE): Executes `public.trigger_set_timestamp()` to update `updated_at`.
  - `trigger_sync_unified_profile_after_affiliate_change` (AFTER INSERT, UPDATE, DELETE): Executes `public.sync_unified_profile_from_affiliate_changes()` to keep `unified_profiles.affiliate_id` and `unified_profiles.affiliate_general_status` in sync.

### 4. `public.affiliate_clicks`
Tracks clicks on affiliate referral links.
- **Columns:**
  - `id` (uuid, PK, default: `gen_random_uuid()`): Primary key.
  - `affiliate_id` (uuid, NOT NULL, FK -> `public.affiliates.id` ON DELETE CASCADE): The affiliate whose link was clicked.
  - `visitor_id` (uuid, NULLABLE): A unique identifier for the visitor (e.g., from a cookie).
  - `ip_address` (inet, NULLABLE): IP address of the visitor.
  - `user_agent` (text, NULLABLE): User agent string of the visitor's browser.
  - `referral_url` (text, NULLABLE): The URL the visitor was referred from.
  - `landing_page_url` (text, NULLABLE): The page on the site the visitor landed on.
  - `created_at` (timestamptz, NOT NULL, default: `now()`): Timestamp of click.
  - `updated_at` (timestamptz, NOT NULL, default: `now()`): Timestamp of last update (e.g., if details are enriched later).
- **Triggers:**
  - `set_affiliate_clicks_updated_at` (BEFORE UPDATE): Executes `public.trigger_set_timestamp()` to update `updated_at`.

### 5. `public.affiliate_conversions`
Tracks successful conversions (e.g., purchases, sign-ups) attributed to affiliates.
- **Columns:**
  - `id` (uuid, PK, default: `gen_random_uuid()`): Primary key.
  - `affiliate_id` (uuid, NOT NULL, FK -> `public.affiliates.id` ON DELETE CASCADE): The affiliate credited for this conversion.
  - `click_id` (uuid, NULLABLE, FK -> `public.affiliate_clicks.id` ON DELETE SET NULL): The specific click that led to this conversion, if available.
  - `order_id` (uuid, UNIQUE, NOT NULL): Unique identifier for the order or conversion event from the primary system.
  - `customer_id` (uuid, NULLABLE): Identifier for the customer who made the conversion.
  - `gmv` (numeric(10,2), NOT NULL, default: 0.00): Gross Merchandise Value of the conversion, used as the base for commission calculation.
  - `commission_amount` (numeric(10,2), NOT NULL, default: 0.00): Calculated commission for the affiliate for this conversion.
  - `level` (integer, NULLABLE): A field to categorize the type/level of conversion, used by the commission calculation trigger.
  - `status` (public.conversion_status_type, NOT NULL, default: `pending`): Current status of the conversion.
  - `created_at` (timestamptz, NOT NULL, default: `now()`): Timestamp of conversion.
  - `updated_at` (timestamptz, NOT NULL, default: `now()`): Timestamp of last update.
- **Triggers:**
  - `set_affiliate_conversions_updated_at` (BEFORE UPDATE): Executes `public.trigger_set_timestamp()` to update `updated_at`.
  - `trigger_calculate_commission` (BEFORE INSERT): Executes `public.calculate_and_set_conversion_commission()` to automatically calculate `commission_amount`.

### 6. `public.fraud_flags`
Records instances of suspected fraudulent activity related to affiliates.
- **Columns:**
  - `id` (uuid, PK, default: `gen_random_uuid()`): Primary key.
  - `affiliate_id` (uuid, NOT NULL, FK -> `public.affiliates.id` ON DELETE CASCADE): The affiliate associated with the fraud flag.
  - `reason` (text, NOT NULL): A description of why the fraud flag was raised.
  - `details` (jsonb, NULLABLE): Additional details or evidence related to the fraud, stored in JSONB format.
  - `resolved` (boolean, NOT NULL, default: `false`): Indicates if the fraud flag has been investigated and resolved.
  - `resolved_at` (timestamptz, NULLABLE): Timestamp when the fraud flag was resolved.
  - `resolver_notes` (text, NULLABLE): Notes from the admin/resolver about the resolution.
  - `created_at` (timestamptz, NOT NULL, default: `now()`): Timestamp of fraud flag creation.
  - `updated_at` (timestamptz, NOT NULL, default: `clock_timestamp()`): Timestamp of last update.
- **Triggers:**
  - `set_fraud_flags_updated_at` (BEFORE UPDATE): Executes `public.trigger_set_fraud_flags_timestamp()` to update `updated_at`.
  - `update_affiliate_status_on_fraud_flag` (AFTER INSERT): Executes `public.handle_fraud_flag_affiliate_suspension()` to change the related affiliate's status to `flagged`.

## Trigger Functions

### 1. `public.trigger_set_timestamp()`
A generic trigger function to update the `updated_at` column of a table to the current transaction timestamp (`clock_timestamp()`) before an update operation.
```sql
CREATE OR REPLACE FUNCTION public.trigger_set_timestamp()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = clock_timestamp();
  RETURN NEW;
END;
$function$
```
- **Used by tables:** `affiliates`, `affiliate_clicks`, `affiliate_conversions`, `membership_levels`. (Note: `fraud_flags` uses a similar but distinctly named `trigger_set_fraud_flags_timestamp()`).

### 2. `public.trigger_set_fraud_flags_timestamp()`
Similar to `trigger_set_timestamp()`, but specifically for the `fraud_flags` table. Ensures `SECURITY DEFINER` context if needed, though functionally identical for `updated_at` logic.
```sql
CREATE OR REPLACE FUNCTION public.trigger_set_fraud_flags_timestamp()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  NEW.updated_at = clock_timestamp();
  RETURN NEW;
END;
$function$
```
- **Used by table:** `fraud_flags`.

### 3. `public.sync_unified_profile_from_affiliate_changes()`
Synchronizes `affiliate_id` and `status` from the `public.affiliates` table to the `public.unified_profiles` table when an affiliate record is inserted, updated, or deleted.
```sql
CREATE OR REPLACE FUNCTION public.sync_unified_profile_from_affiliate_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE public.unified_profiles
    SET affiliate_id = NEW.id,
        affiliate_general_status = NEW.status
    WHERE id = NEW.user_id;
  ELSIF (TG_OP = 'UPDATE') THEN
    -- Check if user_id or status changed
    IF NEW.user_id != OLD.user_id OR NEW.status != OLD.status THEN
      -- If user_id changed (should be rare, implies re-assigning affiliate profile)
      -- Clear old unified_profile link
      IF NEW.user_id != OLD.user_id THEN
        UPDATE public.unified_profiles
        SET affiliate_id = NULL,
            affiliate_general_status = NULL
        WHERE id = OLD.user_id;
      END IF;
      -- Update new/current unified_profile
      UPDATE public.unified_profiles
      SET affiliate_id = NEW.id, 
          affiliate_general_status = NEW.status
      WHERE id = NEW.user_id;
    END IF;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE public.unified_profiles
    SET affiliate_id = NULL,
        affiliate_general_status = NULL
    WHERE id = OLD.user_id;
  END IF;
  RETURN NULL; -- result is ignored since this is an AFTER trigger
END;
$function$
```
- **Triggered by:** `trigger_sync_unified_profile_after_affiliate_change` on `public.affiliates`.

### 4. `public.calculate_and_set_conversion_commission()`
Calculates and sets the `commission_amount` on a new `affiliate_conversions` record based on the conversion `level` and the affiliate's `is_member` status.
```sql
CREATE OR REPLACE FUNCTION public.calculate_and_set_conversion_commission()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  aff_commission_rate NUMERIC; -- Not used in current L1/L2 logic but declared
  aff_is_member BOOLEAN;
  calculated_commission NUMERIC;
BEGIN
  -- Get affiliate details (specifically is_member)
  SELECT is_member
  INTO aff_is_member
  FROM public.affiliates
  WHERE id = NEW.affiliate_id;

  IF NOT FOUND THEN
    -- This case should ideally be prevented by FK constraints.
    -- If affiliate not found, commission will effectively be 0 based on subsequent logic.
    aff_is_member := false; -- Default if affiliate somehow not found
  END IF;

  IF NEW.level = 1 THEN
    IF aff_is_member THEN
      calculated_commission := NEW.gmv * 0.25; -- 25% for members
    ELSE
      calculated_commission := NEW.gmv * 0.20; -- 20% for non-members
    END IF;
  ELSIF NEW.level = 2 THEN
    calculated_commission := NEW.gmv * 0.10; -- 10% for level 2 (membership status doesn't affect L2)
  ELSE
    calculated_commission := 0.00; -- Default to 0 if level is not 1 or 2
  END IF;

  NEW.commission_amount := calculated_commission;
  RETURN NEW;
END;
$function$
```
- **Triggered by:** `trigger_calculate_commission` on `public.affiliate_conversions`.

### 5. `public.handle_fraud_flag_affiliate_suspension()`
Updates an affiliate's status to `flagged` in the `public.affiliates` table when a new record is inserted into `public.fraud_flags` for that affiliate.
```sql
CREATE OR REPLACE FUNCTION public.handle_fraud_flag_affiliate_suspension()
RETURNS TRIGGER AS $$
BEGIN
    -- NEW.affiliate_id is directly available from the fraud_flags table
    IF NEW.affiliate_id IS NOT NULL THEN
        -- Update the affiliate's status to 'flagged'
        UPDATE public.affiliates
        SET status = 'flagged', 
            updated_at = clock_timestamp() 
        WHERE id = NEW.affiliate_id;
        
        RAISE NOTICE 'Affiliate % status updated to flagged due to fraud flag %', 
                     NEW.affiliate_id, NEW.id;
    ELSE
        RAISE WARNING 'fraud_flag % was inserted without an affiliate_id.', NEW.id;
    END IF;

    RETURN NEW; -- Result is ignored since this is an AFTER trigger
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```
- **Triggered by:** `update_affiliate_status_on_fraud_flag` on `public.fraud_flags`.

## Relationships Diagram (Conceptual ERD)
```mermaid
erDiagram
    unified_profiles ||--o{ affiliates : "has (optional)"
    unified_profiles ||--o{ membership_levels : "belongs to (optional)"
    
    affiliates ||--|{ affiliate_clicks : "generates"
    affiliates ||--|{ affiliate_conversions : "earns"
    affiliates ||--|{ fraud_flags : "can have"
    
    affiliate_clicks ||--o{ affiliate_conversions : "can lead to"
    
    membership_levels {
        uuid id PK
        text name UNIQUE
        numeric commission_rate
        timestamptz created_at
        timestamptz updated_at
    }

    unified_profiles {
        uuid id PK
        text email
        uuid affiliate_id FK "nullable"
        affiliate_status_type affiliate_general_status "nullable"
        uuid membership_level_id FK "nullable"
    }

    affiliates {
        uuid id PK
        uuid user_id FK
        text slug UNIQUE
        numeric commission_rate
        boolean is_member
        affiliate_status_type status
        timestamptz created_at
        timestamptz updated_at
    }

    affiliate_clicks {
        uuid id PK
        uuid affiliate_id FK
        uuid visitor_id
        inet ip_address
        text user_agent
        text referral_url
        text landing_page_url
        timestamptz created_at
        timestamptz updated_at
    }

    affiliate_conversions {
        uuid id PK
        uuid affiliate_id FK
        uuid click_id FK "nullable"
        uuid order_id UNIQUE
        uuid customer_id "nullable"
        numeric gmv
        numeric commission_amount
        integer level "nullable"
        conversion_status_type status
        timestamptz created_at
        timestamptz updated_at
    }

    fraud_flags {
        uuid id PK
        uuid affiliate_id FK
        text reason
        jsonb details "nullable"
        boolean resolved
        timestamptz resolved_at "nullable"
        text resolver_notes "nullable"
        timestamptz created_at
        timestamptz updated_at
    }
```
