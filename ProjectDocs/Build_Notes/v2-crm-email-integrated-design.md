# V2 System Design: The Unified Directory & Cortex Engine

**Date:** January 2026
**Status:** Phase 2 Complete / Moving to Phase 3 (Marketing & Automation)

## 1. Executive Summary
We are rebuilding the CRM and Email infrastructure to be **Event-Driven** and **Unified**. 
Instead of separate "Users" and "Leads" silos, we will have a single **Directory** view. 
Instead of manual email blasting, we will have **Cortex**, an engine that reacts to user behaviors (Activities).

---

## 2. Data Architecture: The "Unified Directory"

### The Problem
Currently, `auth.users` (Customers) and `purchase_leads` (Leads) are separate. You cannot easily "email everyone who abandoned checkout" because they aren't in the same table.

### The Solution: `view_directory_contacts`
We will create a **SQL View** that unions these two worlds. This allows the Frontend to query *one* source for all people.

```sql
-- Conceptual View Structure
CREATE VIEW view_directory_contacts AS
SELECT 
    u.id as id,
    u.email as email,
    'customer' as type,
    u.first_name,
    u.last_name,
    u.tags
FROM unified_profiles u
UNION ALL
SELECT 
    l.id as id,
    l.email as email,
    'lead' as type,
    l.first_name,
    l.last_name,
    '{"lead"}' as tags
FROM purchase_leads l
WHERE l.email NOT IN (SELECT email FROM unified_profiles); -- Avoid duplicates
```

---

## 3. CRM Activities: Tracking Events

**"How are we going to track events?"**

We will use a multi-channel approach to populate the `crm_activities` table. This table is the "Heartbeat" of the system.

### Table Schema (`crm_activities`)
*   `id`: UUID
*   `contact_email`: Citext (Links to Lead OR User)
*   `contact_id`: UUID (Nullable, links to User if they exist)
*   `type`: String (e.g., `checkout.abandoned`, `course.enrolled`, `email.clicked`)
*   `metadata`: JSONB (Context: `{ "course_id": "...", "campaign_id": "..." }`)
*   `occurred_at`: Timestamptz

### Ingestion Channels
1.  **Database Triggers (Automatic)**
    *   *When:* A row is inserted into `enrollments`.
    *   *Action:* Trigger inserts a `course.enrolled` activity.
    *   *Benefit:* Zero code needed in the app; 100% reliable.

2.  **API Webhooks (External)**
    *   *When:* Postmark reports a "Bounce" or "Link Click".
    *   *Action:* Webhook handler inserts `email.bounced` activity.
    *   *Benefit:* Real-time feedback from email tools.

3.  **Application Events (Manual)**
    *   *When:* User visits the "Pricing Page".
    *   *Action:* `trackActivity('page_view', { path: '/pricing' })` called from Frontend.
    *   *Benefit:* Tracks high-intent behaviors that aren't database writes.

---

## 4. Smart Lists: Dynamic Segmentation

**"What would our smart_lists look like?"**

A Smart List is a **Saved Filter** defined by JSON rules, resolved dynamically into a SQL query.

### Table Schema (`crm_smart_lists`)
*   `id`: UUID
*   `name`: String ("Abandoned Checkout - Last 7 Days")
*   `rules`: JSONB
*   `user_count`: Integer (Cached nightly or on-demand)

### The "Rules" (JSONB)
We store the *logic*, not the SQL (for security).
```json
{
  "operator": "AND",
  "conditions": [
    { "field": "type", "operator": "eq", "value": "lead" },
    { "field": "last_activity", "operator": "gt", "value": "7 days ago" },
    { "field": "tags", "operator": "contains", "value": "abandoned" }
  ]
}
```

### Execution
A Postgres Function `resolve_smart_list(list_id)` will:
1.  Read the JSON rules.
2.  Construct a WHERE clause for `view_directory_contacts`.
3.  Return the matching rows.

