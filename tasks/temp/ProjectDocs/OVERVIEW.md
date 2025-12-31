# Project Overview & Handover Guide
**Project Name**: Graceful Homeschooling AI Assistant
**GCP Project ID**: `manychat-openai-integration`

This document serves as the master guide for developers understanding the ManyChat AI integration ecosystem.

---

## 1. The Big Picture
We are building an **Intelligent Support Bot** for "Graceful Homeschooling". It handles student inquiries, specifically about:
1.  **"Papers to Profits" Course**: Selling the course, handling objections, and explaining the "Partner Printer" benefit.
2.  **Schedule**: Communicating closed days/hours.
3.  **Enrollment Support**: guiding users to the order form.

### The System Components
The system is split into two parts:
1.  **The Brain (Python/Flask)**: Receives webhooks from ManyChat -> Process with OpenAI -> Returns reply.
2.  **The Control Center (Next.js)**: A web dashboard for Admins to monitor chats, compare bot versions, and update the bot's knowledge base (FAQs/Schedule) without touching code.

---

## 2. "The Brain" (Python Backend)
*   **Location**: `d:\Users\Rob Guevarra\Documents\Manychat-Openai App\` (This folder)
*   **Tech Stack**: Flask, OpenAI SDK, Google Firestore.

### Current Versions
We have two versions of the bot running simultaneously:

#### **V1: Legacy (Live Production)**
*   **Service Name**: `manychat-openai-service`
*   **Status**: Currently facing customers.
*   **Logic**: Single prompt, older model. Reliable but less nuanced.

#### **V2: Next-Gen (Beta/Staging)**
*   **Service Name**: `manychat-openai-service-v2`
*   **Key Feature: "Dual Brain" Architecture**:
    *   **Fast Brain (GPT-4o-mini)**: Handles known FAQs (e.g., "How much?", "Schedule?"). Triggered by keyword matching from `student_faq.json`. Fast, cheap, consistent.
    *   **Smart Brain (GPT-5-mini)**: Handles complex interactions and sales objections. High reasoning effort, empathetic tone.
*   **Dynamic Config**: Fetches `schedule` and `faq` from Firestore (`config` collection). Updates live within 5 minutes (TTL).

---

## 3. Infrastructure (Google Cloud)
*   **Compute**: **Cloud Run** (Serverless Containers).
    *   Port: Listens on port `8080` (Standard) or `$PORT` env var.
*   **Database**: **Firestore** (NoSQL).
    *   Used for: Storing Sandbox Conversations (`conversations_v2_TEST`) and Configuration (`config` collection).
*   **Authentication**: Service Account `manychat-openai-integration-*.json`.

---

## 4. Operational Workflows

### Deployment (How to update the Brain)
The Python app is Dockerized. We deploy V2 separately to avoid breaking V1.

**Deploy V2 commands:**
```bash
# 1. Build
docker build -f Dockerfile.v2 -t manychat-openai-app-v2 .

# 2. Tag for GCR
docker tag manychat-openai-app-v2 gcr.io/manychat-openai-integration/manychat-openai-app-v2

# 3. Push to Registry
docker push gcr.io/manychat-openai-integration/manychat-openai-app-v2

# 4. Deploy to Cloud Run
gcloud run deploy manychat-openai-service-v2 \
  --image gcr.io/manychat-openai-integration/manychat-openai-app-v2 \
  --platform managed \
  --region asia-southeast1 \
  --allow-unauthenticated \
  --set-env-vars OPENAI_API_KEY=[YOUR_KEY]
```

### Configuration (How to update the Knowledge Base)
The bot reads from **Firestore**. You do *not* need to redeploy code to change the Schedule or FAQs.
1.  **Current Method**: Edit `schedule.json` or `faq_student.json` locally -> Run `python upload_config.py`.
2.  **Target Method**: Use the **Next.js Admin Dashboard** (See below).

---

## 5. Next.js Integration (The Task Ahead)
We are building a **Next.js Web App** to serve as the Admin UI.
**See `ProjectDocs/NEXTJS_INTEGRATION_PLAN.md` for the full technical spec.**

### Core Features to Build:
1.  **Comparison Arena**: A "Tinder for Bots" UI. Chat with V1 and V2 side-by-side to see which answers better.
2.  **Admin Dashboard**:
    *   **Schedule Editor**: Form to update the `bot_schedule` in Firestore.
    *   **FAQ Editor**: Table to Add/Edit/Delete intent-based FAQs in `student_faq`.
3.  **Technical Hook**:
    *   The Next.js app needs `firebase-admin` to write to the shared Firestore.
    *   It needs API Proxy routes to forward chat requests to the Cloud Run URLs (to bypass CORS).

---

## 6. Access & Credentials
*   **GCP Project**: `manychat-openai-integration`
*   **Main Service Account**: `manychat-openai-integration-0cd...json` (In root).
    *   *Security Note*: Ensure this JSON key is available to the Next.js app securely (env var), do not commit it to public git.
