# Affiliate Conversion Tracking Testing Summary

## Overview

This document summarizes the test coverage for the affiliate conversion tracking system, focusing on the main service functions and their behavior.

## Implemented Tests

### 1. Cookie Parsing Logic
- **Test File**: `extraction-utils.test.ts`
- **Coverage**: Verifies that cookie strings can be correctly parsed to extract affiliate tracking cookies (`gh_aff` and `gh_vid`)
- **Approach**: Isolated the cookie parsing logic to ensure it works correctly independent of the Request object environment

### 2. Affiliate Lookup by Slug
- **Test File**: `lookup-affiliate.test.ts`
- **Coverage**: Tests the `lookupAffiliateBySlug` function which retrieves an affiliate ID by their slug
- **Approach**: Mocks Supabase client calls to test success, not found, and error scenarios

### 3. Attributable Click Finding
- **Test File**: `find-attributable-click.test.ts`
- **Coverage**: Tests the `findAttributableClick` function which locates the most recent click for an affiliate/visitor pair
- **Approach**: Mocks Supabase client calls to test scenarios with found clicks, no clicks, and database errors

### 4. Conversion Recording
- **Test File**: `record-conversion.test.ts`
- **Coverage**: Tests the `recordAffiliateConversion` function which handles creating conversion records
- **Approach**: Verifies idempotency (prevents duplicate conversions), error handling, and successful record creation

### 5. Network Postback Creation
- **Test File**: `network-postback.test.ts`
- **Coverage**: Tests the `createNetworkPostback` function for network partner conversion postbacks
- **Approach**: Verifies successful creation, handling of null values, and proper error handling

## Known Issues

### Request Cookie Extraction
- **Test File**: `conversion-service.test.ts`
- **Issue**: Cannot properly mock the Request object's cookie headers in the test environment
- **Workaround**: Implemented isolated tests for the cookie parsing logic in `extraction-utils.test.ts`
- **Status**: One test is skipped with a detailed comment explaining why

## Next Steps

1. **Integration Testing**: Develop tests for the Xendit webhook handler to verify end-to-end affiliate conversion attribution
2. **Environmental Testing**: Consider investigating better approaches for mocking Next.js Request objects with cookies
3. **CI/CD Integration**: Ensure these tests are integrated into the CI/CD pipeline

## Test Run Command

To run all affiliate-related tests:
```bash
npx vitest run __tests__/affiliate/
```

To run a specific test file:
```bash
npx vitest run __tests__/affiliate/[test-file-name].test.ts
```
