# Next.js Integration Plan: ManyChat AI Admin & Comparison Dashboard

## 1. Project Overview
We have two versions of a Python Flask-based Chatbot integrated with ManyChat via OpenAI:
*   **v1 (Legacy)**: Live in production.
*   **v2 (New/Improved)**: Recently deployed to Cloud Run (Service: `manychat-openai-service-v2`). Features "Dual Brain" (Fast vs. Smart models), improved prompt engineering, and structured FAQs.

**Goal:** Build a **Next.js Web Application** to serve as the Control Center for these bots. It will allow you to:
1.  **Compare Performance:** Chat with v1 and v2 side-by-side to verify improvements.
2.  **Manage Configuration:** Edit the Bot's Schedule and FAQ knowledge base without touching code.
3.  **Deploy Configs:** Push those changes directly to Firestore, which the Bot reads dynamically.

---

## 2. Technical Architecture
*   **Framework**: Next.js (App Router recommended).
*   **Styling**: User Preference (Tailwind or Vanilla CSS).
*   **Database**: **Google Cloud Firestore** (Shared with the Python Bot).
    *   *Note*: The Next.js app will read/write to the `config` collection in Firestore.
    *   *Authentication*: Use a Service Account (Server-side) or Firebase Client SDK (Client-side) to access Firestore.

---

## 3. Feature Requirements

### A. Comparison Tool (The "Arena")
Replicate the functionality of `comparison_app.py` but with a better UI.

*   **UI Layout**: Two chat windows side-by-side.
    *   Left: **Bot v1 (Legacy)**
    *   Right: **Bot v2 (New)**
*   **Input**: A single text box at the bottom.
*   **Action**: When user sends a message:
    *   Send payload to **v1** URL (via Proxy).
    *   Send payload to **v2** URL (via Proxy).
    *   Measure and display **Latency** (time taken) for each.
    *   Display the **Response** from each.
*   **Proxy Route Needed**:
    *   Since Cloud Run URLs might block CORS, create a Next.js API Route (e.g., `/api/chat-proxy`) that takes the request and forwards it to the Python Cloud Run services server-side.

### B. Admin Dashboard (Configuration Manager)
A secure page (e.g., `/admin`) to manage the bot's behavior.

#### 1. Schedule Manager
*   **Data Source**: Firestore Collection `config` -> Document `bot_schedule`.
*   **Fields to Edit**:
    *   `schedule`: (String) e.g., "Mon-Fri 8am-6pm".
    *   `schedule_note`: (String) e.g., "Holidays off".
*   **Functionality**: Load current data -> Edit form -> Save to Firestore.

#### 2. FAQ Manager (Knowledge Base)
*   **Data Source**: Firestore Collection `config` -> Document `student_faq`.
*   **Structure**: List of Objects.
    ```json
    [
      {
        "intent": "enrollment_process",
        "triggers": ["how to join", "enroll", "price"],
        "answer": "The course is P1,300..."
      }
    ]
    ```
*   **UI**:
    *   Table or Card view of existing FAQs.
    *   "Add New FAQ" button.
    *   Edit/Delete existing items.

#### 3. "Deploy" Action
*   The Python Bot v2 is built to fetch config from Firestore dynamically (with a 5-minute cache).
*   **Action**: When you click "Save" on the Next.js Admin, it writes to Firestore. The Bot picks this up automatically within 5 minutes. No redeployment of the Python container is needed!

---

## 4. detailed Implementation Steps

### Step 1: Setup Firestore connection
In your Next.js project:
1.  Add `firebase-admin` (if using server actions/API routes) or `firebase` (client SDK).
2.  Add your `manychat-openai-integration-*.json` service account file (securely, don't expose to public repo) OR set the environment variables.

### Step 2: Create API Proxy Routes
Create `src/app/api/proxy/route.ts`:
*   Receives `POST { version: 'v1' | 'v2', message: '...' }`.
*   Forwards to:
    *   v1: `https://manychat-openai-service-587891812318.asia-southeast1.run.app/webhook`
    *   v2: `[YOUR_NEW_V2_CLOUD_RUN_URL]/webhook`
*   Returns the JSON response from the Python service.

### Step 3: Build the Comparison Page (`/comparison`)
*   **Components**: `ChatBox`, `MessageInput`.
*   **State**: `v1History`, `v2History`, `isLoading`.

### Step 4: Build the Admin Page (`/admin`)
*   **Components**: `ScheduleForm`, `FAQTable`, `FAQModal`.
*   **Server Actions (Recommended)**:
    *   `getBotConfig()`: Fetches docs from Firestore.
    *   `updateBotConfig(data)`: Writes docs to Firestore.

---

## 5. Environment Variables needed in Next.js
```env
# Firestore Credentials (methods vary based on library used)
GOOGLE_APPLICATION_CREDENTIALS="path/to/service-account.json"

# Bot URLs
NEXT_PUBLIC_BOT_V1_URL="https://manychat-openai-service-587891812318.asia-southeast1.run.app/webhook"
NEXT_PUBLIC_BOT_V2_URL="[INSERT_YOUR_NEW_DEPLOYED_URL_HERE]/webhook" 
```
