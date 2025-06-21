# Lead Email Marketing System - Phase 1 - Strategy and Implementation

## Task Objective
Develop a comprehensive email marketing strategy for leads captured through our landing pages (P2P, Canva, Shopify) that doesn't require forcing them into the unified_profiles/auth.users system, maintaining our current registration flow while enabling targeted marketing campaigns.

## Current State Assessment
- **Lead Capture System**: ✅ Working - captures leads in `purchase_leads` table via `/api/leads/capture`
- **Unified Profiles Constraint**: 🚫 `unified_profiles.id = auth.users.id` (FK constraint) - requires authentication
- **Email Marketing Infrastructure**: ✅ Postmark integration ready with templates and campaigns
- **Tagging System**: ✅ Ready with proper tag relationships, but tied to `user_tags` (requires unified_profiles)
- **Current Flow**: Leads captured → No email marketing (gap identified)

## Future State Goal
- **Standalone Lead Marketing**: Direct email marketing to leads without forcing authentication
- **Progressive Profiling**: Convert high-intent leads to registered users naturally
- **Targeted Campaigns**: Product-specific email sequences based on lead source
- **Compliance**: Proper opt-in/opt-out mechanisms
- **Analytics**: Track engagement and conversion rates

## Strategic Options Analysis

### Option A: Separate Lead Email Marketing System (RECOMMENDED)
**Approach**: Create dedicated email marketing for leads, separate from user marketing
**Pros**:
- ✅ No changes to existing auth flow
- ✅ Fast implementation
- ✅ Separate lead nurturing pipeline
- ✅ Can still convert leads to users later

**Implementation**:
- Create `lead_email_marketing` table
- Add `email_marketing_subscribed` to `purchase_leads`
- Dedicated Postmark templates for leads
- Separate campaign management

### Option B: Hybrid System with Lead Tags
**Approach**: Create `lead_tags` table parallel to `user_tags`
**Pros**:
- ✅ Consistent tagging architecture
- ✅ Easy migration when leads convert to users
- ✅ Unified reporting possible

**Implementation**:
- Create `lead_tags` table (lead_id, tag_id)
- Duplicate tag management for leads
- Unified campaign system

### Option C: Virtual Profiles for Leads (NOT RECOMMENDED)
**Approach**: Create virtual auth.users for leads
**Cons**:
- 🚫 Pollutes auth system
- 🚫 Complex cleanup required
- 🚫 Security implications
- 🚫 Goes against best practices

## Implementation Plan

### Step 1: Database Schema Design
- [ ] **Task 1.1**: Create `lead_email_marketing` table
  ```sql
  - id (uuid)
  - lead_id (uuid, FK to purchase_leads)
  - email_marketing_subscribed (boolean)
  - subscription_source (text)
  - opted_in_at (timestamp)
  - opted_out_at (timestamp)
  - last_campaign_sent (timestamp)
  ```
- [ ] **Task 1.2**: Add email marketing fields to `purchase_leads`
  ```sql
  - email_marketing_subscribed (boolean, default true)
  - marketing_opt_in_source (text)
  ```
- [ ] **Task 1.3**: Create `lead_tags` table for lead tagging
  ```sql
  - id (uuid)
  - lead_id (uuid, FK to purchase_leads)
  - tag_id (uuid, FK to tags)
  - created_at (timestamp)
  ```

### Step 2: Lead Tagging System
- [ ] **Task 2.1**: Create lead tagging API endpoints
  - POST /api/leads/[leadId]/tags
  - GET /api/leads/[leadId]/tags
  - DELETE /api/leads/[leadId]/tags/[tagId]
- [ ] **Task 2.2**: Implement automatic tagging on lead capture
  - P2P leads → "P2P Purchase Lead" tag
  - Canva leads → "Canva Purchase Lead" tag
  - Shopify leads → "SHOPIFY_ECOM Purchase Lead" tag
- [ ] **Task 2.3**: Create lead tag management utilities

### Step 3: Email Marketing Integration
- [ ] **Task 3.1**: Create Postmark template system for leads
  - Welcome sequences per product type
  - Nurture campaigns
  - Re-engagement flows
- [ ] **Task 3.2**: Implement lead email campaign API
  - POST /api/leads/campaigns/send
  - GET /api/leads/campaigns/stats
- [ ] **Task 3.3**: Create email preference management for leads
  - Unsubscribe links
  - Preference center
  - Opt-out handling

### Step 4: Campaign Management System
- [ ] **Task 4.1**: Build lead email marketing dashboard
  - Campaign creation interface
  - Lead segmentation by tags
  - Performance analytics
- [ ] **Task 4.2**: Implement automated sequences
  - Welcome email (immediate)
  - Educational content (day 3, 7, 14)
  - Special offers (day 21, 30)
- [ ] **Task 4.3**: A/B testing framework for lead campaigns

### Step 5: Analytics and Reporting
- [ ] **Task 5.1**: Lead engagement tracking
  - Email opens, clicks, conversions
  - Lead scoring system
- [ ] **Task 5.2**: Conversion tracking (lead → registered user)
- [ ] **Task 5.3**: ROI analytics per campaign

### Step 6: Compliance and Best Practices
- [ ] **Task 6.1**: Implement proper opt-in mechanisms
- [ ] **Task 6.2**: GDPR compliance for email marketing
- [ ] **Task 6.3**: Automated cleanup of old leads

## Technical Implementation Notes

### Lead Capture Enhancement
```typescript
// Enhanced lead capture with email marketing consent
const leadData = {
  // ... existing fields
  email_marketing_subscribed: true,
  marketing_opt_in_source: 'P2P_landing_page',
  subscription_timestamp: new Date().toISOString()
}
```

### Automatic Tagging Flow
```typescript
// On lead capture, automatically tag based on product type
const tagMapping = {
  'P2P': 'f125358c-1807-4cb1-b426-5c38cab59e62', // P2P Purchase Lead
  'CANVA': '08d83db1-79ba-43e6-ba95-f97be4b57edf', // Canva Purchase Lead  
  'SHOPIFY_ECOM': '[TO_BE_CREATED]' // New tag needed
}
```

### Email Campaign Triggers
- **Immediate**: Welcome email with product-specific content
- **Day 3**: Educational content relevant to their interest
- **Day 7**: Success stories and testimonials
- **Day 14**: Special offer or next-step recommendation
- **Day 30**: Re-engagement campaign

## Success Metrics
- **Email Deliverability**: >95% delivery rate
- **Engagement**: >25% open rate, >5% click rate
- **Conversion**: >10% lead-to-user conversion rate
- **Revenue Attribution**: Track revenue from email campaigns

## Future Enhancements
- **Lead Scoring**: Behavioral scoring based on email engagement
- **Dynamic Content**: Personalized email content based on lead data
- **Advanced Segmentation**: Multi-dimensional lead segmentation
- **Integration**: Connect with CRM systems for advanced nurturing 