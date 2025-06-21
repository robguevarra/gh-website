# Affiliate Conversion Tracking - Phase 1: Implementation

## Task Objective
Extend the Xendit webhook system to track conversions (purchases) and attribute them to affiliates, creating a complete end-to-end affiliate attribution and commission calculation system that builds on the click tracking functionality.

## Current State Assessment
We have successfully implemented affiliate click tracking (Phase 1) that sets cookies for visitor identification and affiliate attribution. The database schema for `affiliate_conversions` is in place, along with triggers for automatic commission calculation. However, there is currently no connection between the payment system (Xendit webhooks) and the affiliate system. When purchases occur, they are not being attributed to the referring affiliates, resulting in lost commission opportunities.

## Future State Goal
A fully functional affiliate conversion tracking system that:
- Automatically identifies affiliate-referred purchases through the Xendit webhook
- Records conversions with proper attribution to the correct affiliate
- Calculates commissions accurately based on membership status and level
- Manages conversion status through its lifecycle (pending → cleared → paid)
- Provides robust security and error handling for webhook processing
- Enables multi-level commission attribution where applicable

## Implementation Plan

### 1. Modify Xendit Webhook Endpoint
- [x] Analyze the existing webhook handler in `app/api/webhooks/xendit/route.ts`
- [x] Add affiliate attribution logic to the `invoice.paid` event handler
- [x] Extract visitor ID and affiliate cookies from the transaction context
- [x] Implement proper error handling and logging for the affiliate tracking portion
- [x] Update transaction metadata to include affiliate attribution information

### 2. Develop Affiliate Attribution Logic
- [x] Create a service module for affiliate conversion attribution
- [x] Implement cookie retrieval to identify the referring affiliate
- [x] Connect conversions to previously recorded clicks where possible
- [x] Implement "last-click-wins" attribution model for proper crediting
- [x] Handle edge cases like missing cookies or multiple affiliate referrals

### 3. Implement Tiered Commission Calculation
- [x] Rename and redefine membership levels to align with our commission structure:
  - Rename "Platinum Tier" to "Course Enrollee Tier" (25%)
  - Rename "Gold Tier" to "Network Partner Tier" and adjust to 30%
  - Rename "Silver Tier" to "Standard Affiliate Tier" and adjust to 20% 
  - Rename "Bronze Tier" to "Secondary Commission Tier" (keep at 10%)
  - Add a new "Network Elite Tier" for the 35% commission level
- [x] Update the existing `calculate_and_set_conversion_commission` trigger to use membership levels
  - Use membership_level_id for commission rate determination instead of is_member
  - Apply rates consistently across all conversion types
- [x] Implement utility functions for membership level assignment
  - Automatically assign appropriate tier for course enrollees
  - Default new affiliates to standard tier
- [x] Create admin interface for manual tier management
  - Allow manual upgrade of affiliates to higher tiers
  - Support downgrading if needed for policy enforcement
- [x] Test all commission scenarios with various membership levels
- [x] Add validation to prevent commission calculation errors

### 4. Implement Conversion Status Management
- [x] Add status_history column to affiliate_conversions for tracking changes
- [x] Create status transition logic from pending → cleared → paid
- [x] Implement API for admins to manage conversion status
- [x] Add validation and security for status updates to 'cleared' after verification
- [x] Implement batch operations for status changes to accommodate admin workflows
- [x] Add timestamp tracking for status changes

### 5. Implement Security and Error Handling
- [x] Enhance webhook signature verification for Xendit
- [x] Add rate limiting and abuse prevention for the webhook endpoint
- [x] Implement comprehensive logging for all conversion tracking operations
- [x] Create monitoring alerts for unusual activity patterns
- [x] Set up error recovery mechanisms for failed attribution attempts

### 6. Implement Network Partner Integration
- [x] Create a special account structure for affiliate networks:
  - Set up dedicated slugs for each network (e.g., `?ref=involveasia`)
  - Assign to Network Partner Tier (30%) by default
- [x] Implement sub-ID tracking for network affiliates:
  - Enhance click tracking to capture sub-IDs (e.g., `?ref=involveasia&subid=12345`)
  - Store sub-ID in the `affiliate_clicks` table (add `sub_id` column)
  - Pass sub-ID through the conversion flow for network reporting
- [x] Create postback URL system for automated network notifications:
  - Support dynamic postback URL generation with network, transaction ID, and amount parameters
  - Store postback attempts in the `network_postbacks` table for retry and monitoring
  - Add status tracking for postback attempts (pending, sent, failed, retrying)
- [ ] Develop network-specific reporting:
  - Create aggregated views for each network's performance
  - Include sub-ID breakdown for the network's internal tracking
  - Support CSV/JSON export formats for data integration
  
