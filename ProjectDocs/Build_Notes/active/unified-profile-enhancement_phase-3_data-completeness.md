# Unified Profile Enhancement - Phase 3: Data Completeness

## Task Objective
Address the issue of incomplete user profile data in the unified_profiles table during the payment and enrollment process, ensuring all relevant fields are properly populated including tags, status, and student indicators.

## Current State Assessment
- Only minimal fields are being populated in the unified_profiles table during payment/enrollment: id, email, first_name, last_name
- Many important fields are NULL: phone, tags, status, created_at, is_student
- Available data like phone numbers in transaction metadata isn't being properly transferred to profiles
- No default values are being set for boolean fields like is_student
- Profiles lack proper tagging (e.g., "p2p_customer" tag) for segmentation
- P2P course customers can't be properly identified in the database

## Future State Goal
- All fields in unified_profiles should be properly populated during user creation
- Phone numbers from transaction metadata should be transferred to the user profile
- Boolean fields should have appropriate default values (is_student = true for course buyers)
- All P2P customers should be properly tagged with "p2p_customer"
- Add admin_metadata for tracking purchase date and registration source
- Backfill missing data for existing user profiles to maintain data consistency

## Implementation Plan

1. **Fix ensureAuthUserAndProfile Function** ✅
   - [x] Enhance function to populate all relevant fields in unified_profiles
   - [x] Add tag handling to include "p2p_customer" tag
   - [x] Set status to "active" by default
   - [x] Set is_student to true for course buyers
   - [x] Add acquisition_source tracking
   - [x] Preserve existing created_at or set new timestamp
   - [x] Add admin_metadata with purchase date and registration source

2. **Data Migration for Existing Profiles**
   - [ ] Create a database migration script to identify incomplete profiles
   - [ ] Fetch transaction data for each user to retrieve phone numbers
   - [ ] Update profiles with is_student=true where enrollment records exist
   - [ ] Add "p2p_customer" tag to all profiles with P2P enrollments
   - [ ] Set status="active" for all profiles with successful transactions
   - [ ] Set email_marketing_subscribed=true for all valid profiles

3. **Testing and Verification**
   - [ ] Test new signups through payment flow to verify complete profile creation
   - [ ] Verify that phone numbers are correctly transferred from transaction metadata
   - [ ] Check that tags are properly added and maintained
   - [ ] Verify that all boolean fields have appropriate default values
   - [ ] Test updating existing profiles through the payment flow

4. **Monitoring and Maintenance**
   - [ ] Add logging for profile creation/updates to track success
   - [ ] Create a dashboard to monitor profile completeness metrics
   - [ ] Set up alerts for incomplete profile creation
   - [ ] Document updated profile creation flow for future reference
   - [ ] Update technical documentation to reflect changes

## Additional Notes
- The fix for the ensureAuthUserAndProfile function has been implemented and deployed on July 1, 2025
- The data migration script for existing profiles will need to be carefully tested on a staging environment first
- Consider adding validation to prevent incomplete profiles in other user creation flows
