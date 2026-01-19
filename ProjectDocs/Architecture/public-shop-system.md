# Public Shop System Architecture

**Last Updated:** January 19, 2026

## Overview

The **Public Shop** is a dedicated e-commerce experience at `/shop` designed for non-authenticated guests and the general public. Unlike the student dashboard, it facilitates quick, login-free purchasing and "Guest Access" for retrieving past orders.

This document details the architecture, data flow, and specific logic for the public shop, including the differentiation from the student shop.

## 1. Core Architecture

### 1.1 "Same Components, Different Context"
To maintain consistency and reduce code duplication, the Public Shop reuses the same core UI components as the Student Dashboard but applies a specific "Public Mode".

*   **Key Prop:** `isPublic={true}`
*   **Affected Components:**
    *   `ProductCard`: Modifies "Add to Cart" behavior and hides member badges.
    *   `ProductDetail`: Shows "Commercial License" badges instead of specific student license details.
    *   `StoreStickyBar`: Adapts filters and cart interactions for public users.
    *   `LicenseTerms`: Usage "Friendly" language suitable for public customers.

### 1.2 Dual Cart System
The application maintains two separate state managers for shopping carts to prevent data collisions between a user's logged-in student state and their public browsing state.

| Feature | Student Cart | Public Cart |
| :--- | :--- | :--- |
| **Store File** | `stores/cartStore.ts` | `stores/publicCartStore.ts` |
| **Persistence** | Database (`user_carts`) + LocalStorage | LocalStorage Only |
| **Validation** | Strict RLS & Inventory Checks | Client-side (Validated at Checkout) |
| **Context** | Dashboard (`/dashboard/*`) | Public Shop (`/shop/*`) |

---

## 2. Guest Order Access (Order Lookup)

The **Guest Order Lookup** tool at `/shop/orders` allows customers to retrieve download links for past purchases without creating an account.

### 2.1 The "Strict Filter" Logic

A critical requirement of the system is to strictly separate **Public Shop** purchases from **Student Shop** purchases.

*   **Public Shop Orders**: Made via `/shop`. Can be looked up by any guest using their email.
*   **Student Shop Orders**: Made via `/dashboard`. **Cannot** be looked up via the guest tool; students must log in to their dashboard.

### 2.2 Implementation Details

The `getGuestOrders` function in `app/actions/guest-access.ts` manages this logic.

#### Deprecated/Removed Logic
*   We **do not** query the `ecommerce_orders` table. That table is exclusively used for tracking student orders linked to `unified_profiles`.

#### Current Logic (Active)
We query the `transactions` table directly with strict filters:

```typescript
const { data: rawTransactions } = await supabase
    .from('transactions')
    .select('id, created_at, status, metadata, external_id')
    .eq('contact_email', cleanEmail)
    .eq('status', 'paid')
    .eq('transaction_type', 'PUBLIC_STORE_SALE'); // <--- CRITICAL FILTER
```

**Why this matters:**
This prevents a scenario where a student enters their email in the public lookup and sees their private dashboard purchases, which might confuse them regarding where they should be accessing their content.

---

## 3. Order Processing & Fulfillment

### 3.1 Transaction Types
The system uses `transaction_type` to distinguish the origin of a sale.

*   `PUBLIC_STORE_SALE`: Originated from `/shop`. Processed by `publicCheckoutActions.ts`.
*   `SHOPIFY_ECOM`: Originated from `/dashboard`. Processed by `checkoutActions.ts`.

### 3.2 Webhook Handling
Xendit webhooks (`app/api/webhooks/xendit/route.ts`) delegate fulfillment based on this type.

*   **If `PUBLIC_STORE_SALE`**:
    *   Calls `lib/webhooks/public-store-handler.ts`.
    *   Grants Google Drive permissions to the email provided.
    *   Sends a "Shopify Order Confirmation" email with the download links.
    *   **Does NOT** create a record in `ecommerce_orders` (keeps guest data lightweight).

*   **If `SHOPIFY_ECOM`**:
    *   Verifies `user_id`.
    *   Creates a record in `ecommerce_orders` for dashboard persistence.
    *   Grants permissions and cleans up the database cart.

---

## 4. Key Files

| File Path | Responsibility |
| :--- | :--- |
| `app/shop/**` | Public-facing pages (Catalog, Product, Orders). |
| `app/actions/guest-access.ts` | **Guest Lookup Logic**. Strictly filters for `PUBLIC_STORE_SALE`. |
| `app/actions/publicCheckoutActions.ts` | **Payment Initiation**. Creates transactions with type `PUBLIC_STORE_SALE`. |
| `lib/webhooks/public-store-handler.ts` | **Fulfillment**. Handles email & drive access for public orders. |
| `stores/publicCartStore.ts` | **State**. Manages the cart for non-logged-in users. |
