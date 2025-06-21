# Data Unification - Phase 4-0: Dual Environment Implementation

## Task Objective
Implement a dual environment database architecture with `_prod` and `_dev` table versions to ensure clean production data for website launch while maintaining a testing environment. All production data will be sourced exclusively from fresh API calls, not from existing contaminated database tables.

## Current State Assessment
The platform currently has mixed production and test data across all unified tables due to development and testing activities. Key issues identified:

### Contaminated Data Sources
- **ALL database tables contain mixed data**: Including `xendit`, `systemeio`, `unified_profiles`, `transactions`, `enrollments`, `purchase_leads`, `ebook_contacts`, `ecommerce_orders`
- **Only clean source**: Shopify tables (`shopify_orders`, `shopify_order_items`) which are populated via cron API calls
- **Test data contamination**: Cannot be separated from production data in existing tables

### Current Sync Endpoint Issues (/api/admin/dashboard/sync)
Based on investigation, the following issues need to be addressed for industry best practices:

1. **Non-Idempotent Operations**
   - Always sets `updated_at = now()` causing unnecessary database writes
   - Results in false positives for "changed" records on repeated runs
   - Makes monitoring and auditing difficult

2. **Poor Error Handling**
   - Only samples first 10 errors, potentially missing critical issues
   - No systematic error categorization or resolution workflows
   - Limited retry logic for transient failures

3. **Inconsistent Data Validation**
   - Missing business rule validation during sync
   - No data quality checks before insertion
   - Inconsistent handling of null/empty values

4. **Performance Issues**
   - No pagination limits causing potential memory issues
   - Sequential processing instead of optimized batch operations
   - Multiple individual update queries instead of bulk operations

5. **Monitoring and Observability**
   - Limited logging for debugging sync issues
   - No metrics for sync performance or success rates
   - Difficult to track data lineage and changes

## Future State Goal
A production-ready dual environment system with:

1. **Clean Production Environment (`_prod` tables)**
   - Populated exclusively from fresh API calls (Xendit, Systemeio)
   - Zero test data contamination
   - Complete historical data preservation for analytics
   - Industry-standard data quality and validation

2. **Development Environment (`_dev` tables)**
   - Contains clean sync'd data from APIs PLUS existing test/dummy data
   - Safe environment for feature development and testing
   - No impact on production customers
   - Maintains all current testing capabilities

3. **Seamless Environment Switching**
   - Database views that route queries to appropriate environment
   - Admin control for environment selection
   - No endpoint code changes required

4. **Enhanced Sync Process**
   - Idempotent operations with proper change detection
   - Comprehensive error handling and retry logic
   - Performance optimizations and monitoring
   - Industry-standard data validation

## Implementation Plan

### 1. Dual Table Structure Creation

#### Tables Requiring Duplication
Create `_prod` and `_dev` versions for these tables:

**Core Unified Tables:**
- `unified_profiles` → `unified_profiles_prod`, `unified_profiles_dev`
- `transactions` → `transactions_prod`, `transactions_dev`
- `enrollments` → `enrollments_prod`, `enrollments_dev`

**Lead Management Tables:**
- `purchase_leads` → `purchase_leads_prod`, `purchase_leads_dev`
- `ebook_contacts` → `ebook_contacts_prod`, `ebook_contacts_dev`

**E-commerce Tables:**
- `ecommerce_orders` → `ecommerce_orders_prod`, `ecommerce_orders_dev`
- `ecommerce_order_items` → `ecommerce_order_items_prod`, `ecommerce_order_items_dev`

**User Attribution Tables:**
- `user_tags` → `user_tags_prod`, `user_tags_dev` (note: `user_tags_prod` already exists)

**New Unified Lead Table:**
- `leads_profiles_prod`, `leads_profiles_dev` (consolidates all lead sources)

#### Schema Specifications

**unified_profiles_prod/dev Structure:**
```sql
CREATE TABLE unified_profiles_prod (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL UNIQUE,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  tags TEXT[],
  acquisition_source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Additional fields from existing schema
  status TEXT NOT NULL DEFAULT 'active',
  admin_metadata JSONB DEFAULT '{}',
  last_login_at TIMESTAMPTZ,
  login_count INTEGER DEFAULT 0,
  email_bounced BOOLEAN NOT NULL DEFAULT false,
  email_spam_complained BOOLEAN DEFAULT false,
  email_last_spam_at TIMESTAMPTZ,
  email_marketing_subscribed BOOLEAN NOT NULL DEFAULT true,
  affiliate_id UUID REFERENCES affiliates(id),
  affiliate_general_status affiliate_status,
  membership_level_id UUID REFERENCES membership_levels(id),
  is_student BOOLEAN NOT NULL DEFAULT false,
  is_affiliate BOOLEAN NOT NULL DEFAULT false,
  is_admin BOOLEAN NOT NULL DEFAULT false,
  tier_assignment_notes TEXT,
  
  -- API sync metadata for tracking
  api_source TEXT NOT NULL DEFAULT 'systemeio',
  last_api_sync_at TIMESTAMPTZ,
  api_sync_version INTEGER DEFAULT 1
);
```

