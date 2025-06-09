# Affiliate Fraud Integration Fixes and Optimizations

**Date**: June 8, 2025  
**Developer**: Rob Guevarra  
**Project**: Admin Affiliate Fraud Integration  

## Issue Summary

The Admin Affiliate Fraud Integration system was experiencing several backend errors and performance issues:

1. **Database Query Errors**: 
   - Foreign key relationship ambiguity between `affiliates` and `unified_profiles` tables
   - Incorrect column names in the `affiliate_links` table queries
   
2. **Performance Issues**:
   - Excessive POST requests due to lack of caching in server actions
   - Repeated data fetching on the affiliate detail pages

## Changes Made

### 1. Fixed Foreign Key Relationship Ambiguity

**File**: `lib/actions/affiliate-actions.ts`  
**Function**: `getFraudFlagsForAffiliate`

Resolved the Supabase embedding error caused by multiple relationships between `affiliates` and `unified_profiles` by explicitly specifying the foreign key relationship:

```typescript
const { data: fraudFlags, error } = await supabase
  .from('fraud_flags')
  .select(`
    *,
    affiliates!inner(id, user_id, unified_profiles!affiliates_user_id_fkey(first_name, last_name, email))
  `)
  .eq('affiliate_id', affiliateId)
  .order('created_at', { ascending: false });
```

### 2. Corrected Database Column Names

**File**: `lib/actions/affiliate-actions.ts`  
**Function**: `getAffiliateLinks`

Fixed errors related to non-existent columns by updating queries to use the correct column names:
- Changed `url` to `url_path`
- Changed `is_default` to `is_active`

```typescript
const { data: links, error } = await supabase
  .from('affiliate_links')
  .select(`
    id,
    name,
    slug,
    url_path,
    created_at,
    is_active,
    utm_source,
    utm_medium,
    utm_campaign
  `)
  .eq('affiliate_id', affiliateId)
  .order('created_at', { ascending: false });
```

### 3. Implemented Caching for Server Actions

**File**: `lib/actions/fraud-notification-actions-simplified.ts`  
**Functions**: `getHighRiskFraudFlags` and `getHighRiskFraudFlagsForAffiliate`

Replaced `noStore()` with Next.js's `unstable_cache` to implement proper caching:

- Added 30-minute cache duration (1800 seconds)
- Implemented proper cache tags for better revalidation control
- Structured cache keys to be unique per affiliate
- Fixed syntax errors and ensured proper error handling

```typescript
const getFlagsWithCache = unstable_cache(
  async () => {
    // Function implementation
  },
  ['high-risk-fraud-flags', 'global-fraud-data'],
  { revalidate: 1800 } // Cache for 30 minutes
);
```

## Technical Details

### Database Schema Context

The system involves several related tables:
- `affiliates` - Stores affiliate information
- `unified_profiles` - Stores user profiles (has multiple relationships with affiliates)
- `fraud_flags` - Stores fraud detection events for affiliates
- `affiliate_links` - Stores referral links for affiliates

### Caching Strategy

- **Cache Duration**: 30 minutes (1800 seconds)
- **Cache Tags**: 
  - `high-risk-fraud-flags` - Main tag for fraud flag data
  - `global-fraud-data` - For system-wide fraud data
  - `affiliate-fraud-data` - For affiliate-specific fraud data
  - `{affiliateId}` - Unique per-affiliate tag

### Performance Impact

- Reduced database queries by implementing proper caching
- Improved page load times by reducing duplicate data fetching
- Decreased server load by minimizing repeated POST requests

## Known Limitations

- The affiliate detail page still shows multiple POST requests on initial load, potentially due to:
  - Client component re-rendering cycles
  - Parallel data fetching from multiple components
  - React hydration triggering multiple server action calls

## Recommendations for Future Work

1. **Extend Caching to Lower-Level Functions**:
   - Add caching to `getFraudFlagsForAffiliate` and `getAllAdminFraudFlags` functions for more efficient database access

2. **Optimize Component Data Flow**:
   - Consider implementing a context provider to share data between components
   - Refactor the page to fetch data at the highest level possible and pass it down to children

3. **Monitor Performance**:
   - Continue monitoring POST request frequency after caching implementation
   - Check if repeated requests persist after browser refresh or between visits

4. **Implement Data Prefetching**:
   - Use Next.js's prefetching capabilities for faster subsequent page loads

5. **Review React Component Structure**:
   - Analyze client components with React DevTools to identify unnecessary re-renders
   - Consider moving more logic to server components where possible

## Related Files

- `/lib/actions/affiliate-actions.ts` - Core affiliate data fetching functions
- `/lib/actions/fraud-notification-actions-simplified.ts` - Fraud flag processing and risk assessment
- `/app/admin/affiliates/[affiliateId]/page.tsx` - Affiliate detail page
- `/components/admin/affiliates/affiliate-detail-view.tsx` - Client component for affiliate details
- `/components/admin/flags/risk-assessment-badge.tsx` - Risk visualization component
