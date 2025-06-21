# Payment Actions - Phase 1: Payment and Enrollment Flow

## Task Objective
Document and implement the unified payment and enrollment flow in `payment-actions.ts` and related utilities/handlers (`payment-utils.ts`, `webhooks/xendit/route.ts`), covering:
- How to handle transactions for both course ("Papers to Profits" - P2P) and ebook ("Canva" - Canva Ebook) purchases.
- When and how to create Supabase Auth users and unified profiles.
- How to handle course enrollments and transaction logging for both product types.
- Industry best practices for ensuring data integrity, handling asynchronous events (webhooks), and idempotency.

## Current State Assessment
- The codebase uses a unified schema: `auth.users`, `unified_profiles`, `transactions`, and `enrollments`.
- `payment-actions.ts` contains `createPaymentIntent` which interacts with Xendit.
- `payment-utils.ts` contains helper functions for user creation, transaction logging, and enrollment.
- `webhooks/xendit/route.ts` handles incoming payment events (e.g., `invoice.paid`).
- Initial implementations faced issues with reliably linking users, logging metadata, and triggering enrollments due to timing and data flow between the initial payment intent and the webhook confirmation.

## Future State Goal
- A robust, reliable, and easy-to-understand payment and enrollment flow that:
  - Correctly logs initial `pending` transactions with essential metadata (`firstName`, `lastName`, `courseId`, etc.) *before* redirecting the user to pay.
  - Uses the webhook handler to confirm payment, update transaction status, and reliably retrieve transaction details (including metadata) from the database.
  - Creates Supabase Auth users and `unified_profiles` only for course buyers *after* successful payment confirmation via webhook.
  - Links the `user_id` to the corresponding transaction record.
  - Creates course enrollments idempotently after successful payment and user linking.
  - Logs all transactions (course and ebook) appropriately for analytics.
  - Follows best practices for asynchronous processing and data integrity.

## Implementation Plan & Rationale

**Overall Flow Rationale:** The chosen pattern separates the *initiation* of a payment from its *confirmation*. The initial server action (`createPaymentIntent`) prepares the payment with the provider (Xendit) and crucially logs a `pending` record locally with all necessary context. The asynchronous webhook then acts upon this existing local record, ensuring data consistency even if the webhook payload lacks details.

1.  **Refactor `createPaymentIntent` (`payment-actions.ts`)**
    - [x] **Accept `firstName`, `lastName` separately:** Ensures cleaner data handling from the start (passed from `papers-to-profits/page.tsx`).
    - [x] **Generate Timestamped `external_id`:** Creates a unique, human-readable ID (e.g., `inv-YYYYMMDDHHMMSS-xxxxxx`) used for linking our system to the Xendit invoice.
    - [x] **Call Xendit API:** Creates the invoice with Xendit.
    - [x] **Log Initial Transaction (`logTransaction`)**: 
        - **Action:** *Immediately after* successful Xendit API call, log a `pending` transaction locally.
        - **Rationale:** This is the **most critical step** for data integrity. It creates the authoritative record linked to the `external_id` *before* the user is redirected. This record contains the essential `metadata` (`firstName`, `lastName`, `courseId`, `plan`, etc.) provided by the user/frontend.
        - **Details:** `userId` is initially `null`. `externalId` uses the locally generated one. Amount is stored in **base currency units** (e.g., 1000.00, *not* cents).
    - [x] **Return `invoice_url`:** Send the URL back to the frontend for redirection.

2.  **Refactor Utility Functions (`payment-utils.ts`)**
    - [x] **`ensureAuthUserAndProfile`:**
        - **Action:** Accepts `firstName`, `lastName`. Handles duplicate user errors by using `supabase.auth.admin.listUsers` (more reliable than direct table queries on `auth.users`).
        - **Rationale:** Provides a robust way to create/find Auth users and upsert profiles, using the admin API as intended.
    - [x] **`logTransaction`:**
        - **Action:** Maps conceptual types ('course'/'ebook') to DB values ('P2P'/'Canva'). Accepts optional `paymentMethod`.
        - **Rationale:** Centralizes the logic for creating transaction records.
    - [x] **`createEnrollment`:**
        - **Action:** Inserts enrollment record, now includes `status: 'active'` to satisfy `NOT NULL` constraint. Logs success.
        - **Rationale:** Creates the link between a user and a course after payment.
    - [x] `storeEbookContactInfo`, `upgradeEbookBuyerToCourse` remain available.

