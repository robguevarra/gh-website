# Payment Actions - Phase 1: Payment and Enrollment Flow

## Task Objective
Document and implement the unified payment and enrollment flow in `payment-actions.ts`, covering:
- How to handle transactions for both course ("Papers to Profits") and ebook ("Canva Ebook") purchases
- When to create Auth users and unified profiles
- How to handle enrollments and transaction logging for both product types
- Industry best practices for user/account creation and data integrity

## Current State Assessment
- The codebase now uses a unified schema: `auth.users`, `unified_profiles`, `transactions`, and `enrollments`.
- The `updatePaymentStatus` function updates the `transactions` table and is called by the Xendit webhook handler.
- There are two product types: a course (with site access) and an ebook (lead magnet, no site access).
- Previously, all transactions assumed a user account, but ebook buyers should not have Auth users by default.

## Future State Goal
- Clean, modular logic for payment handling that:
  - Only creates Auth users and enrollments for course buyers
  - Logs all transactions (including ebook purchases) for analytics and marketing
  - Maintains referential integrity and follows industry best practices
  - Allows for seamless upgrade if an ebook buyer later purchases the course

## Implementation Plan

1. **Auth User Creation**
   - For course purchases ("Papers to Profits"), check if the user exists in `auth.users` by email.
   - If not, create the Auth user (with confirmed status).
   - Upsert the user's profile in `unified_profiles`.
   - For ebook purchases, do NOT create an Auth user or unified profile.

2. **Transaction Logging**
   - Log all transactions in the `transactions` table.
   - For course buyers, set `user_id` to the Auth user's ID.
   - For ebook buyers, set `user_id` to `NULL` and store their email in a `contact_email` or `metadata` field.

3. **Enrollment Creation**
   - For completed course transactions, create an enrollment in the `enrollments` table, linking to the user and transaction.
   - For ebook transactions, do NOT create an enrollment.

4. **Upgrade Path**
   - If an ebook buyer later purchases the course, create the Auth user and profile at that time.
   - Optionally, update previous transactions to link to the new user ID for a unified customer record.

5. **Testing and Validation**
   - Test with both product types to ensure correct account, transaction, and enrollment handling.
   - Validate that analytics and BI queries work as expected for both user and non-user transactions.

## Notes & Best Practices
- Only create Auth users for customers who need site access (course buyers).
- Always log all transactions for analytics, even if no user account is created.
- Store contact info for ebook buyers in transaction metadata for future marketing and upgrade opportunities.
- Maintain a clean, modular codebase with clear comments and robust error handling.
- Follow the project's naming conventions and documentation standards.

## Completion Checklist
- [ ] Modular utility for ensuring Auth user and profile creation for course buyers
- [ ] Transaction logging logic for both product types
- [ ] Enrollment creation for course buyers only
- [ ] Metadata/contact info storage for ebook buyers
- [ ] Upgrade path for ebook-to-course conversion
- [ ] Testing and validation for all flows

---

> **Note to AI Developers:**
> - Review this build note before making changes to payment or enrollment logic.
> - Update this note as the implementation evolves.
> - Reference the project context and previous build notes for consistency. 