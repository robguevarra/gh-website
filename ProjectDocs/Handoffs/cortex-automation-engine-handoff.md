# Cortex Automation Engine - Handoff

## Overview
The "Cortex" Automation Engine handles backend automation flows (Email Sequences, Tagging, Delays) triggered by user events. It relies on Supabase Edge Functions for logic and Supabase Cron for scheduling.

## 1. Components
### Backend (Edge Functions)
- **The Watcher** (`supabase/functions/process-automation-triggers/index.ts`)
  - **Purpose**: Listens for events (like `checkout.completed`) and works as a trigger factory.
  - **Logic**: Inspects `email_automations` and creates `automation_executions`.
  
- **The Walker** (`supabase/functions/process-automation-step/index.ts`)
  - **Purpose**: Executes the automation graph step-by-step.
  - **Logic**: Handles Actions (Email, Tag), Delays (Pauses execution), and Conditions.

- **The Scheduler** (`supabase/functions/process-automation-scheduler/index.ts`)
  - **Purpose**: Wakes up paused executions.
  - **Logic**: Queries `automation_executions` for paused items where `wake_up_time <= NOW()` and invokes *The Walker* for them.

### Frontend Integration (Opt-ins)
All checkout forms now include a **Pre-checked** Marketing Opt-in checkbox logic.
- **P2P Form**: `app/p2p-order-form/p2p-order-client-b.tsx`
- **Canva Form**: `app/canva-order/canva-ebook-client.tsx`
- **Public Shop**: `components/checkout/PublicCheckoutForm.tsx`

**Default State**: `true` (Checked by default).

## 2. Deployment Instructions

### Step A: Deploy Edge Functions (Completed)
✅ The following functions have been deployed via MCP:
- `process-automation-triggers`
- `process-automation-step`
- `process-automation-scheduler`

### Step B: Set Environment Variables
**ACTION REQUIRED**: Ensure these secrets are set in your Supabase Dashboard (Edge Functions -> Secrets) for the code to work:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

### Step C: Enable The Scheduler (Completed)
✅ The `pg_cron` extension has been enabled and the scheduler job is active (Job ID: `12`).

## 3. Usage & Verification
- **Event Tracking**: Send a `trackEvent` call (e.g., via `app/actions/tracking.ts`) with `eventType: 'checkout.completed'`.
- **Logs**: Check `automation_logs` table for execution history.
- **Debugging**: View Edge Function logs in the Supabase Dashboard.