### 7. Testing and Documentation
- [x] Create test cases for all attribution and conversion tracking scenarios
- [ ] Test with simulated webhook events in development environment
- [x] Include network partner test cases with sub-ID tracking
- [x] Document the complete affiliate attribution flow for future reference
- [x] Create admin documentation for managing and troubleshooting conversions
- [ ] Update API documentation to reflect new affiliate conversion tracking endpoints

> **Note:** Unit tests for all service functions have been implemented, with the exception of a skipped test for `extractAffiliateTrackingCookies` function due to limitations in mocking Request cookie headers in the test environment. This is documented in `ProjectDocs/Testing/affiliate-conversion-testing-summary.md`.

## Technical Considerations

### Database Integration
- The `affiliate_conversions` table already has the necessary structure with:
  - `affiliate_id`: The credited affiliate
  - `click_id`: Optional link to the original click
  - `order_id`: Unique identifier from the transaction
  - `gmv`: Gross Merchandise Value for commission calculation
  - `commission_amount`: Calculated by the `calculate_and_set_conversion_commission` trigger
  - `level`: For multi-level commission calculation (1 or 2)
  - `status`: Using the `conversion_status_type` enum ('pending', 'cleared', 'paid', 'flagged')

- Database changes needed for network partner integration:
  - Add `sub_id` column to `affiliate_clicks` table (text, nullable)
  - Add `sub_id` column to `affiliate_conversions` table (text, nullable)
  - Create new table `network_postbacks` to track postback attempts and status

### Commission Rate Structure
- We'll implement our tiered commission structure by renaming and adjusting the existing membership levels:
  
  - **Course Enrollee Tier (25%)**: For Papers to Profits students
    - Rename "Platinum Tier" to "Course Enrollee Tier"
    - Keep the 25% commission rate
    - Will be assigned to verified course enrollees
  
  - **Network Partner Tiers**:
    - **Network Partner Tier (30%)**: Base tier for network partners
      - Rename "Gold Tier" to "Network Partner Tier"
      - Adjust from current 20% to 30%
    - **Network Elite Tier (35%)**: Premium tier for high-performing network partners
      - Create this new tier with 35% commission rate
      - Will be manually assigned when partners reach performance thresholds
  
  - **Standard Affiliate Tier (20%)**: For outside affiliates
    - Rename "Silver Tier" to "Standard Affiliate Tier"
    - Adjust from current 15% to 20%
    - Default tier for new affiliates
  
  - **Secondary Commission Tier (10%)**: For level 2 commissions
    - Rename "Bronze Tier" to "Secondary Commission Tier"
    - Maintain current 10% rate
    - Used for level 2 conversions or other special cases

- Database changes needed:
  - Update existing membership level names and commission rates
  - Add the new "Network Elite Tier" with 35% commission rate
  - No schema changes required as we'll use existing tables
  
- Trigger function changes:
  - Update `calculate_and_set_conversion_commission` to use membership_level_id
  - Remove the is_member logic and replace with membership-based logic
  
- Admin/API features needed:
  - Endpoint to assign appropriate membership levels
  - Admin interface for manual tier management
  - Reporting to track affiliate performance for tier management

### Industry Best Practices for Tiered Commissions
- **Progressive Membership Tiers**: Using our descriptive membership levels to create a clear progression path (Standard → Network Partner → Network Elite)
- **Differentiated Rates by Relationship**: Offering different commission rates based on relationship type (course enrollee, network partner, standard affiliate)
- **Clear Upgrade Criteria**: Establishing transparent performance metrics for manual tier upgrades
- **Analytics Dashboard**: Providing affiliates with real-time performance data to track their progress toward higher tiers
- **Performance Reviews**: Implementing regular review cycles for tier status adjustments
- **Special Recognition**: Using the Network Elite tier (35%) as a powerful motivator and recognition for top-performing partners
- **Performance Analytics**: Provide affiliates with detailed reporting on their performance and tier status
- **Balance Profitability and Motivation**: Our rate structure is competitive while maintaining program sustainability

### Attribution Logic
- We'll use cookies set by the click tracking system (`gh_aff` and `gh_vid`)
- The basic attribution flow will be:
  1. Customer clicks affiliate link → Cookie set with affiliate slug and visitor ID
  2. Customer makes purchase → Xendit webhook triggered
  3. Webhook handler reads cookies → Identifies affiliate → Creates conversion record
  4. Database trigger calculates commission → Conversion record completed
  
### Network Partner Integration
- **Single Master Account**: Each affiliate network will have one master account in our system
- **Sub-ID Tracking**: We'll capture and pass-through the network's sub-ID parameter
  - When a visitor comes through a network link like `?ref=involveasia&subid=12345`
  - We'll store both the network's master affiliate ID and the sub-ID
  - This allows the network to track which of their affiliates referred the sale
  
