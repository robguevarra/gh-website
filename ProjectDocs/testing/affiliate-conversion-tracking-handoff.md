# Affiliate Conversion Tracking Testing Handoff Document

## Overview

This document provides comprehensive information for testing the newly implemented affiliate conversion tracking system. The system extends the existing affiliate click tracking functionality to include conversion attribution through the Xendit payment webhook, commission calculation based on membership tiers, and network partner integration with postback functionality.

## Project Information

- **Supabase Project ID**: `cidenjydokpzpsnpywcf`
- **Environment Variable Requirements**:
  - `NETWORK_POSTBACK_URL_TEMPLATE`: Template URL for network postbacks with placeholders for `{network}`, `{transaction_id}`, `{amount}`, and `{subid}`

## Key Components

### 1. Xendit Webhook Integration

The Xendit webhook handler has been extended to extract affiliate tracking information from cookies and attribute conversions to the appropriate affiliate.

- **File**: `/app/api/webhooks/xendit/route.ts`
- **Key Functions**:
  - Extracts affiliate cookies (`gh_aff` and `gh_vid`) from request headers
  - Looks up the affiliate by slug
  - Finds attributable clicks using the "last-click-wins" model
  - Records conversions with idempotency based on `order_id`
  - Creates network postbacks when applicable

### 2. Affiliate Conversion Service

A new service module handles all conversion-related logic, including attribution, recording, and commission calculation.

- **File**: `/lib/services/affiliate/conversion-service.ts`
- **Key Functions**:
  - `extractAffiliateTrackingCookies`: Extracts tracking cookies from request headers
  - `lookupAffiliateBySlug`: Finds affiliate record by slug
  - `findAttributableClick`: Locates the most recent click for attribution
  - `recordAffiliateConversion`: Creates conversion record with idempotency
  - `createNetworkPostback`: Generates postback records for network partners

### 3. Membership Tier System

A new system for managing affiliate membership tiers and corresponding commission rates.

- **File**: `/lib/services/affiliate/membership-service/tier-management.ts`
- **Key Functions**:
  - `assignMembershipTier`: Assigns a tier to an affiliate
  - `checkAndAssignCourseEnrolleeTier`: Automatically assigns Course Enrollee tier
  - `getUserMembershipTier`: Retrieves current tier information
  - `getAllMembershipTiers`: Lists all available tiers

### 4. Conversion Status Management

A service for managing conversion status lifecycle and history.

- **File**: `/lib/services/affiliate/status-service/conversion-status.ts`
- **Key Functions**:
  - `updateConversionStatus`: Updates status with history tracking
  - `batchUpdateConversionStatus`: Updates multiple conversions at once
  - `getConversionStatusHistory`: Retrieves status change history

### 5. Network Postback System

A system to notify network partners about conversions with subID tracking.

- **File**: `/app/api/affiliate/postback/route.ts`
- **Key Functions**:
  - Handles sending postback notifications
  - Provides retry functionality for failed postbacks
  - Tracks postback status and attempts

## Database Schema Changes

### New Columns

1. **affiliate_clicks**:
   - `sub_id` (text): For tracking network partner sub-IDs

2. **affiliate_conversions**:
   - `sub_id` (text): For tracking network partner sub-IDs
   - `status_history` (JSONB): Tracks status changes with timestamps

### New Tables

1. **network_postbacks**:
   - `id` (uuid, PK)
   - `conversion_id` (uuid, FK)
   - `network_name` (text)
   - `sub_id` (text)
   - `postback_url` (text)
   - `status` (postback_status_type)
   - `attempts` (integer)
   - `last_attempt_at` (timestamptz)
   - `error_message` (text)
   - `created_at` (timestamptz)
   - `updated_at` (timestamptz)

### New Enum Types

1. **postback_status_type**:
   - `pending`
   - `sent`
   - `failed`
   - `retrying`

### Membership Level Updates

Renamed and redefined membership levels:
- "Course Enrollee Tier" (25% commission)
- "Network Partner Tier" (30% commission)
- "Standard Affiliate Tier" (20% commission)
- "Secondary Commission Tier" (10% commission)
- "Network Elite Tier" (35% commission)

## API Endpoints

### 1. Xendit Webhook
- **Endpoint**: `/api/webhooks/xendit`
- **Method**: POST
- **Purpose**: Processes payment events and attributes conversions

