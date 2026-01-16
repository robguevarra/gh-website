# Handoff: Public Store, Guest Access & License Updates
**Date:** January 16, 2026
**Focus:** Public Store Architecture, Guest Order Access, Email Resend Logic, Shop Licensing UI

This document details the complete implementation of the new **Public Store**, the refactoring of Guest Order Access, and the comprehensive update to the Shop's license display logic.

---

## 1. Public Store Architecture

We built a dedicated, login-free shopping experience at `/shop` that mirrors the functionality of the Student Dashboard but is optimized for public guests.

### Core Concept: "Same Components, Different Context"
Instead of duplicating the entire codebase, we refactored existing Dashboard components to support a "Public Mode".
*   **The `isPublic` Prop**: We introduced an optional `isPublic?: boolean` prop to key components (`ProductCard`, `ProductDetail`, `StoreStickyBar`).
*   **Behavior**: When `true`, this prop triggers public-specific logic (e.g., hiding "Member Only" badges, changing license text, switching cart stores).

### State Management: Dual Cart Systems
To prevent conflicts between logged-in students and public guests, we separated the cart state:
1.  **Student Cart (`stores/cartStore.ts`)**: Used in the Dashboard. Syncs with Supabase database.
2.  **Public Cart (`stores/publicCartStore.ts`)**: **[NEW]** Used in `/shop`. Persists validation-freely in `localStorage`.
    *   Uses the same item structure as the student cart.
    *   Integrated into `StoreResultsManager` to dynamically switch `onAddToCart` handlers based on the context (`cartStoreType="public"`).

### Page Structure
*   **Main Catalog (`app/shop/page.tsx`)**:
    *   Fetches the same `shopify_products` data as the dashboard.
    *   Renders `StoreHighlight` (Hero) and `StoreResultsManager`.
    *   Includes a sticky filters bar (`StoreStickyBar`) with `isPublic={true}`.
*   **Product Details (`app/shop/product/[handle]/page.tsx`)**:
    *   Renders the shared `ProductDetail` component.
    *   Automatically handles "Related Products" styling.

---

## 2. Guest Order Access (Instant Search)

We moved away from a "Magic Link" system to a simpler, lower-friction "Instant Search" approach for guests to retrieve their files.

### Workflow
1.  User enters email at `/shop/orders`.
2.  **Instant Lookup**: The page immediately displays a list of found orders.
    *   **Privacy**: Order numbers are masked (e.g., `****-A1B2`).
    *   **Security**: No sensitive data (download links) is shown on-screen.
3.  **Action**: User clicks **"Resend Email"** on a specific order.
4.  **Delivery**: A fresh "Order Confirmation" email is sent to the inbox containing the unique download link.

### Data Logic (`app/actions/guest-access.ts`)
The `getGuestOrders` function aggregates data from two sources to ensure all purchases are found:
*   **Modern Orders**: Queries `ecommerce_orders` linked to a `unified_profile`.
*   **Legacy/Direct Transactions**: Queries the `transactions` table directly for fallback (using `contact_email` and `status='paid'`).

---

## 3. Order Confirmation Email (Resend)

The "Resend Email" functionality was refactored to produce **exact visual parity** with the original checkout webhook email.

### Key Logic
*   **Template Source**: Logic was ported directly from `lib/webhooks/public-store-handler.ts`.
*   **"Open Folder" Button**:
    *   The system now looks up the `shopify_products` table for every item in the cart.
    *   It retrieves the specific `google_drive_file_id` to generate the correct Google Drive folder link.
    *   If no ID is found, it falls back to a "Processing..." state.
*   **Order Number**:
    *   Uses the Transaction `external_id` (e.g., `pub-sale-2026...`) instead of "N/A".
*   **Currency**: Enforced as **PHP** (`₱`) formatting.

---

## 4. Shop License Updates

We implemented a "Friendly" customer-facing license policy for the Public Shop, while keeping strict legal terms for the internal Student Dashboard.

### "Friendly Reminder" Text
A new, softer tone is used for the public store:
> "*To keep things fair and protect the work that went into creating these files... these files are for your personal or business use... but they may not be shared, resold, gifted, or passed on.*"

### UI Implementation
The `LicenseTerms` component (`components/store/LicenseTerms.tsx`) was upgraded to handle multiple contexts:

1.  **Product List (Hover/Popover)**:
    *   **Condensed View**: Uses `minimal={true}` prop.
    *   Shows a short "License Overview" with Check/X icons.
    *   Fits perfectly within hover popups.
2.  **Product Page (Details)**:
    *   **Full View**: Shows the complete "Friendly Reminder" and "Important Things to Know" sections.
    *   **Badge Override**: On the public shop (`isPublic={true}`), the badge always says **"Commercial License"** instead of "Mixed License Bundle" or "PLR".
3.  **Student Dashboard (Internal)**:
    *   Remains unchanged. Displays specific `CUR`/`PLR` terms.

---

## 5. Key Components Modified

| File Path | Description |
| :--- | :--- |
| `stores/publicCartStore.ts` | **[NEW]** Zustand store for guest cart management (LocalStorage). |
| `app/shop/page.tsx` | **Page**. The main public shop catalog. |
| `app/actions/guest-access.ts` | **Core Logic**. Handles guest order lookup & email resending. |
| `components/store/LicenseTerms.tsx` | **UI**. Central license text; handles `isPublic` & `minimal` states. |
| `components/store/StoreResultsManager.tsx` | **Logic**. Connects UI to the correct Cart Store (`public` vs `student`). |
| `components/store/ProductDetail.tsx` | **Page**. Renders product info; handles "Commercial License" badge override. |
| `components/store/ProductCard.tsx` | **UI**. Supports `isPublic` for hover text and add-to-cart behavior. |

---
*Generated by Antigravity*
