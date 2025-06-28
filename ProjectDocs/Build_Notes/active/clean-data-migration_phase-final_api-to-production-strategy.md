# Clean Data Migration - Final Strategy: API-to-Production Direct Migration

## Task Objective
Implement a simplified, industry-standard data migration strategy that extracts clean data directly from Xendit and Systeme.io APIs, validates it in staging tables, and performs a single atomic cutover to production tables for the platform launch.

## Current State Assessment - Factual Data Analysis

### Database Size and Contamination Overview
**Total Database**: 109 tables, 62 MB total size

**Contaminated Production Tables** (Mixed real customer + test data):
- `unified_profiles`: 3,636 records (should be ~6,000+ based on API sources)
- `transactions`: 3,358 records (missing 4,642+ Canva ebook transactions)
- `enrollments`: 2,883 records (missing enrollments for Canva customers)
- `auth.users`: 3,645 users (contains test accounts)

**Clean API Source Data** (Production-ready):
- `xendit` table: 9,025 total records
  - **4,496 PAID** transactions (3,002 P2P + 1,484 Canva)
  - **1,640 SETTLED** transactions (332 P2P + 1,299 Canva)
  - **2,818 EXPIRED** transactions (973 P2P + 1,839 Canva)
  - **71 UNPAID** transactions (36 P2P + 31 Canva)
- `systemeio` table: 15,270 total records
  - **3,664 "PaidP2P"** tagged users
  - **4,916 "Canva"** tagged users  
  - **2,893 users** with both tags
  - **~10,000+ unconverted leads** (no payment tags)

### Critical Data Loss Identified

**Missing Canva Ebook Revenue Stream**:
- **4,642 Canva transactions** not in current production tables
  - 1,484 PAID Canva ebooks = ₱1,484,000+ in missing revenue tracking
  - 1,299 SETTLED Canva ebooks = ₱1,299,000+ in missing settled revenue
- **4,916 Canva customers** not properly enrolled or tracked
- **Complete product line missing** from current business intelligence

**P2P Course Data Inconsistencies**:
- Xendit shows **3,334 PAID/SETTLED P2P** transactions
- Current `transactions` table only has **3,358 total** transactions (all products)
- **Missing transaction attribution** and proper product categorization

### Current /sync Endpoint Limitations

**File**: `app/api/admin/dashboard/sync/route.ts`

**Critical Flaws Identified**:

1. **Incomplete Product Coverage**
   - Only syncs "Papers to Profits" transactions (`ilike('Description', '%papers to profits%')`)
   - **Completely ignores Canva ebook products** despite being major revenue source
   - Missing product categorization logic

2. **Non-Idempotent Operations**
   - Always calls migration endpoints regardless of data changes
   - No change detection mechanism
   - Causes unnecessary database writes and timestamp pollution

3. **Fragmented Data Flow**
   - Creates auth users first, then calls 4 separate migration endpoints
   - No atomic transaction handling across the pipeline
   - Risk of partial failures leaving data in inconsistent state

4. **Limited Error Handling**
   - Only captures first 10 errors per operation
   - No systematic approach to data validation failures
   - No rollback mechanism for failed migrations

5. **CSV Table Dependencies**
   - Relies on `xendit` and `systemeio` tables that use **CSV import format**
   - Column names have spaces (`"Email"`, `"First name"`, `"Status"`)
   - **Not aligned with actual API response structures**

### Schema Misalignment Issues

**Xendit Table Structure** (Current CSV format):
```sql
-- Current problematic structure
"Status" TEXT,           -- Should be: status
"Description" TEXT,      -- Should be: product_id or reference_id  
"External ID" TEXT,      -- Should be: id
"Email" TEXT,           -- Should be: customer_email (from API)
"Customer Email" TEXT,   -- Duplicate/inconsistent field
"Amount" BIGINT,        -- Should be: amount (NUMERIC)
```

**Systemeio Table Structure** (Current CSV format):
```sql
-- Current problematic structure  
"Email" TEXT,           -- Should be: email
"First name" TEXT,      -- Should be: first_name
"Last name" TEXT,       -- Should be: last_name
"Tag" TEXT,            -- Should be: tags (ARRAY)
"Date Registered" TIMESTAMPTZ -- Should be: created_at
```