### 2. Network Postback
- **Endpoint**: `/api/affiliate/postback`
- **Method**: POST
- **Purpose**: Sends and retries postback notifications to network partners

### 3. Conversion Status Management
- **Endpoint**: `/api/affiliate/conversions/status`
- **Method**: PUT
- **Purpose**: Updates conversion status (single or batch)
- **Method**: GET
- **Purpose**: Lists conversions with filtering options

### 4. Membership Tier Management
- **Endpoint**: `/api/admin/affiliate/membership`
- **Method**: PUT
- **Purpose**: Updates an affiliate's membership tier
- **Method**: GET
- **Purpose**: Retrieves membership tiers or a specific user's tier
- **Method**: POST
- **Purpose**: Auto-assigns tiers based on course enrollment

## Testing Instructions

### Prerequisites
1. Supabase project setup with the correct schema
2. `.env` file with required environment variables
3. Test affiliate accounts in the database
4. Test click records for these affiliates

### Test Scenarios

#### 1. Basic Conversion Attribution

1. **Setup**:
   - Create a test affiliate with slug "test-affiliate"
   - Generate a test click record for this affiliate with a known visitor ID

2. **Test**:
   - Send a simulated Xendit webhook request with:
     - Headers containing `gh_aff=test-affiliate` and `gh_vid=[known visitor ID]` cookies
     - Valid invoice.paid event JSON payload
     - Valid order ID and amount

3. **Expected Results**:
   - New conversion record created with:
     - Correct affiliate_id
     - Correct click_id
     - Status: "pending"
     - Commission calculated based on membership tier

#### 2. Network Partner Attribution with Sub-ID

1. **Setup**:
   - Create a test network affiliate with slug "network-partner"
   - Assign "Network Partner Tier" membership level
   - Generate a test click with sub_id "TEST123"

2. **Test**:
   - Send a simulated Xendit webhook with:
     - Headers containing `gh_aff=network-partner` and appropriate visitor ID
     - Valid invoice.paid event
     - Sub-ID included in the referral data

3. **Expected Results**:
   - Conversion record created with sub_id "TEST123"
   - Network postback record created with:
     - Correct network_name
     - Correct sub_id
     - Status: "pending"
     - Generated postback URL

#### 3. Conversion Status Lifecycle

1. **Setup**:
   - Existing conversion record with status "pending"

2. **Test**:
   - Send PUT request to `/api/affiliate/conversions/status` to update status to "cleared"
   - Send another request to update to "paid"

3. **Expected Results**:
   - Status changes correctly
   - Status history records each change with timestamp

#### 4. Network Postback Retry

1. **Setup**:
   - Existing network_postback record with status "failed"

2. **Test**:
   - Send POST request to `/api/affiliate/postback` with the postback ID

3. **Expected Results**:
   - Postback retry attempted
   - Status updated based on result
   - Attempts count incremented

#### 5. Batch Status Updates

1. **Setup**:
   - Multiple conversion records with status "pending"

2. **Test**:
   - Send PUT request to `/api/affiliate/conversions/status` with array of conversion IDs

3. **Expected Results**:
   - All specified conversions updated to new status
   - Individual results returned for each conversion

#### 6. Membership Tier Assignment

1. **Setup**:
   - Affiliate with "Standard Affiliate Tier"

2. **Test**:
   - Send PUT request to `/api/admin/affiliate/membership` to upgrade to "Network Elite Tier"
   - Create a new conversion for this affiliate

3. **Expected Results**:
   - Tier updated successfully
   - New conversion uses the 35% commission rate

## Troubleshooting

### Common Issues

1. **Missing cookies in webhook request**:
   - Check if cookies are being properly included in request headers
   - Verify cookie format matches expected pattern

2. **Commission calculation discrepancies**:
   - Verify membership tier assignment
   - Check if the calculate_and_set_conversion_commission trigger is working correctly

3. **Failed postbacks**:
   - Validate NETWORK_POSTBACK_URL_TEMPLATE format
   - Check network_postbacks table for error messages
   - Use the retry endpoint to manually retry failed postbacks

### Logging

Comprehensive logging has been implemented throughout the system:
- Webhook processing logs
- Conversion attribution logs
- Postback success/failure logs
- Status transition logs

