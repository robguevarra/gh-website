# Shopify E-commerce Integration - Phase 5-2-3: Advanced Store Features

## Task Objective
Implement advanced e-commerce features to significantly enhance the member-facing storefront experience. This includes adding product search, a wishlist/favorites system, accessible purchase history, a quick view modal for products, and a product reviews/ratings system.

## Current State Assessment
- The storefront (`/dashboard/store`) has core browsing (Phase 5-2), enhanced UI/UX (Phase 5-2-1), and basic refinements like PHP currency, extra cart links, and a sale section (Phase 5-2-2).
- No dedicated search functionality exists specifically within the store section.
- Users cannot save products for later (no wishlist).
- Accessing past commercial license purchases might require navigating general account settings, lacking direct integration within the store context.
- Viewing product details requires navigating to the full product detail page.
- There is no mechanism for members to leave or view reviews/ratings for the commercial licenses.

## Future State Goal
1.  **Improved Search:** A dedicated search bar is added to the store page (`/dashboard/store`), allowing members to quickly find products based on keywords in titles, descriptions, or tags.
2.  **Wishlist/Favorites:** Members can add/remove products to/from a personal wishlist. The wishlist is persistent and accessible via the UI (e.g., header icon or account section link).
3.  **Purchase History:** A dedicated section or page, easily accessible from the store or account area, lists all previously purchased commercial licenses for the logged-in member, potentially with links to the product or related resources.
4.  **Quick View:** A "Quick View" button appears on product cards, opening a modal window displaying key product details (images, price, short description, license type) and an "Add to Cart" button, without leaving the main store page.
5.  **Product Reviews/Ratings:** Members who have purchased a license can submit a rating (e.g., 1-5 stars) and a written review. Average ratings are displayed on product cards and detail pages, with full reviews visible on the product detail page.

## Relevant Context

> **Important**: When working on this build note, always ensure proper context integration from:
> 1.  Phase 5-0: Strategy & Architecture - Overall e-commerce goals, Shopify as PIM.
> 2.  Phase 5-1: Backend Setup - `products` table structure, sync process.
> 3.  Phase 5-2: Frontend - Product Display & Cart - Core `ProductList`, `ProductCard`, `CartView` components.
> 4.  Phase 5-2-1: Storefront Enhancements - `ProductDetail` page structure, UI refinements.
> 5.  Phase 5-2-2: Post-Enhancement Refinements - Currency formatting, sale section implementation.
> 6.  Project Context (`ProjectContext.md`) - Tech stack (Next.js, Supabase, RSC, Zustand), PWA structure, data models (`unified_profiles`, potentially `orders`, `order_items`).
> 7.  Design Context (`designContext.md`) - UI patterns, component library (Shadcn), visual styles.
> 8.  Build Notes Guidelines (`build-notes-guidelines.md`) - Documentation standards.
>
> This ensures consistency and alignment with project goals and standards.

### From Previous Phases (5-0 to 5-2-2)
- The foundation for displaying products (`ProductCard`, `ProductDetail`) exists.
- User authentication (`useAuth`) and profile data (`unified_profiles`) are available.
- A mechanism for tracking purchases (`transactions`, `orders`, `order_items` - planned/implemented in Phase 5-3) is crucial for enabling Purchase History and qualifying users for Reviews.
- Client-side state management (Zustand for cart) patterns exist, potentially adaptable for Quick View state.

### From Project Context & Data Models
- User identity is tied to `auth.users` and potentially `unified_profiles`.
- New database tables will likely be needed for `wishlist_items` and `product_reviews`.
- Search functionality might leverage Supabase's full-text search capabilities or require specific indexing.
- Purchase history will query the `orders` and `order_items` tables (linked to the user).

## Implementation Plan (High-Level)

### 1. Implement Store Search
    *   [ ] **UI:** Add a search input component (using Shadcn `Input`) to the `/dashboard/store` page.
    *   [ ] **Backend/Data Fetching:** Implement a server action or API route that takes a search query and performs a search against the Supabase `products` table (e.g., using `fts` or `ilike` on relevant text fields like `title`, `description`, `tags`).
    *   [ ] **Frontend Logic:** Update the store page to trigger the search on input change (debounced) or submission, display results (potentially replacing the main product list or in a dedicated results view), and handle loading/no-results states.
    *   [ ] **Indexing (If needed):** Configure appropriate full-text search indexing on Supabase `products` table columns for performance.