**Expected API Response Structures** (Based on documentation):

**Xendit API Response** ([source](https://docs.xendit.co/apidocs/list-transactions)):
```json
{
  "id": "txn_13dd178d-41fa-40b7-8fd3-f83675d6f413",
  "product_id": "d290f1ee-6c54-4b01-90e6-d701748f0701", 
  "type": "PAYMENT",
  "status": "SUCCESS",
  "reference_id": "ref23244",
  "currency": "PHP",
  "amount": 1000,
  "created": "2021-06-23T02:42:15.601Z",
  "updated": "2021-06-23T02:42:15.601Z"
}
```

**Systeme.io API Response** ([source](https://developer.systeme.io/reference/api_contacts_get_collection)):
```json
{
  "id": "12345",
  "email": "customer@example.com",
  "first_name": "John",
  "last_name": "Doe", 
  "tags": ["PaidP2P", "FBInviteSent"],
  "created_at": "2021-06-23T02:42:15.601Z"
}
```

### Business Logic Gaps

**Missing Product Catalog**:
- No clear definition of product types and their enrollment rules
- P2P course vs Canva ebook have different business models
- No handling for future product lines

**Lead Attribution Missing**:
- 10,000+ Systeme.io leads with no payment attribution
- No conversion tracking from lead to customer
- Missing marketing funnel analysis capability

**Revenue Recognition Issues**:
- PAID vs SETTLED status handling unclear
- No fiscal year/quarter attribution
- Missing refund and chargeback handling

## Industry Best Practice Analysis

### Current Approach Problems
❌ **Dual-table strategy with views**: Overengineered, FK constraint issues  
❌ **CSV-based source tables**: Not aligned with actual API structures  
❌ **Complex environment switching**: Too much refactoring required  
❌ **Fragmented sync process**: Multiple endpoints, no atomicity  

### Recommended Industry Standard: **Staging → Validation → Cutover**

This is the proven approach used by companies like Stripe, Shopify, and other SaaS platforms for major data migrations:

1. **Raw Data Ingestion**: Direct API → Raw staging tables
2. **Data Transformation**: Raw → Business entity staging tables  
3. **Validation**: Comprehensive business rule validation
4. **Atomic Cutover**: Single transaction production replacement

## Proposed Solution: 3-Function Migration Strategy

### Function 1: `sync_raw_api_data()`
**Purpose**: Direct API data ingestion into raw staging tables

**Implementation**:
```sql
CREATE TABLE xendit_raw (
  -- Direct mapping from Xendit API
  id TEXT PRIMARY KEY,
  product_id TEXT,
  type TEXT,
  status TEXT,
  reference_id TEXT,
  currency TEXT,
  amount NUMERIC,
  created TIMESTAMPTZ,
  updated TIMESTAMPTZ,
  business_id TEXT,
  -- API metadata
  api_synced_at TIMESTAMPTZ DEFAULT now(),
  api_response JSONB -- Store full API response
);

CREATE TABLE systemeio_raw (
  -- Direct mapping from Systeme.io API
  id TEXT PRIMARY KEY,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  tags TEXT[], 
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  -- API metadata
  api_synced_at TIMESTAMPTZ DEFAULT now(),
  api_response JSONB -- Store full API response
);
```

**Function Logic**:
1. Call Xendit List Transactions API with pagination
2. Call Systeme.io Contacts API with pagination  
3. Store raw responses in staging tables
4. Return sync statistics and any API errors

### Function 2: `validate_and_prepare_clean_data()`
**Purpose**: Transform raw API data into business entities with validation

**Implementation**:
```sql
CREATE TABLE unified_profiles_staging (
  -- Same structure as current unified_profiles
  -- Plus additional fields for proper attribution
  id UUID PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  first_name TEXT,
  last_name TEXT,
  systemeio_id TEXT,
  systemeio_tags TEXT[],
  acquisition_source TEXT,
  api_source TEXT DEFAULT 'systemeio',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE transactions_staging (
  -- Enhanced structure for proper product tracking
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  xendit_transaction_id TEXT UNIQUE,
  product_type TEXT, -- 'p2p_course', 'canva_ebook'
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'PHP',
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  paid_at TIMESTAMPTZ,
  settled_at TIMESTAMPTZ
);

CREATE TABLE enrollments_staging (
  -- Product-specific enrollment logic
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  course_id UUID, -- For P2P course enrollments
  product_type TEXT NOT NULL, -- 'p2p_course', 'canva_ebook'
  transaction_id UUID REFERENCES transactions_staging(id),
  status TEXT NOT NULL DEFAULT 'active',
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Function Logic**:
1. Transform `systemeio_raw` → `unified_profiles_staging`
2. Transform `xendit_raw` → `transactions_staging` (both P2P and Canva)
3. Generate `enrollments_staging` based on product rules
4. Run comprehensive validation checks
5. Return validation results and error details

### Function 3: `launch_clean_production()`
**Purpose**: Atomic cutover from staging to production

**Function Logic**:
```sql
BEGIN TRANSACTION;
  -- 1. Backup existing data
  CREATE TABLE unified_profiles_backup_[timestamp] AS SELECT * FROM unified_profiles;
  CREATE TABLE transactions_backup_[timestamp] AS SELECT * FROM transactions;
  CREATE TABLE enrollments_backup_[timestamp] AS SELECT * FROM enrollments;
  
  -- 2. Truncate production tables (in dependency order)
  TRUNCATE enrollments CASCADE;
  TRUNCATE transactions CASCADE; 
  TRUNCATE unified_profiles CASCADE;
  
  -- 3. Insert clean data (in dependency order)
  INSERT INTO unified_profiles SELECT * FROM unified_profiles_staging;
  INSERT INTO transactions SELECT * FROM transactions_staging;
  INSERT INTO enrollments SELECT * FROM enrollments_staging;
  
  -- 4. Verify all constraints and relationships
  -- Run validation queries
  
  -- 5. If all validations pass, COMMIT; otherwise ROLLBACK
COMMIT;
```

## Implementation Plan

### Phase 1: Raw API Integration (Week 1)
- [ ] Create `xendit_raw` and `systemeio_raw` tables
- [ ] Implement `sync_raw_api_data()` function
- [ ] Set up API credentials and error handling
- [ ] Test API pagination and rate limiting

### Phase 2: Data Transformation (Week 2)  
- [ ] Create staging tables with proper business logic
- [ ] Implement `validate_and_prepare_clean_data()` function
- [ ] Build product categorization logic (P2P vs Canva)
- [ ] Create comprehensive validation rule set

### Phase 3: Production Cutover (Week 3)
- [ ] Implement `launch_clean_production()` function
- [ ] Create rollback procedures and safety checks
- [ ] Test full pipeline in development environment
- [ ] Document launch day runbook

### Phase 4: Launch Execution (Week 4)
- [ ] Final API sync before launch
- [ ] Execute validation and review results
- [ ] Perform atomic production cutover
- [ ] Verify all systems operational with clean data

## Expected Results

### Data Completeness
- **~6,000+ clean customer profiles** (3,664 P2P + 4,916 Canva - overlaps)
- **~6,136 clean transactions** (3,334 P2P + 2,783 Canva PAID/SETTLED)
- **~6,000+ proper enrollments** (P2P course + Canva ebook access)
- **~10,000+ leads** properly categorized and attributed

### Revenue Recognition
- **₱3,334,000+ P2P course revenue** properly tracked
- **₱2,783,000+ Canva ebook revenue** properly tracked  
- **Complete transaction history** with proper product attribution
- **Fiscal reporting capability** for business intelligence

### System Benefits
- ✅ **Zero test data contamination** in production
- ✅ **Complete product catalog coverage**
- ✅ **Proper customer journey tracking**
- ✅ **Scalable for future product additions**
- ✅ **Industry-standard data architecture**

## Risk Mitigation

### Data Loss Prevention
- Multiple backup strategies before cutover
- Comprehensive validation before production replacement
- Rollback procedures tested and documented

### Business Continuity  
- Minimal downtime during atomic cutover
- All existing functionality preserved
- Customer access uninterrupted

### Future Scalability
- API-first architecture supports new products
- Clean data foundation for advanced analytics
- Proper attribution for marketing optimization

This strategy addresses all identified issues while following industry best practices for major data migrations, ensuring a successful launch with clean, complete, and properly categorized customer data. 