# 🏭 **AFFILIATE PAYOUT SYSTEM - COMPLETE DEVELOPER DOCUMENTATION**

**Version:** 1.0  
**Last Updated:** January 2025  
**Maintainer:** Development Team  

---

## 📋 **TABLE OF CONTENTS**

1. [System Overview](#system-overview)
2. [Complete Process Flow](#complete-process-flow)  
3. [Database Schema](#database-schema)
4. [Auto-Flagging Analysis](#auto-flagging-analysis)
5. [Batch Automation Recommendations](#batch-automation-recommendations)
6. [UI Architecture Audit](#ui-architecture-audit)
7. [Industry Best Practices](#industry-best-practices)
8. [API Endpoints & Code References](#api-endpoints--code-references)

---

## 🎯 **SYSTEM OVERVIEW**

The Affiliate Payout System is a comprehensive platform that handles the complete lifecycle from affiliate link clicks to payout disbursement. The system processes conversions, applies fraud detection, manages batch payouts, and integrates with Xendit for payment processing.

### **Key Components:**
- **Conversion Tracking:** Records affiliate-driven sales
- **Fraud Detection:** Automated flagging and manual review
- **Batch Processing:** Monthly payout batch creation
- **Payment Integration:** Xendit API for disbursements
- **Admin Dashboard:** Complete management interface

---

## 🔄 **COMPLETE PROCESS FLOW**

### **Step 1: AFFILIATE LINK CLICK**
```
👆 Customer clicks affiliate link → 📊 affiliate_clicks table
```

**Tables:** `affiliate_clicks`  
**Data Captured:**
- Affiliate ID, IP address, user agent, referrer
- UTM parameters (source, medium, campaign)  
- Landing page URL, Sub ID for tracking

### **Step 2: CUSTOMER CONVERSION**
```
💰 Purchase made → 📊 affiliate_conversions table
```

**Tables:** `affiliate_conversions`  
**Data Created:**
- **GMV** (Gross Merchandise Value) - actual purchase amount
- **commission_amount** - calculated based on affiliate's rate
- **level** - commission tier (1-5 based on affiliate membership)
- **status** - 'pending' (awaiting verification)
- **order_id** - links to actual purchase

### **Step 3: FRAUD DETECTION & FLAGGING**
```
🔍 Auto-flagging rules applied → Status: 'flagged' or remains 'pending'
```

**Current Auto-Flagging (Database Triggers):**
- **Trigger:** `handle_fraud_flag_affiliate_suspension` 
- **Action:** When fraud flag created → affiliate status = 'flagged'

**Missing Auto-Flagging (Recommendations):**
- Amount-based: `> $455` and `< $260` (20% of $1300)
- Duplicate order detection
- Velocity checks (multiple conversions from same IP/user)
- New affiliate pattern analysis

### **Step 4: MANUAL REVIEW & CLEARANCE**
```
👨‍💼 Admin reviews → Status: 'flagged' → 'cleared' → 'paid'
```

**Admin Actions:**
- Review flagged conversions via `/admin/affiliates/conversions`
- Investigate fraud flags via `/admin/affiliates/flags`
- Update status manually through admin interface

### **Step 5: BATCH CREATION** 
```
📦 Monthly batch creation → 'processing' status
```

**Current Implementation:** Manual batch creation  
**Recommended:** Auto-batch creation 5 days before month-end with admin approval

### **Step 6: PAYOUT PROCESSING**
```
💸 Admin approves batch → Xendit API → Bank transfer → 'paid' status
```

**Integration:** Xendit Payment Gateway  
**Methods:** Bank transfer, digital wallets

---

## 🗄️ **DATABASE SCHEMA**

### **Core Tables:**

#### **`affiliate_clicks`**
```sql
- id (uuid, primary key)
- affiliate_id (uuid, foreign key to affiliates)
- clicked_at (timestamp)
- ip_address (inet)
- user_agent (text)
- referrer_url (text)
- utm_params (jsonb)
- sub_id (text)
- created_at (timestamp)
```

#### **`affiliate_conversions`**
```sql
- id (uuid, primary key)
- affiliate_id (uuid, foreign key to affiliates) 
- click_id (uuid, foreign key to affiliate_clicks, nullable)
- gmv (decimal) -- Gross Merchandise Value
- commission_amount (decimal)
- level (integer) -- Commission tier 1-5
- status (enum: pending, flagged, cleared, paid, processing)
- order_id (text)
- sub_id (text)
- payout_id (uuid, foreign key to affiliate_payouts, nullable)
- created_at (timestamp)
- updated_at (timestamp)
```

#### **`affiliates`**
```sql
- id (uuid, primary key)
- user_id (uuid, foreign key to unified_profiles)
- slug (text, unique)
- commission_rate (decimal)
- status (enum: pending, active, flagged, inactive)
- payout_method (enum: bank_transfer, digital_wallet)
- bank_name (text)
- account_number (text, encrypted)
- account_holder_name (text)
- created_at (timestamp)
- updated_at (timestamp)
```

#### **`unified_profiles`**
```sql
- id (uuid, primary key)
- email (text, unique)
- first_name (text)
- last_name (text)
- created_at (timestamp)
- updated_at (timestamp)
```

#### **`fraud_flags`**
```sql
- id (uuid, primary key)
- affiliate_id (uuid, foreign key to affiliates)
- reason (text)
- details (jsonb)
- resolved (boolean, default false)
- resolved_at (timestamp, nullable)
- resolver_notes (text, nullable)
- created_at (timestamp)
- updated_at (timestamp)
```

#### **`affiliate_payouts`**
```sql
- id (uuid, primary key)
- affiliate_id (uuid, foreign key to affiliates)
- batch_id (uuid, foreign key to affiliate_payout_batches)
- amount (decimal) -- Total commission amount
- fee_amount (decimal) -- Transaction fees
- net_amount (decimal) -- Amount after fees
- status (enum: pending, processing, completed, failed)
- payout_method (text)
- xendit_id (text, nullable) -- External payment ID
- processed_at (timestamp, nullable)
- created_at (timestamp)
- updated_at (timestamp)
```

#### **`affiliate_payout_batches`**
```sql
- id (uuid, primary key)
- name (text)
- total_amount (decimal)
- fee_amount (decimal)
- net_amount (decimal)
- affiliate_count (integer)
- conversion_count (integer)
- payout_method (text)
- status (enum: pending, processing, completed, failed)
- processed_at (timestamp, nullable)
- created_at (timestamp)
- updated_at (timestamp)
```

#### **`payout_items`**
```sql
- id (uuid, primary key)
- payout_id (uuid, foreign key to affiliate_payouts)
- conversion_id (uuid, foreign key to affiliate_conversions)
- amount (decimal)
- created_at (timestamp)
```

---

## 🚨 **AUTO-FLAGGING ANALYSIS**

### **Current Implementation**
❌ **No Automatic Conversion Flagging Exists**

**Current Status:**
- Manual fraud flags only via `/admin/affiliates/flags`
- Database trigger updates affiliate status when fraud flag created
- No automatic conversion flagging based on amount, patterns, or velocity

### **Industry Best Practice Auto-Flagging Rules**

Based on web search research, the following should be implemented:

#### **1. Amount-Based Flagging**
```typescript
// Recommended Implementation
if (conversion.gmv > 455 || conversion.gmv < 260) {
  flagConversion(conversion, "AMOUNT_THRESHOLD", {
    amount: conversion.gmv,
    threshold_min: 260,
    threshold_max: 455,
    product_price: 1300
  });
}
```

#### **2. Duplicate Order Detection**
```typescript
// Check for duplicate order IDs within timeframe
const duplicateCheck = await supabase
  .from('affiliate_conversions')
  .select('id')
  .eq('order_id', conversion.order_id)
  .neq('id', conversion.id)
  .gte('created_at', thirtyDaysAgo);

if (duplicateCheck.data?.length > 0) {
  flagConversion(conversion, "DUPLICATE_ORDER", {
    original_conversion_id: duplicateCheck.data[0].id,
    order_id: conversion.order_id
  });
}
```

#### **3. Velocity Checks**
```typescript
// Check for rapid conversions from same affiliate
const recentConversions = await supabase
  .from('affiliate_conversions')
  .select('id')
  .eq('affiliate_id', conversion.affiliate_id)
  .gte('created_at', oneHourAgo);

if (recentConversions.data?.length > 5) {
  flagConversion(conversion, "HIGH_VELOCITY", {
    count: recentConversions.data.length,
    timeframe: "1_hour"
  });
}
```

#### **4. New Affiliate Pattern Detection**
```typescript
// Flag conversions from affiliates registered < 30 days with high amounts
const affiliate = await getAffiliateInfo(conversion.affiliate_id);
const daysSinceRegistration = getDaysBetween(affiliate.created_at, new Date());

if (daysSinceRegistration < 30 && conversion.gmv > 300) {
  flagConversion(conversion, "NEW_AFFILIATE_HIGH_VALUE", {
    affiliate_age_days: daysSinceRegistration,
    amount: conversion.gmv
  });
}
```

### **Implementation Location**
```typescript
// File: lib/services/affiliate/fraud-detection.ts (NEW FILE)
// Called from: Conversion creation webhook/API endpoint
// Triggers: Database trigger or API call after conversion insert
```

---

## �� **BATCH AUTOMATION RECOMMENDATIONS**

### **Current Implementation**
❌ **Manual Batch Creation Only**

**Current Process:**
1. Admin manually navigates to `/admin/affiliates/payouts/batches/create`
2. Selects eligible conversions
3. Creates batch manually
4. Processes via Xendit manually

### **Recommended Auto-Batch System**

#### **1. Scheduled Batch Creation**
```typescript
// File: lib/services/payout/auto-batch-service.ts (NEW FILE)

export async function createScheduledBatch() {
  // Run 5 days before month end
  const monthEnd = getLastDayOfMonth();
  const batchDate = subtractDays(monthEnd, 5);
  
  if (isToday(batchDate)) {
    // Get all cleared conversions from previous month
    const eligibleConversions = await getEligiblePayouts({
      status: 'cleared',
      dateFrom: getFirstDayOfPreviousMonth(),
      dateTo: getLastDayOfPreviousMonth()
    });
    
    // Create auto-batch with status: 'pending_review'
    const batch = await createPayoutBatch({
      affiliateIds: eligibleConversions.affiliates.map(a => a.affiliate_id),
      batchName: `Auto-Batch ${format(new Date(), 'yyyy-MM')}`,
      status: 'pending_review' // Requires admin approval
    });
    
    // Notify admin for review
    await notifyAdminForReview(batch.id);
  }
}
```

#### **2. Cron Job Setup**
```bash
# Add to system cron or Taskfile.yml
# Run daily at 9 AM to check if auto-batch needed
0 9 * * * node scripts/auto-batch-check.js
```

#### **3. Admin Review Workflow**
```typescript
// New admin endpoint: /admin/affiliates/payouts/batches/[id]/review
// Batch status: 'pending_review' → 'approved' → 'processing'

export async function approveBatch(batchId: string, adminUserId: string) {
  // Update batch status to approved
  // Queue for Xendit processing
  // Log admin activity
}
```

### **Implementation Priority**
1. **Phase 1:** Auto-batch creation (5 days before month-end)
2. **Phase 2:** Admin review/approval workflow  
3. **Phase 3:** Automated Xendit processing after approval

---

## 🎨 **UI ARCHITECTURE AUDIT**

### **Current Navigation Structure**
```
/admin/affiliates/
├── / (Affiliate List) ✅ OK
├── /conversions (Conversion Management) ⚠️ CONFUSING
├── /payouts (Payout Overview) ⚠️ CONFUSING
│   ├── /batches (Batch Management) ⚠️ CONFUSING
│   ├── /preview (Batch Preview) ⚠️ CONFUSING
│   ├── /reports (Payout Reports) ⚠️ CONFUSING
│   ├── /monitoring (Payout Monitoring) ⚠️ CONFUSING
│   └── /[payoutId] (Individual Payout) ⚠️ CONFUSING
├── /analytics ✅ OK
├── /settings ✅ OK
└── /flags ✅ OK
```

### **UI Complexity Issues**

#### **Problem 1: Too Many Payout Subdirectories**
```
Current: 6 different payout-related pages
Industry Standard: 2-3 maximum
```

#### **Problem 2: Conversion vs Payout Confusion**
- Users don't understand difference between "conversions" and "payouts"
- Both show similar data with different contexts
- Status flow is unclear: pending → flagged → cleared → paid

#### **Problem 3: Overlapping Functionality**
- `/payouts` and `/payouts/batches` show similar information
- `/payouts/preview` and `/payouts/batches/create` overlap
- `/payouts/reports` and `/analytics` have similar goals

### **Industry Best Practice Recommendations**

#### **Simplified Navigation Structure**
```
/admin/affiliates/
├── / (Affiliate Management) ✅ KEEP
├── /performance (Combined Analytics) ✅ SIMPLIFIED  
├── /commissions (Commission Pipeline) 🆕 SIMPLIFIED
│   ├── ?status=pending (Pending Review)
│   ├── ?status=flagged (Needs Investigation) 
│   ├── ?status=cleared (Ready for Payout)
│   └── ?status=paid (Payment History)
├── /payouts (Payout Management) 🆕 SIMPLIFIED
│   ├── /create (Create New Batch)
│   └── /history (Batch History)
├── /fraud (Fraud Detection) ✅ KEEP (rename from flags)
└── /settings ✅ KEEP
```

#### **Key Improvements**
1. **Single Commission Pipeline:** Replace "conversions" with "commissions" showing full status flow
2. **Unified Payout Management:** Combine batch creation, management, and history
3. **Clear Status Progression:** pending → flagged → cleared → paid with visual progress
4. **Reduced Cognitive Load:** 6 main sections instead of 10+

### **Implementation Strategy**

#### **Phase 1: Consolidate Commission Management**
```typescript
// New page: /admin/affiliates/commissions
// Combines current /conversions functionality
// Shows all statuses with tabs
// Clear status progression visualization
```

#### **Phase 2: Simplify Payout Management**  
```typescript
// Streamlined /admin/affiliates/payouts
// Only 2 sub-pages: /create and /history
// Move monitoring to main payout page
// Combine reports into analytics
```

#### **Phase 3: Improve Status Flow UX**
```typescript
// Visual status progression component
// Bulk actions for status changes
// Clear next-action indicators
// Automated status transitions where possible
```

---

## 🏭 **INDUSTRY BEST PRACTICES**

### **1. Fraud Detection Standards**

#### **Multi-Layer Approach**
```typescript
// Layer 1: Real-time flagging (amount, velocity, patterns)
// Layer 2: Machine learning risk scoring  
// Layer 3: Manual investigation workflow
// Layer 4: Appeals and resolution process
```

#### **Risk Scoring System**
```typescript
interface ConversionRiskScore {
  score: number; // 0-100
  level: 'low' | 'medium' | 'high' | 'critical';
  factors: string[];
  auto_action: 'approve' | 'flag' | 'block';
}
```

### **2. Batch Processing Standards**

#### **Automated Scheduling**
- **Frequency:** Monthly (5 days before month-end)
- **Review Period:** 2-3 business days for admin approval
- **Processing:** Automated after approval
- **Reporting:** Detailed batch reports with reconciliation

#### **Payment Standards**
- **Methods:** Bank transfer (primary), digital wallets (secondary)
- **Currencies:** Multi-currency support
- **Fees:** Transparent fee calculation and disclosure
- **Compliance:** AML/KYC verification for high-value affiliates

### **3. Data Integrity Standards**

#### **Audit Trail**
```typescript
// Every status change logged with:
// - Timestamp, user ID, old/new values
// - Reason for change, supporting evidence
// - System vs manual change indicator
```

#### **Reconciliation**
```typescript
// Monthly reconciliation reports
// Commission vs payout matching
// Fee calculation verification
// Xendit transaction correlation
```

---

## 🔌 **API ENDPOINTS & CODE REFERENCES**

### **Core Files**
```
lib/actions/admin/conversion-actions.ts - Conversion management
lib/actions/admin/payout-actions.ts - Payout processing  
lib/actions/admin/fraud-actions.ts - Fraud detection
lib/services/xendit/disbursement-service.ts - Payment processing
components/admin/affiliates/ - UI components
app/admin/affiliates/ - Page routes
```

### **Database Migrations**
```
migrations/xxx_create_affiliate_tables.sql - Core schema
migrations/xxx_create_fraud_flags.sql - Fraud detection
migrations/xxx_create_payout_system.sql - Payout infrastructure
```

### **Types & Interfaces**
```typescript
// File: types/admin/affiliate.ts
interface AdminConversion {
  conversion_id: string;
  affiliate_id: string;
  affiliate_name: string;
  affiliate_email: string;
  conversion_value: number; // GMV
  commission_amount: number;
  status: 'pending' | 'flagged' | 'cleared' | 'paid';
  conversion_date: string;
  order_id?: string;
  days_pending?: number;
}

interface PayoutBatchPreview {
  affiliates: BatchAffiliatePreview[];
  batch_totals: {
    total_payout_amount: number;
    total_fee_amount: number;
    total_net_amount: number;
    total_affiliates: number;
    total_conversions: number;
  };
}
```

---

## ⚡ **IMMEDIATE ACTION ITEMS**

### **Phase 1: Auto-Flagging Implementation**
1. Create `lib/services/affiliate/fraud-detection.ts`
2. Implement amount-based flagging (> $455, < $260)
3. Add duplicate order detection
4. Add velocity checks for rapid conversions
5. Add new affiliate pattern detection

### **Phase 2: Batch Automation**
1. Create auto-batch service for 5-day-before-month-end
2. Add admin review/approval workflow
3. Implement cron job for daily checks
4. Add email notifications for admin review

### **Phase 3: UI Simplification**
1. Consolidate conversion management into single "commissions" page
2. Simplify payout management to 2 sub-pages max
3. Add visual status progression indicators
4. Implement bulk actions for efficiency

---

**SUMMARY:** The system foundation is solid but missing critical automation features. Auto-flagging and batch automation are industry standards that should be implemented immediately. The UI needs simplification to reduce confusion and improve workflow efficiency.

---

*Last Updated: January 2025*
*Document Maintainer: Development Team* 