3.  **Refactor Webhook Handler (`webhooks/xendit/route.ts`)**
    - **Overall Rationale:** The webhook acts as the confirmation step. It should *find* the existing transaction logged by `createPaymentIntent` and update it, using the data within that transaction record as the source of truth.
    - [x] **Verify Signature:** Ensures the request is genuinely from Xendit.
    - [x] **Fetch Transaction:** Uses the `external_id` from the webhook payload to find the corresponding transaction record in the database.
        - **If Found:** Proceeds with update and post-payment logic.
        - **If Not Found (Fallback - Less Ideal):** Logs the transaction itself using data available in the webhook payload. *This path indicates a failure in step 1.e and lacks reliable metadata.*
    - [x] **Update Transaction Status:** Sets `status` to `paid` (or `completed`) and importantly, updates `paid_at` using the timestamp from the webhook payload.
    - [x] **Handle P2P (Course) Post-Payment Actions:**
        - **Check `user_id`:** Determines if a user is already linked to this transaction.
        - **Ensure User & Link (if `user_id` is null):** 
            - **Action:** Calls `ensureAuthUserAndProfile` using `email`, `firstName`, `lastName` retrieved **from the fetched transaction's metadata**. Updates the transaction record itself with the returned `userId`.
            - **Rationale:** Creates/links the user *after* payment is confirmed and associates them directly with the transaction record.
        - **Enrollment:**
            - **Action:** Checks if an enrollment *already exists* for this `transaction_id` (idempotency check). If not, calls `createEnrollment` using the now-confirmed `userId` and the `courseId` from the transaction's metadata.
            - **Rationale:** Prevents duplicate enrollments if the webhook is received multiple times.
        - **Upgrade Logic:** 
            - **Action:** Calls `upgradeEbookBuyerToCourse` using names from transaction metadata.
            - **Note:** Current implementation runs this unconditionally. A TODO was added to implement proper conditional logic (e.g., check if the user *actually* had prior ebook purchases).
    - [x] **Handle Canva (Ebook) Post-Payment Actions:** Calls `storeEbookContactInfo`.

4.  **Testing and Validation**
    - [ ] Test P2P flow end-to-end: Verify initial log, webhook finds tx, status/paid_at update, user creation/linking, enrollment creation (check DB & logs).
    - [ ] Test Canva Ebook flow end-to-end: Verify initial log, webhook finds tx, status update, contact info storage.
    - [ ] Test webhook idempotency (simulate duplicate webhook for same `external_id`).
    - [ ] Validate analytics/BI queries work with updated transaction data.

## Notes & Best Practices Summary

- **Log Early, Confirm Later:** Log a `pending` transaction with full metadata during the initial user action (`createPaymentIntent`) *before* redirection. Use the asynchronous webhook solely for *confirmation* and triggering subsequent actions based on the already logged data.
- **Database is Source of Truth:** The webhook should rely on the data fetched from the database transaction record (especially metadata), not the potentially incomplete metadata within the webhook payload itself.
- **User Creation Timing:** For paid products requiring accounts, create the user account *after* successful payment confirmation (via webhook), not optimistically beforehand.
- **Idempotency:** Design webhooks to handle being called multiple times for the same event without causing duplicate actions (e.g., check if enrollment exists before creating).
- **Clear Separation:** Keep payment provider interaction (`createPaymentIntent`), database/utility logic (`payment-utils`), and asynchronous event handling (webhook) logically separated.
- **Metadata Strategy:** Store essential context needed for post-payment processing (like `courseId`, names, plan details) within the `transactions.metadata` field during the initial logging step.

## Completion Checklist
- [x] `createPaymentIntent` logs initial transaction with metadata.
- [x] `createPaymentIntent` logs amount in **base currency units**.
- [x] Webhook finds existing transaction using `external_id`.
- [x] Webhook updates status and `paid_at`.
- [x] Webhook handles user creation/linking *after* payment confirmation for courses.
- [x] Webhook retrieves details (`courseId`, names) from transaction metadata for enrollment/upgrade.
- [x] Enrollment creation includes `status` and has idempotency check.
- [x] `ensureAuthUserAndProfile` uses admin API correctly for duplicate checks.
- [ ] Frontend call in `papers-to-profits/page.tsx` passes separate `firstName`, `lastName`. (Assumed done based on prior steps, needs verification).
- [ ] Ebook upgrade logic needs conditional execution refinement.
- [ ] Full end-to-end testing for both product types.

---

### Progress Update (May 30, 2024)
- All modular utility functions are now implemented, robust, and well-commented:
  - `ensureAuthUserAndProfile`, `logTransaction`, `createEnrollment`, `storeEbookContactInfo`, `upgradeEbookBuyerToCourse`.
- Code is clean, modular, and follows project and industry best practices.
- **Next step:** Integrate and test these utilities in the main payment and enrollment flow (e.g., in `payment-actions.ts`).

---

> **Note to AI Developers:**
> - Review this build note before making changes to payment or enrollment logic.
> - Update this note as the implementation evolves.
> - Reference the project context and previous build notes for consistency. 