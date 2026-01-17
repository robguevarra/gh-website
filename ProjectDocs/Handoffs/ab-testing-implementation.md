# Handoff: A/B Testing Implementation for P2P Order Form

## Overview
We have implemented a server-side A/B testing framework for the `/p2p-order-form` landing page. This custom solution uses Next.js Middleware to split traffic between two page variants with zero visual flicker and full SEO safety.

## Key Features
*   **Zero Flicker**: Variant assignment happens on the server before the browser renders anything.
*   **Sticky Sessions**: Users are assigned a cookie (`ab-test-variant`) that keeps them on the same variant for 30 days.
*   **SEO Safe**: The URL remains `/p2p-order-form` for all users (using Middleware Rewrites), preserving search rankings.
*   **Full Funnel Tracking**: We track Unique Visitors -> Checkout Attempts -> Completed Orders per variant.

## Configuration
The test is controlled via the `NEXT_PUBLIC_AB_TEST_STATUS` environment variable in your `.env` or Vercel settings.

| Value | Behavior |
| :--- | :--- |
| `RUNNING` | (Default) Random 50/50 split between Variant A and B. |
| `STOPPED_A` | Force ALL traffic to Variant A (Control). |
| `STOPPED_B` | Force ALL traffic to Variant B (Test). |

## File Structure
*   **Middleware**: `middleware.ts` (Handles the split logic)
*   **Variant A (Control)**: `app/p2p-order-form/page.tsx`
*   **Variant B (Test)**: `app/p2p-order-form/b/page.tsx`
*   **Shared Client Logic**: `app/p2p-order-form/p2p-order-client.tsx` (Receives `variant` prop to change UI)
*   **Dashboard**: `app/admin/ab-testing/page.tsx`

## Monitoring & Analytics
Access the real-time dashboard at:
**[Admin > A/B Testing](/admin/ab-testing)**

This dashboard visualizes:
1.  **Unique Visitors**: Based on `visitor_id` cookie.
2.  **Checkout Attempts**: Usage of the "Proceed to Payment" button.
3.  **Sales**: Completed transactions with revenue.
4.  **Conversion Rate**: Sales / Unique Visitors.

## How It Works (Technical)
1.  **Request**: User visits `/p2p-order-form`.
2.  **Middleware**: Checks specifically for this path.
    *   If `RUNNING`: Checks for `ab-test-variant` cookie.
    *   If no cookie, flips a coin (50/50) and sets the cookie.
    *   If Variant B is chosen, `rewrite` request to `/p2p-order-form/b`.
3.  **Page Load**: The browser sees `/p2p-order-form`, but the server renders the content of `/b`.
4.  **Tracking**:
    *   `PageTracker` logs the view with `metadata: { variant: 'B' }`.
    *   `createPaymentIntent` includes `metadata: { variant: 'B' }` in the payment intent.
    *   `logTransaction` saves this metadata to the `transactions` table.

## Future Maintenance
*   **To End the Test**: Set `NEXT_PUBLIC_AB_TEST_STATUS` to `STOPPED_B` (if B won) or `STOPPED_A`.
*   **To Make B Permanent**:
    1.  Copy content from `/b/page.tsx` to `/page.tsx`.
    2.  Update `/page.tsx` to force `variant="B"` (or update default in client).
    3.  Remove the middleware logic for `/p2p-order-form`.