---

## 5. UI Implementation

### The Admin Drawer (Command Center)
Ported from the Diagnostic Tool, this drawer is available on ANY contact record.
*   **Top**: Profile Summary (Name, Email, Lifetime Value).
*   **Middle**: Activity Timeline (Scrollable list of `crm_activities`).
*   **Bottom**: Admin Actions.
    *   *Identity*: [Update Email], [Link Accounts].
    *   *Support*: [Reset Password], [Resend Welcome Email].
    *   *Commerce*: [Manual Enrollment], [Sync Orders].

### The Email Studio
*   **Targeting**: Select a "Smart List" as the audience.
*   **Design**: Unlayer Editor (optimized with `useRef` to avoid re-renders).
*   **Sending**:
    *   Job created in `email_jobs`.
    *   Worker detects Job.
    *   Worker fetches Smart List members.
    *   Worker batches 500 emails/request to Postmark.

---

## 6. Phase 2 Implementation Logic (Access Compliance)

**Objective**: Ensure strict access control for refunded users while maintaining financial accuracy and preventing unauthorized access.

### The "Revoke & Refund" Workflow
We implemented a unified "Revoke P2P Access" action in  that acts as the single source of truth for cancellations.

1.  **Financial Integrity**: The action automatically locates the associated P2P enrollment and its original transaction. The Transaction status is updated to  to maintain audit trails.
2.  **Access Revocation (Data Level)**: The Enrollment status is updated to .
3.  **Access Blocking (Transport Level)**: The Student Dashboard () was patched to strictly filter for . This ensures that even if local state persists, the API will refuse to return course data for cancelled enrollments.
4.  **Login Prevention (Auth Level)**: To completely secure the platform, the Revoke action now sets `ban_duration: 'infinite'` on the user's Auth record. This leverages Supabase Auth's built-in security to reject valid credentials at the Sign-In gate (`SignInForm`), preventing the user from generating a new session.

---

## 7. Phase 3 & 3.5 Implementation: The Email Studio (Completed)

**Objective**: Create a "Mailchimp-like" command center for managing broadcasts and internal communications.

### The Studio Dashboard (`Phase 3.5`)
We successfully built a "Command Center" at `/admin/email-studio` to serve as the entry point:
*   **KPI Cards**: Shows real-time "Total Subscriber" counts (unified leads + customers).
*   **Action Hub**: Large, distinct calls-to-action for "New Broadcast" vs "Automations".
*   **Safety**: Separation of concerns between `Broadcast` (Marketing) and `Transactional` (System) streams.

### The Campaign Wizard (`Phase 3`)
We moved away from a single "Edit Page" to a multi-step orchestrated flow (`/admin/email/wizard`):
1.  **Settings**: Subject, Preheader, streamlining definition.
2.  **Audience**: A Unified Selector that pulls from `crm_smart_lists`.
3.  **Design**: A performance-optimized wrapper around the Unlayer editor (using `forwardRef` to avoid typing lag).
4.  **Review**: Final validation before queuing.

---

## 8. Phase 4 Implementation: Cortex Engine (Completed)

**Objective**: Power the UI with a scalable backend engine.

### The Email Worker (`v2-email-worker`)
We implemented a robust cron-based worker (`app/api/cron/email-worker`) that:
*   Runs every minute via Vercel Cron.
*   **Locks** jobs to prevent double-sending (`status: processing`).
*   **Sends** via Postmark API.
*   **Logs** results to the `crm_activities` timeline, ensuring the CRM stays in sync with email history.

### Automation Triggers (`process-abandonment`)
We implemented "Smart Monitors" that scan the `purchase_leads` table:
*   **Trigger**: Finds leads > 30 minutes old with NO linked enrollment.
*   **Action**: Automatically queues an "Abandonment Recovery" email job.
*   **Filtering**: Checks history to ensure we don't spam the same user twice.

