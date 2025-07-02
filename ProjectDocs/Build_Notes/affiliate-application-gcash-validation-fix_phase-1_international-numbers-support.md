# Build Notes: Affiliate Application GCash Validation Fix
## Task Group: International Numbers Support
## Phase: 1

---

### Task Objective
Fix the affiliate application form validation to allow GCash numbers from outside the Philippines, ensuring frontend and backend validation are consistent.

### Current State Assessment
- ❌ Backend API validation is restricted to Philippine GCash numbers only (`/^09\d{9}$/`)
- ✅ Frontend validation already supports international E.164 format
- ❌ Console error occurs when users try to submit international GCash numbers
- ❌ Error: "Invalid application data" returned from backend when validation fails

### Future State Goal
- ✅ Backend validation matches frontend validation
- ✅ Users can submit GCash numbers in both Philippine (09XXXXXXXXX) and international (+CountryCode + 10-15 digits) formats
- ✅ Consistent validation across all related services (verification, payout validation)
- ✅ Clear error messages that guide users on acceptable formats

### Implementation Plan

#### ✅ Step 1: Identify Root Cause
- [x] Located validation issue in `/app/api/student/affiliate-application/route.ts`
- [x] Found restrictive regex pattern only allowing Philippine numbers
- [x] Confirmed frontend already supports international format

#### ✅ Step 2: Update API Validation Schema  
- [x] Replace hardcoded regex with flexible validation function in `affiliateApplicationSchema`
- [x] Add `isValidPhoneNumber` helper function supporting:
  - Philippine format: `09XXXXXXXXX`
  - International with +: `+CountryCode + 10-15 digits`
  - International without +: `10-15 digits`
- [x] Update error message to be more descriptive

#### ✅ Step 3: Update GCash Verification Service
- [x] Modified `lib/services/affiliate/gcash-verification.ts`
- [x] Updated `isValidGCashNumber` method to support international formats
- [x] Updated error messages to reflect new validation rules

#### ✅ Step 4: Update Payout Validation Logic
- [x] Modified `lib/actions/admin/payout-actions.ts`
- [x] Updated GCash number validation in `validateAffiliatePayoutDetails`
- [x] Ensured consistency across all payout-related validation

#### Step 5: Testing and Verification (Next)
- [ ] Test with Philippine GCash number (09XXXXXXXXX format)
- [ ] Test with international GCash number (+XX format)
- [ ] Test with international GCash number (digits only format)
- [ ] Verify error handling for invalid formats
- [ ] Test full affiliate application flow end-to-end

#### Step 6: Code Review and Documentation
- [ ] Review all changes for consistency
- [ ] Ensure error messages are user-friendly
- [ ] Update any related documentation if needed
- [ ] Commit changes with descriptive message

---

## Key Technical Changes Made

### 1. API Endpoint Update (`app/api/student/affiliate-application/route.ts`)
```typescript
// Before: Restrictive Philippine-only validation
gcashNumber: z.string().regex(/^09\d{9}$/, "GCash number must be 11 digits starting with 09")

// After: Flexible international validation
gcashNumber: z.string().refine(isValidPhoneNumber, {
  message: "GCash number must be either PH format (09XXXXXXXXX) or international format (+CountryCode + 10-15 digits)"
})
```

### 2. Helper Function Added
```typescript
const isValidPhoneNumber = (number: string): boolean => {
  return (
    /^09\d{9}$/.test(number) ||      // PH numbers (09XXXXXXXXX)
    /^\+\d{10,15}$/.test(number) ||  // International with + (10-15 digits)  
    /^\d{10,15}$/.test(number)       // Digits only 10-15 digits (international without +)
  )
}
```

### 3. Updated Services
- GCash verification service validation method
- Payout validation logic
- Error messages across all services

---

## Current Status: ✅ IMPLEMENTATION COMPLETE
**Next Action:** Test the fix with various GCash number formats to ensure proper functionality. 