## Test Implementation Results

We have implemented comprehensive unit tests for the affiliate conversion tracking service functions. These tests verify the correct behavior of the core service logic in isolation, ensuring reliability and robustness of the system.

### Test Files

1. **Cookie Parsing Tests**
   - `__tests__/affiliate/extraction-utils.test.ts`: Verifies that cookie strings can be correctly parsed to extract affiliate tracking cookies.
   - Coverage: Various cookie formats, missing cookies, malformed data.

2. **Affiliate Lookup Tests**
   - `__tests__/affiliate/lookup-affiliate.test.ts`: Tests the affiliate lookup by slug functionality.
   - Coverage: Successful lookup, not found cases, error handling.

3. **Click Attribution Tests**
   - `__tests__/affiliate/find-attributable-click.test.ts`: Tests finding the most recent click for an affiliate/visitor pair.
   - Coverage: Successful attribution, no matching clicks, error cases.

4. **Conversion Recording Tests**
   - `__tests__/affiliate/record-conversion.test.ts`: Tests the recording of conversions with proper idempotency.
   - Coverage: New conversions, duplicate prevention, commission calculation triggers, error handling.

5. **Network Postback Tests**
   - `__tests__/affiliate/network-postback.test.ts`: Tests the creation of network partner postback records.
   - Coverage: Successful creation, null sub-id handling, error cases.

### Testing Challenges

- **Next.js Request Mocking**: We encountered difficulties with mocking the Request object's cookie headers in the test environment. We implemented a workaround by testing the cookie parsing logic separately from the request processing.

- **Supabase Client Mocking**: We created mock implementations of the Supabase client methods to simulate database interactions without requiring a live database connection.

### Running the Tests

To run all affiliate-related tests:
```bash
npx vitest run __tests__/affiliate/
```

To run a specific test file:
```bash
npx vitest run __tests__/affiliate/[test-file-name].test.ts
```

See `ProjectDocs/Testing/affiliate-conversion-testing-summary.md` for detailed documentation on test coverage and implementation.

## Further Development

The following items are planned for future iterations:
- Network-specific reporting dashboard
- Automated conversion verification system
- Enhanced fraud detection
- Batch processing for large-scale postbacks
- Integration tests for the Xendit webhook handler
- Better approaches for mocking Next.js Request objects with cookies

---

## Testing Environment Setup

### Creating Test Affiliates

```sql
-- Insert test affiliates with different tiers
WITH tier_ids AS (
  SELECT id, name FROM public.membership_levels
)
INSERT INTO public.affiliates (id, user_id, slug, commission_rate, status, created_at, updated_at)
VALUES
  (
    gen_random_uuid(),
    '[TEST_USER_ID]',
    'test-standard-affiliate',
    0.20,
    'active',
    now(),
    now()
  ),
  (
    gen_random_uuid(),
    '[TEST_USER_ID_2]',
    'test-network-partner',
    0.30,
    'active',
    now(),
    now()
  );
```

### Simulating Webhook Requests

```bash
# Example cURL command to simulate a Xendit webhook with affiliate tracking cookies
curl -X POST \
  https://yourdomain.com/api/webhooks/xendit \
  -H 'Content-Type: application/json' \
  -H 'X-Callback-Token: [YOUR_CALLBACK_TOKEN]' \
  -H 'Cookie: gh_aff=test-standard-affiliate; gh_vid=[VISITOR_ID]' \
  -d '{
    "event": "invoice.paid",
    "data": {
      "id": "test-invoice-id-123",
      "external_id": "test-order-123",
      "amount": 100.00,
      "status": "PAID"
    }
  }'
```

### Testing Postback Endpoint

```bash
# Example cURL command to test postback retry
curl -X POST \
  https://yourdomain.com/api/affiliate/postback \
  -H 'Content-Type: application/json' \
  -d '{
    "postbackId": "[POSTBACK_ID]"
  }'
```

### Testing Conversion Status Update

```bash
# Example cURL command to update conversion status
curl -X PUT \
  https://yourdomain.com/api/affiliate/conversions/status \
  -H 'Content-Type: application/json' \
  -d '{
    "conversionId": "[CONVERSION_ID]",
    "newStatus": "cleared",
    "notes": "Verified by admin"
  }'
```