**transactions_prod/dev Structure:**
```sql
CREATE TABLE transactions_prod (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'PHP',
  status TEXT NOT NULL DEFAULT 'pending',
  payment_method TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  transaction_type TEXT NOT NULL DEFAULT 'unknown',
  external_id TEXT UNIQUE,
  paid_at TIMESTAMPTZ,
  settled_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  metadata JSONB,
  contact_email TEXT,
  
  -- API sync metadata
  api_source TEXT NOT NULL DEFAULT 'xendit',
  last_api_sync_at TIMESTAMPTZ,
  api_sync_version INTEGER DEFAULT 1,
  
  -- Time-sensitive data for analytics
  original_created_at TIMESTAMPTZ, -- Preserve original API timestamp
  processed_at TIMESTAMPTZ DEFAULT now(), -- When we processed this record
  fiscal_year INTEGER, -- For financial reporting
  fiscal_quarter INTEGER -- For quarterly analytics
);
```

**enrollments_prod/dev Structure:**
```sql
CREATE TABLE enrollments_prod (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES unified_profiles_prod(id),
  course_id UUID NOT NULL REFERENCES courses(id),
  transaction_id UUID REFERENCES transactions_prod(id),
  status TEXT NOT NULL,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  last_accessed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  
  -- API sync metadata
  last_api_sync_at TIMESTAMPTZ,
  api_sync_version INTEGER DEFAULT 1,
  
  -- Time-sensitive data for analytics
  original_enrolled_at TIMESTAMPTZ, -- Preserve original enrollment date
  cohort_month TEXT, -- For cohort analysis (YYYY-MM)
  cohort_quarter TEXT, -- For quarterly cohort analysis (YYYY-Q1)
  
  UNIQUE(user_id, course_id)
);
```

**leads_profiles_prod/dev Structure (New Unified Lead Table):**
```sql
CREATE TABLE leads_profiles_prod (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  lead_source TEXT NOT NULL, -- 'purchase_leads', 'ebook_contacts', 'systemeio'
  product_interest TEXT, -- 'P2P', 'Canva', 'General'
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'converted', 'bounced'
  conversion_status TEXT, -- 'unconverted', 'converted_to_customer'
  converted_user_id UUID REFERENCES unified_profiles_prod(id),
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  source_page TEXT,
  metadata JSONB DEFAULT '{}',
  
  -- Time-sensitive data for analytics
  first_contact_at TIMESTAMPTZ NOT NULL,
  last_activity_at TIMESTAMPTZ,
  converted_at TIMESTAMPTZ,
  lead_score INTEGER DEFAULT 0,
  funnel_stage TEXT DEFAULT 'awareness', -- For funnel analysis
  
  -- API sync metadata
  api_source TEXT NOT NULL,
  last_api_sync_at TIMESTAMPTZ,
  api_sync_version INTEGER DEFAULT 1,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### Read-Only Source Tables (No Duplication Needed)
These tables remain as single sources:
- `shopify_orders` (already clean via cron API)
- `shopify_order_items` (already clean via cron API)
- `shopify_customers` (already clean via cron API)
- `shopify_products` (already clean via cron API)

### 2. Environment Configuration System

#### Environment Settings Table
```sql
CREATE TABLE environment_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert default setting
INSERT INTO environment_settings (setting_key, setting_value, description)
VALUES ('active_environment', 'development', 'Current active environment: production or development');
```

#### Environment Helper Functions
```sql
-- Function to get current environment
CREATE OR REPLACE FUNCTION get_active_environment()
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT setting_value 
    FROM environment_settings 
    WHERE setting_key = 'active_environment'
  );
END;
$$ LANGUAGE plpgsql;

