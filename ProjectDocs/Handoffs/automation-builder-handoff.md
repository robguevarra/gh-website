# Handoff: Automation Visual Builder

**Date**: 2026-01-20
**Status**: Visual Builder Complete (Frontend), Backend Engine Pending
**Authors**: Antigravity

## Overview
We have successfully implemented the **Visual Automation Builder** for the Email Studio. This interface allows admins to design complex, multi-step email flows (e.g., Abandoned Cart recovery, Welcome series) using a drag-and-drop canvas.

## Key Features Implemented

### 1. Visual Canvas
-   **Library**: `@xyflow/react` (formerly React Flow).
-   **Drag & Drop**: Users can drag nodes from a sidebar palette onto the canvas.
-   **Connections**: Nodes can be connected to define the flow of execution.
-   **Persistence**: The entire graph state (nodes & edges) is saved to the `email_automations` table in the `graph` column (JSONB).

### 2. Node Types & Configuration
We implemented distinct visual styles and configuration options for various node types:

| Node Type | Color | Functionality | Configuration |
| :--- | :--- | :--- | :--- |
| **Trigger** | 🟢 Emerald | Starts the flow. | **Event**: Checkout, Signup, Tag Added, Campaign Clicked.<br>**Filters**: Specific Tag Name, Specific Campaign ID. |
| **Action: Email** | 🔵 Blue | Sends an email. | **Template**: Select from existing templates.<br>**Subject**: Override subject line. |
| **Action: Tag** | 🩷 Pink | Adds/Removes Tags. | **Tag Name**: Enter tag to add. |
| **Logic: Delay** | 🟣 Purple | Time-based pause. | **Duration**: e.g., "1 Day", "4 Hours". |
| **Logic: Wait** | 🪪 Indigo | Event-based pause. | **Wait Until**: e.g., "Person opens email" or "Timeout". |
| **Condition** | 🟠 Orange | Splitting Logic (If/Else). | **Logic**: Field (e.g. Tags) + Operator (Contains) + Value. |

### 3. Smart Inputs
-   **Campaign Selector**: When choosing "Campaign Clicked" trigger, users can select from a dropdown of actual campaigns (fetched from DB) instead of untyped UUIDs.
-   **Template Selector**: "Send Email" nodes allow picking from created Email Templates.

## Codebase Map

### Core Components
-   `app/admin/email-studio/components/automation-builder.tsx`: **Main Entry**. Handles state, fetching aux data (templates/campaigns), and saving.
-   `app/admin/email-studio/components/property-panel.tsx`: **Sidebar Config**. The form that appears when a node is clicked. Handles all the specific inputs logic.

### Custom Nodes
-   `app/admin/email-studio/components/nodes/trigger-node.tsx`: Visuals for the Green starting block.
-   `app/admin/email-studio/components/nodes/action-node.tsx`: Visuals for Email, Tag, Delay, and Wait nodes.
-   `app/admin/email-studio/components/nodes/condition-node.tsx`: Visuals for the Orange branch node.

### Backend / Server Actions
-   `app/admin/email-studio/actions.ts`:
    -   `saveAutomationGraph(id, graph)`
    -   `getTemplates()`
    -   `getCampaigns()`

## ⚠️ MISSING PIECES: What needs to be done next?

The Visual Builder is complete, but the **Backend Engine ("The Cortex") is currently non-functional**. The following components must be built for automations to actually run:

### 1. The Watcher (Trigger Processor) - 🔴 NOT STARTED
**Goal**: Listen for system events and spawning new automation executions.
*   **Requirements**:
    *   Create a mechanism (e.g., Supabase Database Webhook or Cron) to listen to the `crm_activities` table(or wherever events are logged).
    *   Match new events against *Active* Automations.
    *   **Logic**: If `event.type == automation.trigger.type` AND `event.data matches automation.trigger.filters` -> INSERT into `automation_executions`.

### 2. The Walker (Graph Execution Engine) - 🔴 NOT STARTED
**Goal**: Move users through the flow, node by node.
*   **Requirements**:
    *   Build an Edge Function (e.g., `process-automation-step`) that takes an `execution_id`.
    *   **Fetch**: Get the current `graph` and `current_node_id`.
    *   **Execute**: Perform the action (Send Email via API, Add Tag via DB).
    *   **Traverse**: Find the next node via `edges`.
    *   **Update**: Set `current_node_id` to the next node.
    *   **Scheduler**: If the next node is a "Delay" or "Wait Until", calculate the `wake_up_time` and pause execution.

### 3. The Scheduler (Time Management) - 🔴 NOT STARTED
**Goal**: Wake up paused executions.
*   **Requirements**:
    *   A Cron job (e.g., every minute) to query `automation_executions` where `status = 'paused'` AND `wake_up_time <= NOW()`.
    *   Trigger "The Walker" for these waking executions.

### 4. Database Schema Updates - 🟡 PARTIALLY DONE
*   `email_automations` table exists and stores the graph.
*   **MISSING**: `automation_executions` table.
    *   `id` (uuid)
    *   `automation_id` (fk)
    *   `user_id` (fk)
    *   `current_node_id` (string)
    *   `status` (active, paused, completed, failed)
    *   `wake_up_time` (timestamp)
    *   `context` (jsonb) - to store variable data accumulated through the flow.

### 5. Events & Signals Integration - 🔴 NOT STARTED
To ensure triggers fire reliably, valid system events must be standardized.
*   **Standardize `crm_activities`**:
    *   Define strict types for events (e.g., `checkout_abandoned`, `page_view`, `purchase`, `user_signup`).
    *   Ensure all frontend/backend loggers use these exact type strings.
*   **Internal "Track Event" API**:
    *   Create a simple API (e.g., `trackEvent(userId, eventType, data)`) for the frontend to easily log these events to the `crm_activities` table.
    *   This API should likely also trigger "The Watcher" immediately for Real-Time responsiveness.

## Notes for Developer
-   The `graph` JSON structure is ready for the engine to parse. `data` objects in nodes contain all necessary config (template IDs, delays, etc.).
-   The "Wait Until" node is essentially a "Delay" node that *also* checks for an event match during every engine tick.

---
*Document saved to `ProjectDocs/Handoffs/automation-builder-handoff.md`*