### 2. Implement Wishlist/Favorites
    *   [ ] **Database Schema:** Define and create a `wishlist_items` table in Supabase (e.g., `user_id`, `product_id`, `created_at`). Apply RLS policies.
    *   [ ] **UI:** Add a "heart" or "add to wishlist" button/icon to `ProductCard` and `ProductDetail`.
    *   [ ] **Backend Logic:** Create server actions/API routes to add/remove items from the `wishlist_items` table for the logged-in user.
    *   [ ] **Frontend Logic:** Implement client-side logic to call add/remove actions, update the UI state of the wishlist button (e.g., filled vs. outline heart), and potentially display a toast notification.
    *   [ ] **Wishlist View:** Create a dedicated page or section (e.g., `/dashboard/wishlist` or part of the account) to display the user's saved items, fetching data from the `wishlist_items` table.

### 3. Implement Purchase History (Store Context)
    *   [ ] **Data Fetching:** Create logic (likely server-side) to fetch the logged-in user's past orders/order items related to commercial licenses from the Supabase `orders` and `order_items` tables (requires Phase 5-3 completion).
    *   [ ] **UI:** Design and implement a component or page (e.g., `/dashboard/purchase-history` or within account) to display the fetched purchase history, including product name, date, price paid, and potentially a link to the product or related resources.
    *   [ ] **Accessibility:** Ensure the history is easily navigable and accessible from the main store or user account area.

### 4. Implement Quick View Modal
    *   [ ] **UI - Button:** Add a "Quick View" button overlay or icon to `ProductCard`.
    *   [ ] **UI - Modal:** Create a new component `QuickViewModal` (using Shadcn `Dialog`) that displays essential product info (image carousel, title, price, short description, license type summary, add-to-cart button).
    *   [ ] **State Management:** Use client-side state (e.g., Zustand slice or simple `useState` in the store page) to manage the modal's open/closed state and the product data being displayed.
    *   [ ] **Data Fetching:** When the Quick View button is clicked, fetch the necessary detailed product data (if not already available on the client) or pass existing data to the modal.
    *   [ ] **Interaction:** Ensure the "Add to Cart" button within the modal correctly adds the item using the existing `useCartStore` logic and provides feedback (e.g., closes modal, shows toast).

### 5. Implement Product Reviews/Ratings
    *   [ ] **Database Schema:** Define and create a `product_reviews` table (e.g., `id`, `user_id`, `product_id`, `rating`, `comment`, `created_at`, `is_approved`). Apply RLS policies.
    *   [ ] **UI - Submission:** On the `ProductDetail` page, add a form for users who have purchased the product (check against purchase history) to submit a rating and review.
    *   [ ] **Backend - Submission:** Create a server action/API route to validate and save the submitted review to the `product_reviews` table.
    *   [ ] **UI - Display:**
        *   Modify `ProductCard` to display the average rating (e.g., star icons) if reviews exist.
        *   Modify `ProductDetail` page to display the average rating prominently and list individual reviews (fetched from Supabase).
    *   [ ] **Data Fetching:** Implement logic to fetch reviews and calculate average ratings for products.
    *   [ ] **Moderation (Optional):** Consider adding an `is_approved` flag and an admin interface step for review moderation if needed.

## Technical Considerations

### Database Design
- Carefully design schemas for `wishlist_items` and `product_reviews` with appropriate relationships (user, product) and indexes.
- Implement strict Row Level Security (RLS) policies to ensure users can only access/modify their own wishlist items and reviews, and only submit reviews for products they've purchased.

### Performance
- Optimize database queries, especially for search, fetching reviews/ratings, and purchase history.
- Consider caching strategies for frequently accessed data like average ratings.
- Ensure efficient data fetching for Quick View modals.

### State Management
- Decide on the appropriate state management approach for Quick View (local vs. global) and Wishlist button states (optimistic UI updates?).

### User Experience
- Provide clear feedback for actions (adding to wishlist, submitting reviews).
- Ensure seamless integration of these features into the existing store UI.
- Handle edge cases (e.g., user not logged in attempting wishlist action, user trying to review unpurchased product).

## Completion Status
Not Started.

## Next Steps After Completion
Begin implementation of the features outlined above, likely prioritizing based on perceived user value or technical dependencies (e.g., Purchase History depends on Phase 5-3). This phase represents significant enhancements and may be broken down further into sub-phases if needed.

---

> **Note to AI Developers**: When working with this project, always ensure that you:
> 1. Review previously completed build notes for context and established patterns (esp. Phase 5-0 through 5-2-2).
> 2. Consult the implementation strategy and architecture planning documents (`ProjectContext.md`, `designContext.md`).
> 3. Align your work with the project context and design context guidelines.
> 4. Follow the established folder structure, naming conventions, and coding standards (`build-notes-guidelines.md`).
> 5. Include this reminder in all future build notes to maintain consistency. 