-- Function to switch environment (admin only)
CREATE OR REPLACE FUNCTION set_active_environment(env TEXT, admin_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Validate environment value
  IF env NOT IN ('production', 'development') THEN
    RAISE EXCEPTION 'Invalid environment. Must be "production" or "development"';
  END IF;
  
  -- Validate admin user
  IF NOT EXISTS (
    SELECT 1 FROM unified_profiles 
    WHERE id = admin_user_id AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'User is not authorized to change environment';
  END IF;
  
  -- Update environment
  UPDATE environment_settings 
  SET setting_value = env, 
      updated_by = admin_user_id,
      updated_at = now()
  WHERE setting_key = 'active_environment';
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;
```

### 3. Database Views Implementation

Create views that automatically route to the correct environment without requiring any code changes:

```sql
-- Function to get table suffix based on environment
CREATE OR REPLACE FUNCTION get_table_suffix()
RETURNS TEXT AS $$
BEGIN
  CASE get_active_environment()
    WHEN 'production' THEN RETURN '_prod';
    ELSE RETURN '_dev';
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- Unified Profiles View (No Code Changes Required)
CREATE OR REPLACE VIEW unified_profiles AS
SELECT * FROM unified_profiles_dev WHERE get_active_environment() = 'development'
UNION ALL
SELECT * FROM unified_profiles_prod WHERE get_active_environment() = 'production';

-- Transactions View (No Code Changes Required)
CREATE OR REPLACE VIEW transactions AS
SELECT * FROM transactions_dev WHERE get_active_environment() = 'development'
UNION ALL
SELECT * FROM transactions_prod WHERE get_active_environment() = 'production';

-- Enrollments View (No Code Changes Required)
CREATE OR REPLACE VIEW enrollments AS
SELECT * FROM enrollments_dev WHERE get_active_environment() = 'development'
UNION ALL
SELECT * FROM enrollments_prod WHERE get_active_environment() = 'production';

-- Additional views for other duplicated tables...
```

**Critical Benefit**: All existing code continues to work without any modifications. Queries to `unified_profiles`, `transactions`, `enrollments` etc. automatically route to the correct environment based on the admin setting.

### 4. API Integration Strategy

#### Clean Data Sources and API Endpoints

**Xendit API Integration:**
- **Endpoint**: Xendit Invoices API (`https://api.xendit.co/v2/invoices`)
- **Authentication**: Basic Auth with API Key (stored in environment variables)
- **Data Scope**: All PAID/SETTLED invoices for "Papers to Profits Learning Fee" and "Canva Ebook"
- **Rate Limiting**: Respect Xendit API limits (1000 requests/minute)
- **Historical Data**: Fetch ALL historical transactions since June 2024
- **Time-sensitive Fields**: Preserve original `created`, `paid_at`, `settled_at` timestamps
- **Product Types**: Handle both "Papers to Profits Learning Fee" and "Canva Ebook" transactions

**Systemeio API Integration:**
- **Endpoint**: Systemeio Contacts API (`https://api.systeme.io/api/contacts`)
- **Authentication**: API Key header (stored in environment variables)
- **Data Scope**: All contacts with PaidP2P and PaidCANVA tags + all lead contacts for unification
- **Rate Limiting**: Respect Systemeio API limits (varies by plan, typically 1000-5000/hour)
- **Historical Data**: Fetch ALL contacts with registration dates since June 2024
- **Time-sensitive Fields**: Preserve original registration dates, tag assignment dates
- **Product Tagging**: Extract "PaidP2P" (requires user accounts) and "PaidCANVA" (email delivery only)

#### API Call Implementation Requirements

**Xendit API Specifications:**
```typescript
interface XenditInvoiceRequest {
  endpoint: 'https://api.xendit.co/v2/invoices';
  method: 'GET';
  headers: {
    'Authorization': string; // `Basic ${base64(XENDIT_SECRET_KEY)}`
    'Content-Type': 'application/json';
  };
  parameters: {
    limit: number; // Maximum 100 per request - MUST handle 1000+ records with pagination
    offset: number; // For pagination - increment by 100 for each batch
    statuses: string[]; // ['PAID', 'SETTLED']
    created_after: string; // ISO 8601 format, start from June 2024
    created_before: string; // Current timestamp
  };
}
}

// Required fields to extract for analytics
interface XenditInvoiceResponse {
  id: string; // External ID
  amount: number;
  currency: string;
  status: string;
  description: string;
  payer_email: string;
  created: string; // ISO 8601 timestamp
  paid_at: string; // ISO 8601 timestamp
  payment_method: string;
  // Additional fields for analytics
}
```

**Systemeio API Specifications:**
```typescript
interface SystemeioContactRequest {
  endpoint: 'https://api.systeme.io/api/contacts';
  method: 'GET';
  headers: {
    'X-API-Key': string; // SYSTEMEIO_API_KEY
    'Content-Type': 'application/json';
  };
  parameters: {
    page: number; // Starting from 1 - iterate through ALL pages to handle 14k+ contacts
    per_page: number; // Maximum 100 per page - handle large datasets with pagination
    include_tags: boolean; // true
    include_custom_fields: boolean; // true
    created_after: string; // YYYY-MM-DD format, start from June 2024
    created_before: string; // Current date
  };
}

// Required fields to extract
interface SystemeioContactResponse {
  email: string;
  first_name: string;
  last_name: string;
  tags: string[]; // Array of tag names
  created_at: string; // ISO 8601 timestamp
  custom_fields: Record<string, any>; // Additional data
  // Additional fields for lead scoring
}
```

### 5. Enhanced Sync Process Design

#### New Sync Endpoint Architecture

**Primary Clean Sync Endpoint: `/api/admin/dashboard/sync-clean`**

**Industry Best Practices to Implement:**

1. **Idempotent Operations**
   ```typescript
   // Example change detection logic
   function hasDataChanged(existing: Record<string, any>, incoming: Record<string, any>): boolean {
     const relevantFields = ['email', 'first_name', 'last_name', 'amount', 'status'];
     return relevantFields.some(field => 
       normalizeValue(existing[field]) !== normalizeValue(incoming[field])
     );
   }
   
   // Only update when actual changes detected
   if (hasDataChanged(existingRecord, incomingRecord)) {
     await updateRecord({ ...incomingRecord, updated_at: new Date() });
   }
   ```

2. **Comprehensive Error Handling**
   ```typescript
   interface SyncError {
     type: 'api' | 'validation' | 'database' | 'business_rule';
     severity: 'low' | 'medium' | 'high' | 'critical';
     entity_id: string;
     entity_type: string;
     error_message: string;
     error_details: Record<string, any>;
     retry_count: number;
     timestamp: Date;
   }
   
   // Store ALL errors, not just samples
   const errorLog: SyncError[] = [];
   ```

3. **Data Validation Framework**
   ```typescript
   interface ValidationRule {
     field: string;
     required: boolean;
     type: 'email' | 'phone' | 'currency' | 'timestamp';
     customValidator?: (value: any) => boolean;
     errorMessage: string;
   }
   
   const profileValidationRules: ValidationRule[] = [
     { field: 'email', required: true, type: 'email', errorMessage: 'Valid email required' },
     { field: 'first_name', required: false, type: 'string', errorMessage: 'First name must be string' }
   ];
   ```

4. **Performance Optimizations**
   ```typescript
   // Bulk operations instead of individual queries
   async function bulkUpsertProfiles(profiles: Profile[]): Promise<UpsertResult> {
     const batchSize = 100;
     const results = { inserted: 0, updated: 0, errors: [] };
     
     for (let i = 0; i < profiles.length; i += batchSize) {
       const batch = profiles.slice(i, i + batchSize);
       try {
         const result = await supabase
           .from(getTableName('unified_profiles'))
           .upsert(batch, { onConflict: 'id' });
         results.inserted += result.data?.length || 0;
       } catch (error) {
         results.errors.push(...batch.map(p => ({ profile_id: p.id, error })));
       }
     }
     
     return results;
   }
   ```

5. **Monitoring and Observability**
   ```typescript
   interface SyncMetrics {
     session_id: string;
     start_time: Date;
     end_time: Date;
     api_calls_made: number;
     records_processed: number;
     records_inserted: number;
     records_updated: number;
     records_skipped: number;
     errors_encountered: number;
     performance_metrics: {
       avg_api_response_time: number;
       total_processing_time: number;
       memory_usage_peak: number;
     };
   }
   ```

#### Enhanced Sync Process Flow

**Step 1: Environment and Security Validation**
- [ ] Verify target environment (`_prod` or `_dev`)
- [ ] Check admin permissions for production sync
- [ ] Validate all API credentials and test connectivity
- [ ] Create sync session ID for tracking

**Step 2: Historical Data Preservation Setup**
- [ ] Create snapshot metadata for current data state
- [ ] Record sync session start time and parameters
- [ ] Set up error logging and metrics collection
- [ ] Prepare rollback procedures

**Step 3: Clean API Data Extraction**
- [ ] **Xendit API**: Paginate through ALL historical invoice data
  - Start from configurable historical date (default: 2020-01-01)
  - Filter for PAID/SETTLED status only
  - Include Papers to Profits and Canva Ebook transactions
  - Implement exponential backoff for rate limiting
  - Preserve all original timestamps for analytics

- [ ] **Systemeio API**: Paginate through ALL contact data
  - Start from configurable historical date (default: 2020-01-01)
  - Include all contacts (both converted and leads)
  - Extract tags for PaidP2P identification
  - Implement linear backoff for rate limiting
  - Preserve registration dates and tag assignments

**Step 4: Data Transformation and Validation**
- [ ] **Email Normalization**: Lowercase, trim, validate format
- [ ] **Timestamp Conversion**: Convert all to UTC ISO 8601 format
- [ ] **Status Mapping**: 
  - Xendit: PAID/SETTLED → 'completed', UNPAID → 'pending', EXPIRED → 'expired'
  - Systemeio: PaidP2P tag → customer, others → leads
- [ ] **Business Rule Validation**: Apply all validation rules before processing
- [ ] **Analytics Field Calculation**: Add fiscal periods, cohort groupings

**Step 5: Auth User Management**
- [ ] Extract all unique emails from both API sources
- [ ] Check existing Auth users via paginated API calls
- [ ] Create Auth users for missing emails with:
  - Default password: 'graceful2025'
  - Email confirmed: true
  - Proper error handling for duplicates

**Step 6: Idempotent Data Loading**
- [ ] **unified_profiles**: Compare with existing, only update changed records
- [ ] **transactions**: CRITICAL - Use external_id for deduplication, update only changes
  - Papers to Profits transactions → Create user accounts + enrollments
  - Canva Ebook transactions → Email delivery only, no user accounts required
  - All transactions preserved for future new site operations (direct integration)
- [ ] **enrollments**: Create ONLY from completed P2P transactions, avoid duplicates
- [ ] **leads_profiles**: Unify from all lead sources, track conversion status

**Step 7: Reference Data and Attribution**
- [ ] Link transactions to profiles via normalized email matching
- [ ] Generate enrollments from completed P2P transactions only
- [ ] Update Shopify order attributions via email matching
- [ ] Sync user tags and segmentation data

**Step 8: Data Quality Validation**
- [ ] Run comprehensive validation queries
- [ ] Check referential integrity across all tables
- [ ] Validate business rule compliance
- [ ] Generate data quality score and report

**Step 9: Sync Completion and Reporting**
- [ ] Update sync session with final metrics
- [ ] Generate comprehensive sync report
- [ ] Alert on any critical errors or data quality issues
- [ ] Update last sync timestamps for incremental future syncs

### 6. Time-Sensitive Data Strategy for Historical Analytics

#### Critical Time-Based Fields to Preserve

**For Financial Analytics:**
- Original transaction timestamps from Xendit API (created, paid_at, settled_at)
- Fiscal year and quarter calculations (based on business calendar)
- Currency exchange rates at time of transaction (for multi-currency analysis)
- Seasonality markers (holiday seasons, back-to-school, etc.)

**For Cohort Analytics:**
- Original registration dates from Systemeio API
- Enrollment dates from transaction completion
- Cohort groupings by month/quarter for lifecycle analysis
- Customer journey stage timestamps

**For Marketing Analytics:**
- Lead capture timestamps from all sources
- Campaign attribution data with proper attribution windows
- Conversion funnel timestamps (lead → trial → customer)
- Source/medium tracking with temporal context

#### Analytics Schema Enhancements

**Time-Series Data Storage:**
```sql
-- Add analytics metadata to transaction tables
ALTER TABLE transactions_prod ADD COLUMN analytics_metadata JSONB DEFAULT '{}';

-- Example analytics metadata structure:
{
  "fiscal_year": 2024,
  "fiscal_quarter": "Q1",
  "cohort_month": "2024-01",
  "days_since_registration": 45,
  "seasonal_marker": "holiday_season",
  "attribution_data": {
    "original_source": "facebook_ads",
    "attribution_window_days": 7,
    "touchpoint_sequence": ["facebook", "email", "direct"],
    "campaign_id": "spring_2024_p2p"
  },
  "conversion_metrics": {
    "lead_to_trial_days": 3,
    "trial_to_customer_days": 7,
    "total_conversion_days": 10
  }
}
```

**Historical Snapshot Tables:**
```sql
CREATE TABLE sync_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_session_id UUID NOT NULL,
  environment TEXT NOT NULL, -- 'production' or 'development'
  table_name TEXT NOT NULL,
  snapshot_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  record_count INTEGER,
  data_hash TEXT, -- For change detection between syncs
  quality_score NUMERIC, -- Data quality percentage
  sync_metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE sync_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  environment TEXT NOT NULL,
  sync_type TEXT NOT NULL, -- 'full', 'incremental', 'api_only'
  started_by UUID REFERENCES auth.users(id),
  start_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_time TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running', -- 'running', 'completed', 'failed', 'cancelled'
  total_api_calls INTEGER DEFAULT 0,
  total_records_processed INTEGER DEFAULT 0,
  total_records_changed INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  performance_metrics JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 7. API Implementation Specifications

#### Required Environment Variables
```bash
# Xendit API Configuration
XENDIT_SECRET_KEY=xnd_development_... # or xnd_production_...
XENDIT_API_BASE_URL=https://api.xendit.co
XENDIT_RATE_LIMIT_PER_MINUTE=1000

# Systemeio API Configuration  
SYSTEMEIO_API_KEY=sys_... 
SYSTEMEIO_API_BASE_URL=https://api.systeme.io
SYSTEMEIO_RATE_LIMIT_PER_HOUR=5000

# Historical Data Configuration
API_SYNC_START_DATE=2024-06-01
API_SYNC_BATCH_SIZE=100
API_SYNC_MAX_RETRIES=5

# Environment Control
DEFAULT_ENVIRONMENT=development
ALLOW_PRODUCTION_SYNC=false # Set to true only for authorized deployments
```

#### Enhanced Sync Endpoints Implementation

**Primary Sync Endpoint: `/api/admin/dashboard/sync-clean`**
```typescript
interface SyncCleanRequest {
  environment: 'production' | 'development';
  syncType: 'full' | 'incremental';
  dataSources: ('xendit' | 'systemeio')[];
  options: {
    startDate?: string; // Override default historical start date
    dryRun?: boolean; // Validate without making changes
    forceRefresh?: boolean; // Ignore last sync timestamps
  };
}

interface SyncCleanResponse {
  success: boolean;
  sessionId: string;
  environment: string;
  summary: {
    totalRecordsProcessed: number;
    profilesUpserted: number;
    transactionsUpserted: number;
    enrollmentsCreated: number;
    leadsUnified: number;
    errorsEncountered: number;
  };
  performance: {
    totalDuration: number; // milliseconds
    apiCallCount: number;
    avgApiResponseTime: number;
  };
  dataQuality: {
    overallScore: number; // percentage
    validationResults: ValidationResult[];
  };
  errors: SyncError[];
  nextRecommendedSync: string; // ISO timestamp
}
```

**Modular Sync Endpoints:**
- `/api/admin/dashboard/sync-xendit` - Xendit transactions only
- `/api/admin/dashboard/sync-systemeio` - Systemeio profiles and leads
- `/api/admin/dashboard/sync-leads` - Lead unification across all sources
- `/api/admin/dashboard/sync-enrollments` - Enrollment generation from transactions
- `/api/admin/dashboard/sync-shopify-attribution` - Link Shopify orders to profiles

**Environment Control Endpoints:**
- `/api/admin/dashboard/environment/status` - Get current environment and health
- `/api/admin/dashboard/environment/switch` - Switch environments (admin only)
- `/api/admin/dashboard/environment/validate` - Validate environment data integrity

#### API Pagination for Large Datasets (1000+ Records)

**Xendit Pagination Implementation:**
```typescript
async function fetchAllXenditInvoices(startDate: string): Promise<any[]> {
  const allInvoices: any[] = [];
  const batchSize = 100; // Xendit maximum
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const response = await callXenditAPI('/v2/invoices', {
      limit: batchSize,
      offset: offset,
      statuses: ['PAID', 'SETTLED'],
      created_after: startDate
    });

    allInvoices.push(...response.data);
    hasMore = response.has_more || response.data.length === batchSize;
    offset += batchSize;

    // Rate limiting: 1000 requests/minute = ~16 requests/second
    await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay
  }

  console.log(`Fetched ${allInvoices.length} total invoices from Xendit`);
  return allInvoices;
}
```

**Systemeio Pagination Implementation:**
```typescript
async function fetchAllSystemeioContacts(startDate: string): Promise<any[]> {
  const allContacts: any[] = [];
  const perPage = 100; // Systemeio maximum
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const response = await callSystemeioAPI('/api/contacts', {
      page: page,
      per_page: perPage,
      include_tags: true,
      include_custom_fields: true,
      created_after: startDate
    });

    allContacts.push(...response.data);
    hasMore = response.data.length === perPage;
    page++;

    // Rate limiting: 5000 requests/hour = ~1.4 requests/second
    await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
  }

  console.log(`Fetched ${allContacts.length} total contacts from Systemeio`);
  return allContacts;
}
```

#### API Rate Limiting and Error Handling

**Xendit API Error Handling:**
```typescript
async function callXenditAPI(endpoint: string, params: any, retryCount = 0): Promise<any> {
  try {
    const response = await fetch(`${XENDIT_API_BASE_URL}${endpoint}`, {
      headers: {
        'Authorization': `Basic ${Buffer.from(XENDIT_SECRET_KEY + ':').toString('base64')}`,
        'Content-Type': 'application/json'
      },
      method: 'GET'
    });

    if (response.status === 429) {
      // Rate limit hit - exponential backoff
      const delay = Math.min(1000 * Math.pow(2, retryCount), 30000);
      await new Promise(resolve => setTimeout(resolve, delay));
      return callXenditAPI(endpoint, params, retryCount + 1);
    }

    if (!response.ok) {
      throw new Error(`Xendit API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    if (retryCount < API_SYNC_MAX_RETRIES) {
      const delay = 1000 * (retryCount + 1);
      await new Promise(resolve => setTimeout(resolve, delay));
      return callXenditAPI(endpoint, params, retryCount + 1);
    }
    throw error;
  }
}
```

**Systemeio API Error Handling:**
```typescript
async function callSystemeioAPI(endpoint: string, params: any, retryCount = 0): Promise<any> {
  try {
    const response = await fetch(`${SYSTEMEIO_API_BASE_URL}${endpoint}`, {
      headers: {
        'X-API-Key': SYSTEMEIO_API_KEY,
        'Content-Type': 'application/json'
      },
      method: 'GET'
    });

    if (response.status === 429) {
      // Rate limit hit - linear backoff for Systemeio
      const delay = 60000; // Wait 1 minute for rate limit reset
      await new Promise(resolve => setTimeout(resolve, delay));
      return callSystemeioAPI(endpoint, params, retryCount + 1);
    }

    if (!response.ok) {
      throw new Error(`Systemeio API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    if (retryCount < API_SYNC_MAX_RETRIES) {
      const delay = 5000 * (retryCount + 1); // Linear backoff
      await new Promise(resolve => setTimeout(resolve, delay));
      return callSystemeioAPI(endpoint, params, retryCount + 1);
    }
    throw error;
  }
}
```

### 8. Data Migration Implementation Steps

#### Step 1: Infrastructure Preparation
- [ ] **Database Backup**: Create full backup of current database state
- [ ] **Schema Documentation**: Export all current table schemas and constraints
- [ ] **Staging Environment**: Set up complete staging environment for testing
- [ ] **API Testing**: Validate API credentials and connectivity in staging
- [ ] **Rollback Procedures**: Prepare and test rollback scripts

#### Step 2: Dual Table Creation
- [ ] **Create Production Tables**: All `_prod` variants with proper schemas (initially empty)
- [ ] **Create Development Tables**: All `_dev` variants with identical schemas
- [ ] **Copy Current Data**: Migrate ALL existing data to `_dev` tables (preserves test data)
- [ ] **Set Up Constraints**: Foreign keys, indexes, and business rule constraints
- [ ] **Validate Structure**: Ensure table structures match specifications

#### Step 2.5: Data Strategy Implementation
- [ ] **Production Tables**: Will contain ONLY clean API sync'd data (no test data)
- [ ] **Development Tables**: Will contain clean API sync'd data PLUS existing test/dummy data
- [ ] **Sync Strategy**: When syncing, write clean data to BOTH environments
- [ ] **Data Isolation**: Production stays clean, development maintains testing capabilities

#### Step 3: Environment Control Implementation
- [ ] **Environment Settings**: Create environment_settings table and functions
- [ ] **Admin Controls**: Implement admin endpoints for environment switching
- [ ] **Security Validation**: Ensure only authorized users can switch to production
- [ ] **Audit Logging**: Log all environment changes with user attribution

#### Step 4: API Integration Development
- [ ] **Xendit Integration**: Implement historical data extraction with pagination
- [ ] **Systemeio Integration**: Implement contact data extraction with lead tracking
- [ ] **Error Handling**: Comprehensive retry logic and error categorization
- [ ] **Rate Limiting**: Proper throttling to respect API limits
- [ ] **Data Validation**: Business rule validation before database insertion

#### Step 5: Enhanced Sync Process Implementation
- [ ] **Sync Orchestration**: Main sync endpoint with comprehensive error handling
- [ ] **Idempotent Operations**: Change detection and minimal update logic
- [ ] **Performance Optimization**: Bulk operations and memory management
- [ ] **Monitoring**: Detailed logging and metrics collection
- [ ] **Data Quality**: Validation and quality scoring

#### Step 6: Testing and Validation
- [ ] **Unit Testing**: Test all API integrations and data transformation logic
- [ ] **Integration Testing**: Full sync process testing in staging environment
- [ ] **Performance Testing**: Load testing with production-scale data volumes
- [ ] **Data Quality Testing**: Validate data integrity and business rule compliance
- [ ] **Security Testing**: Validate access controls and environment isolation

#### Step 7: Production Deployment
- [ ] **Clean Production Sync**: Initial sync of all historical data to `_prod` tables
- [ ] **Data Validation**: Comprehensive validation of production data quality
- [ ] **Environment Testing**: Validate switching between environments
- [ ] **Monitoring Setup**: Deploy monitoring and alerting for production syncs
- [ ] **Documentation**: Complete documentation and runbooks

### 9. Testing and Validation Strategy

#### Unit Testing Requirements
```typescript
// Example test cases that must be implemented
describe('API Integration Tests', () => {
  test('Xendit API pagination handles large datasets correctly');
  test('Systemeio API respects rate limits and retries appropriately');
  test('Email normalization produces consistent results');
  test('Data validation catches all business rule violations');
  test('Error handling categorizes and logs errors properly');
});

describe('Data Transformation Tests', () => {
  test('Timestamp conversion preserves original times accurately');
  test('Status mapping produces correct normalized values');
  test('Analytics metadata calculation is accurate');
  test('Cohort grouping logic handles edge cases');
});

describe('Environment Switching Tests', () => {
  test('Environment switching updates all queries correctly');
  test('Admin authorization prevents unauthorized environment changes');
  test('Table routing works correctly for all environments');
});
```

#### Integration Testing Requirements
- [ ] **Full Sync Testing**: Complete sync process with staging API data
- [ ] **Incremental Sync Testing**: Validate incremental updates work correctly
- [ ] **Error Recovery Testing**: Test sync recovery from various failure scenarios
- [ ] **Environment Isolation**: Ensure dev and prod environments are truly isolated
- [ ] **Performance Testing**: Validate sync performance with large datasets

#### Data Quality Testing Requirements
```sql
-- Example validation queries that must pass
-- Data completeness
SELECT COUNT(*) FROM unified_profiles_prod WHERE email IS NULL; -- Should be 0

-- Referential integrity  
SELECT COUNT(*) FROM transactions_prod t 
WHERE t.user_id NOT IN (SELECT id FROM unified_profiles_prod); -- Should be 0

-- Business rule compliance
SELECT COUNT(*) FROM enrollments_prod e
JOIN transactions_prod t ON e.transaction_id = t.id
WHERE t.status != 'completed'; -- Should be 0

-- Data consistency
SELECT COUNT(*) FROM unified_profiles_prod 
WHERE email NOT SIMILAR TO '%@%.%'; -- Should be 0
```

### 10. Security and Access Control

#### API Security Requirements
- [ ] **Credential Management**: Store all API keys in secure environment variables
- [ ] **HTTPS Only**: All API communications must use HTTPS
- [ ] **Request Logging**: Log all API requests for audit purposes
- [ ] **Error Sanitization**: Ensure API keys never appear in logs or responses

#### Environment Access Control
- [ ] **Admin-Only Production**: Only admin users can sync to production environment
- [ ] **Audit Trail**: Log all environment switches with user identification
- [ ] **Role-Based Access**: Implement proper role-based access controls
- [ ] **IP Restrictions**: Consider IP restrictions for production sync operations

#### Data Protection
- [ ] **Encryption at Rest**: Ensure database encryption is enabled
- [ ] **Encryption in Transit**: All data transfers must be encrypted
- [ ] **PII Handling**: Proper handling of personally identifiable information
- [ ] **Data Retention**: Implement proper data retention policies

### 11. Monitoring and Alerting Implementation

#### Key Metrics to Monitor
```typescript
interface SyncMonitoringMetrics {
  // Success/Failure Rates
  syncSuccessRate: number; // percentage
  apiCallSuccessRate: number; // percentage
  dataQualityScore: number; // percentage
  
  // Performance Metrics
  avgSyncDuration: number; // milliseconds
  avgApiResponseTime: number; // milliseconds
  recordsProcessedPerSecond: number;
  memoryUsagePeak: number; // bytes
  
  // Business Metrics
  newCustomersIdentified: number;
  revenueAttributed: number;
  leadConversionRate: number;
  
  // Error Metrics
  criticalErrorCount: number;
  apiTimeoutCount: number;
  validationErrorCount: number;
}
```

#### Alerting Rules
- [ ] **Critical Alerts**: Sync failures, API connectivity issues, data corruption
- [ ] **Warning Alerts**: High error rates, performance degradation, data quality issues
- [ ] **Info Alerts**: Successful syncs, environment switches, large data changes

#### Dashboard Requirements
- [ ] **Real-time Sync Status**: Current sync progress and health
- [ ] **Historical Performance**: Trends and patterns over time
- [ ] **Data Quality Metrics**: Quality scores and validation results
- [ ] **Environment Status**: Current environment and recent changes

### 12. Documentation and Knowledge Transfer

#### Required Documentation
- [ ] **API Integration Guide**: Complete setup and configuration instructions
- [ ] **Environment Management Guide**: How to switch and manage environments
- [ ] **Troubleshooting Guide**: Common issues and their solutions
- [ ] **Data Lineage Documentation**: Complete data flow and transformation documentation
- [ ] **Security Procedures**: Access control and security requirements

#### Training Materials
- [ ] **Admin Training**: Environment management and production sync procedures
- [ ] **Developer Training**: Working with dual environments and API integrations
- [ ] **Emergency Procedures**: Data recovery and incident response procedures
- [ ] **Performance Tuning**: Optimization techniques and best practices

## Completion Criteria

### Phase 1 Completion (Infrastructure)
- [ ] All dual tables created with identical schemas
- [ ] Environment switching system fully implemented and tested
- [ ] Current data successfully preserved in `_dev` tables
- [ ] Database views or routing logic working correctly
- [ ] Admin controls for environment management implemented

### Phase 2 Completion (Clean Data Migration)
- [ ] API integrations fully functional with proper error handling
- [ ] Production tables populated with 100% clean data from APIs
- [ ] All historical data preserved with proper time-sensitive fields
- [ ] Data validation rules enforced and quality scores above 95%
- [ ] Lead unification completed across all sources

### Phase 3 Completion (System Integration)
- [ ] All existing endpoints working seamlessly with both environments
- [ ] Comprehensive monitoring and alerting implemented
- [ ] Performance optimization completed and validated
- [ ] Complete documentation and training materials delivered
- [ ] Production readiness validation completed

## Risk Mitigation

### High-Risk Areas and Mitigation Strategies

1. **Data Loss Prevention**
   - Multiple backup strategies at each phase
   - Rollback procedures tested and validated
   - Staging environment mirrors production setup
   - All changes reversible with clear procedures

2. **API Rate Limiting and Failures**
   - Exponential backoff with maximum retry limits
   - Graceful degradation for partial API failures
   - Alternative data sources when possible
   - Clear error reporting and manual override options

3. **Environment Confusion**
   - Clear visual indicators in admin interfaces
   - Audit logging for all environment changes
   - Admin-only access to production environment switching
   - Confirmation dialogs for critical operations

4. **Performance Impact**
   - Resource monitoring during sync operations
   - Bulk operations to minimize database load
   - Off-peak scheduling for large syncs
   - Circuit breakers for resource protection

### Rollback Procedures

1. **Complete Database Rollback**
   - Restore from pre-implementation backup
   - Validate data integrity after restoration
   - Update application configuration if needed

2. **Environment Reset**
   - Switch back to development environment
   - Validate existing functionality
   - Investigate issues without production impact

3. **Partial Table Rollback**
   - Restore specific tables from backup
   - Maintain referential integrity
   - Update related tables as needed

4. **API Integration Fallback**
   - Disable API sync and use table-based sync temporarily
   - Implement manual data validation procedures
   - Plan for API issue resolution

## Success Metrics

### Technical Success Metrics
- [ ] **100% Clean Production Data**: Zero test records in production environment
- [ ] **Sync Reliability**: >99% success rate for sync operations
- [ ] **Data Quality**: >95% data quality score maintained
- [ ] **Performance**: Sync operations complete within acceptable time limits
- [ ] **Zero Downtime**: No service interruption during implementation

### Business Success Metrics
- [ ] **Customer Data Integrity**: All customer records properly migrated and linked
- [ ] **Revenue Attribution**: Complete transaction history preserved and linked
- [ ] **Lead Tracking**: Full lead-to-customer conversion tracking implemented
- [ ] **Analytics Readiness**: Historical data preserved for business intelligence
- [ ] **Compliance**: All data handling meets privacy and security requirements

## Next Steps

1. **Stakeholder Review**: Review this build note with all relevant stakeholders
2. **Resource Allocation**: Assign development resources and timeline
3. **Staging Setup**: Prepare staging environment for implementation and testing
4. **API Credentials**: Obtain and secure all necessary API credentials
5. **Implementation Start**: Begin with Phase 1 (Infrastructure) implementation

---

> **Critical Success Factors**: 
> - **Zero Production Data Contamination**: Only clean API data in production
> - **Complete Historical Preservation**: All time-sensitive data for analytics maintained
> - **Seamless Environment Switching**: No code changes required for existing endpoints
> - **Industry-Standard Reliability**: Comprehensive error handling and monitoring
> - **100% Rollback Capability**: Safe and tested rollback procedures at every step

> **Implementation Notes for Junior Developer**:
> - Test every component in staging before production deployment
> - Never test directly with production API keys or production database
> - Always validate data integrity after each major step
> - Document any deviations from this plan and get approval before proceeding
> - Ask for help if any step is unclear rather than making assumptions