- **Postback System**:
  - When a conversion is recorded for a network partner:
    1. We'll store the conversion in our database normally
    2. We'll also call the network's postback URL with transaction details
    3. We'll track success/failure of postback attempts for troubleshooting
  - Format: `https://network-domain.com/postback?transaction_id={id}&amount={amount}&subid={subid}`
  - Security measures will include IP whitelisting and cryptographic signatures
  
- **Network-Specific Reporting**:
  - Aggregated network performance metrics
  - Sub-ID breakdown reports for networks to reconcile their records
  - Export functionality for data integration

### Security Considerations
- All webhook requests must be verified using Xendit's signature verification
- IP rate limiting should be applied to prevent webhook abuse
- Cookie tampering should be detected through cross-validation with the database
- Error handling must not expose sensitive information in responses

## Dependencies
- Completed affiliate click tracking system (Task #5)
- Existing Xendit webhook infrastructure
- Database schema for `affiliate_conversions` table
- Trigger function `calculate_and_set_conversion_commission`

## Success Metrics
- All valid affiliate-referred transactions are properly attributed
- Commission calculations match the expected values for all scenarios
- No duplicate conversion records are created
- Security checks prevent invalid or fraudulent conversion attempts
- System performance remains stable under load
- Network partners receive accurate and timely postbacks

## SQL Migration Plan

### 1. Update Membership Levels
```sql
-- Rename existing tiers
UPDATE public.membership_levels SET name = 'Course Enrollee Tier' WHERE name = 'Platinum Tier';
UPDATE public.membership_levels SET name = 'Network Partner Tier', commission_rate = 0.30 WHERE name = 'Gold Tier';
UPDATE public.membership_levels SET name = 'Standard Affiliate Tier', commission_rate = 0.20 WHERE name = 'Silver Tier';
UPDATE public.membership_levels SET name = 'Secondary Commission Tier' WHERE name = 'Bronze Tier';

-- Add new Network Elite tier
INSERT INTO public.membership_levels (name, commission_rate, created_at, updated_at)
VALUES ('Network Elite Tier', 0.35, now(), now());
```

### 2. Add Sub-ID Tracking
```sql
-- Add sub_id column to affiliate_clicks table
ALTER TABLE public.affiliate_clicks
ADD COLUMN sub_id text;

-- Add sub_id column to affiliate_conversions table
ALTER TABLE public.affiliate_conversions
ADD COLUMN sub_id text;
```

### 3. Create Network Postbacks Table
```sql
-- Create enum for postback status
CREATE TYPE public.postback_status_type AS ENUM ('pending', 'sent', 'failed', 'retrying');

-- Create network_postbacks table
CREATE TABLE public.network_postbacks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversion_id uuid NOT NULL REFERENCES public.affiliate_conversions(id) ON DELETE CASCADE,
  network_name text NOT NULL,
  sub_id text,
  postback_url text NOT NULL,
  status public.postback_status_type NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  last_attempt_at timestamptz,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add updated_at trigger
CREATE TRIGGER set_network_postbacks_updated_at
BEFORE UPDATE ON public.network_postbacks
FOR EACH ROW
EXECUTE FUNCTION public.trigger_set_timestamp();
```

### 4. Update Commission Calculation Trigger
```sql
-- Update trigger function to use membership_level_id instead of is_member
CREATE OR REPLACE FUNCTION public.calculate_and_set_conversion_commission()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  membership_level_name TEXT;
  membership_commission_rate NUMERIC;
  calculated_commission NUMERIC;
BEGIN
  -- Get affiliate's membership level and commission rate
  SELECT ml.name, ml.commission_rate
  INTO membership_level_name, membership_commission_rate
  FROM public.affiliates a
  JOIN public.unified_profiles up ON up.id = a.user_id
  JOIN public.membership_levels ml ON ml.id = up.membership_level_id
  WHERE a.id = NEW.affiliate_id;

  IF NOT FOUND THEN
    -- Default to Standard Affiliate Tier if no membership level found
    SELECT commission_rate INTO membership_commission_rate
    FROM public.membership_levels
    WHERE name = 'Standard Affiliate Tier';
    
    IF NOT FOUND THEN
      -- Use 0.20 as fallback if tier not found
      membership_commission_rate := 0.20;
    END IF;
  END IF;

  -- Handle level 2 conversions regardless of membership level
  IF NEW.level = 2 THEN
    calculated_commission := NEW.gmv * 0.10; -- Always 10% for level 2
  ELSE
    -- For level 1, use membership commission rate
    calculated_commission := NEW.gmv * membership_commission_rate;
  END IF;

  NEW.commission_amount := calculated_commission;
  RETURN NEW;
END;
$function$;
```

---

> **Note to AI Developers**: When working with this project, always ensure that you:
> 1. Review previously completed build notes for context and established patterns
> 2. Consult the implementation strategy and architecture planning documents
> 3. Align your work with the project context and design context guidelines
> 4. Follow the established folder structure, naming conventions, and coding standards
> 5. Include this reminder in all future build notes to maintain consistency
