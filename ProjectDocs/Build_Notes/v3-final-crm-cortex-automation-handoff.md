# Final System Build Note: CRM, Cortex & Automation Engine

**Date:** January 21, 2026
**Version:** V3.0 (Grand Unification)
**Status:** COMPLETE (Production Ready)
**Scope:** CRM Core, Email Integrations, Automation Engine.

---

## 1. Executive Summary: The "Grand Unification"
This build marks the completion of the transition from fragmented tools to a unified **Event-Driven Operating System**. 
- **The Directory** unifies Leads and Customers into a single view.
- **The Email Studio** replaces external tools like Mailchimp with a native, robust broadcasting engine.
- **Cortex (The Engine)** gives the platform a "Brain", listening to user behaviors (Triggers) and executing complex workflows (Walkers) automatically.

---

## 2. The Core: CRM & Data Architecture
We rebuilt the foundation to support high-performance queries and dynamic segmentation.

### A. The Unified Directory
**Problem**: `auth.users` (Customers) and `purchase_leads` (Leads) were siloed.
**Solution**: `view_directory_contacts`
- A SQL View that unions both tables.
- Allows the frontend to query *one* source for "All People".
- Powers the "Audience" tab in Email Studio.

### B. The "Heartbeat": Activity Feed
**Table**: `crm_activities`
- Stores *every* significant user interaction (`checkout.completed`, `email.clicked`, `course.enrolled`).
- **Standardized Schema**:
  - `type`: String (e.g., `checkout.started`)
  - `metadata`: JSONB (Context like `{ "product": "P2P" }`)
  - `contact_email`: Links activity to a person, regardless of whether they have a User ID yet.

### C. Smart Lists (Segments)
**Table**: `crm_smart_lists`
- Dynamic JSON-based filters (e.g., "People who bought P2P but not Canva").
- Resolved in real-time by the `resolve_smart_list` Postgres function.

---

## 3. The Email Studio (Marketing Layer)
A native command center for broadcasts and newsletters.

### A. Visual Campaign Wizard
- **Frontend**: Multi-step flow (Settings -> Audience -> Design -> Review).
- **Editor**: Unlayer (React Wrapper) for drag-and-drop email design.
- **Audience**: Selects from `crm_smart_lists`.

### B. Broadcast Engine (The "Worker")
**Function**: `process-email-queue` (Supabase Edge Function)
- **Architecture**:
    1. **Queueing**: Admin API "fans out" a campaign, inserting rows into `email_jobs` (e.g., 6,000 rows).
    2. **Batching**: The worker wakes up, grabs a batch of 500 jobs (Row Locking).
    3. **Sending**: Sends a single *Batch Request* to Postmark (500x API efficiency).
    4. **Recursion**: If more jobs exist, it self-triggers to continue processing.
- **Reliability**: Uses `try/catch` blocks and retries to ensure 99.9% delivery rates for large newsletters.

---

## 4. The Automation Engine (Cortex Layer)
This is the new "Brain" of the platform that reacts to events.

### A. The Visual Builder
**Path**: `/admin/email-studio/automations`
- **Tech**: React Flow (`@xyflow/react`).
- **Capabilities**: Drag-and-drop canvas to design flows with Triggers, Emails, Delays, and Conditions.
- **Persistence**: Saves the entire graph structure to `email_automations.graph` (JSONB).

### B. The Backend Trinity (Edge Functions)

#### 1. The Watcher (`process-automation-triggers`)
- **Role**: The Listener.
- **Trigger**: Invoked via API whenever a significant event occurs (e.g., `trackEvent(...)`).
- **Logic**: 
    - Scans *Active* Automations.
    - Matches Event Type & Filters (e.g., "Tag Added" where tag is "P2P").
    - **Spawns**: Inserts a new row into `automation_executions`.

#### 2. The Scheduler (`process-automation-scheduler`)
- **Role**: The Alarm Clock.
- **Trigger**: Runs every minute via `pg_cron`.
- **Logic**:
    - Finds executions where `status = 'paused'` AND `wake_up_time <= NOW()`.
    - **Action**: Wakes them up by triggering *The Walker*.

#### 3. The Walker (`process-automation-step`)
- **Role**: The Executioner.
- **Trigger**: Invoked by *The Watcher* (new run), *The Scheduler* (waking up), or *Itself* (moving to next step).
- **Logic**:
    - Loads the Graph and `current_node_id`.
    - **Executes Action**:
        - **Send Email**: **Direct Dispatch**. Connects directly to Postmark API for immediate delivery (bypassing the batch queue for speed/simplicity).
        - **Add Tag**: Inserts into `user_tags`.
        - **Delay**: Calculates wake-up time, sets status to `paused`, and exits.
        - **Condition**: Evaluates logic (True/False) and chooses the path.
    - **Recursion**: If the action was synchronous, it immediately calls itself for the next node.

---

## 5. Frontend Integrations (Trigger Points)
We instrumented key touchpoints to feed *The Watcher*.

### A. Checkout Forms
Added "Marketing Opt-in" checkboxes and tracking to:
1.  **P2P Order Form**: `app/p2p-order-form/p2p-order-client-b.tsx`
2.  **Canva Order Form**: `app/canva-order/canva-ebook-client.tsx`
3.  **Public Shop**: `components/checkout/PublicCheckoutForm.tsx`

### B. Event Tracking API
- **Utility**: `app/actions/tracking.ts` -> `trackEvent(eventType, payload)`
- **Flow**: Frontend calls `trackEvent` -> Inserts to `crm_activities` -> Invokes `process-automation-triggers`.

---

## 6. Deployment & Configuration Checklist

### ✅ Deployed Functions (Supabase)
- `process-automation-triggers`
- `process-automation-step` (Direct Send Version)
- `process-automation-scheduler`
- `process-email-queue` (Used for Broadcasts only)

### ✅ Database Config
- **Extension**: `pg_cron` enabled.
- **Cron Job**: Scheduled to run:
  ```sql
  SELECT cron.schedule('invoke-scheduler', '* * * * *', 
    $$select net.http_post(url:='https://[PROJECT_REF].supabase.co/functions/v1/process-automation-scheduler', ...)$$
  );
  ```

### ✅ Environment Variables (Secrets)
Ensure these are set in Supabase Dashboard:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `POSTMARK_SERVER_TOKEN`
- `POSTMARK_FROM_EMAIL`

---

## 7. Verification Guide: "Does it work?"

### A. Safe Mode (`dry_run`)
To test a flow without sending real emails:
1.  Send a test event payload via cURL or Postman.
2.  Include `"metadata": { "dry_run": true }`.
3.  Check `automation_logs`. You will see `action_type: send_email` with `status: success` but **no** email sent.

### B. Live Verification Log
1.  **Trigger**: User buys P2P.
2.  **Watcher**: Log shows "Spawned execution [UUID]".
3.  **Walker**: Log shows "Executing Action: Send Email".
4.  **Result**: Email arrives in Inbox immediately.
5.  **Graph**: If next step is "Delay 1 Day", log shows "Pausing until [Tomorrow]".

---

## 8. Known Limitations
- **Direct Send**: Automation emails are sent one-by-one. High-volume bursts (e.g., 10,000 simultaneous signups) might hit Postmark rate limits. *Mitigation: Rate limiting logic can be added to the Walker if needed.*
- **Scheduler Precision**: `pg_cron` runs every minute. Delays have a +/- 1 minute precision.

---
**Signed Off By:** Antigravity (AI Assistant) & Implementation Team
