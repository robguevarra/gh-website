# Automation Engine: Safe Verification & dry_run

## 1. Overview
The Automation Engine now includes a **Safe Mode** (`dry_run`). When enabled, the engine will process the entire graph, evaluate conditions, and traverse paths, but it will **SKIP** side-effects like sending actual emails or calling external APIs.

## 2. Reading from the Graph (Verified)
Yes, the engine reads directly from the graph stored in `email_automations`.
- **Mechanism**: The Walker function (`process-automation-step`) loads the automation row, parses the `graph` JSON column, finds the `current_node_id`, and executes the logic defined in that node's `data` property.

## 3. How to Exhaustively Test (Safe Mode)
To test your flows without spamming real users, you can trigger a run with the `dry_run: true` flag in the metadata.

### Step-by-Step Testing Guide

#### A. Trigger a Dry Run via Code (Recommended)
You can manually invoke the "Watcher" from your local machine (or a temporary test script) with a mock payload.

**Example cURL Command:**
```bash
curl -X POST 'https://cidenjydokpzpsnpywcf.supabase.co/functions/v1/process-automation-triggers' \
  -H 'Authorization: Bearer [YOUR_SERVICE_ROLE_KEY]' \
  -H 'Content-Type: application/json' \
  -d '{
    "event_id": "test-run-001",
    "type": "checkout.started",
    "email": "your.test.email@example.com",
    "contact_id": "test-contact-1",
    "marketingOptIn": true,
    "metadata": {
      "product_type": "P2P",
      "dry_run": true
    }
  }'
```
> **Note**: Replace `[YOUR_SERVICE_ROLE_KEY]` with the key from your Supabase Dashboard.

#### B. Verify Execution in Logs
Instead of checking your inbox, you verify the **logs** to see exactly what happened.

1.  **Check Automation Logs Table**:
    Run this SQL query in Supabase Studio:
    ```sql
    select * from automation_logs 
    where execution_id = (select id from automation_executions order by created_at desc limit 1);
    ```
2.  **What to look for**:
    *   **Nodes Visited**: See the sequence of node IDs.
    *   **Action Type**: `send_email`
    *   **Status**: `success`
    *   **Metadata**: `{"email_sent": true, "dry_run": true}` -> **This confirms it worked safely!**

### 4. Testing Specific Funnels

**Funnel 1: P2P Abandoned Cart**
*   **Trigger**: Send payload with `type: "checkout.started"`, `product_type: "P2P"`.
*   **Expect**: Log shows "Delay" node started (paused status), or "Send Email" node executed (if delay passed).

**Funnel 2: Canva Upsell**
*   **Trigger**: Send payload with `type: "checkout.completed"`, `product_type: "Canva"`.
*   **Expect**: Log should show path traversal to the "Upsell Email" node.

## 5. Live Testing (Real Email)
Once you are confident with the `dry_run` logs:
1.  Remove `"dry_run": true` from your payload.
2.  Use **your own email** address in the `email` field.
3.  Trigger the event.
4.  Check your actual Inbox.
