# Platform Integration - Phase 2-5: Shopify Purchase Integration

## Task Objective

Integrate the Shopify API with the student dashboard to display real purchase history and enable receipt download functionality, replacing the current mock purchase data with live Shopify store information to provide students with a comprehensive view of their purchases.

## Current State Assessment

The student dashboard (`app/dashboard2/page.tsx`) currently displays mock purchase data in the purchases section. This approach:

- Does not reflect students' actual purchase history from the Shopify store
- Lacks the ability to download receipts or access order details
- Cannot show real-time purchase status updates (processing, shipped, delivered)
- Misses opportunities for cross-selling or upselling based on purchase history
- Creates disconnected user experience between the shop and dashboard

While most of the UI structure exists in the dashboard, there is no:
- Data access layer for Shopify API integration
- Client-side hooks for fetching purchase data
- Proper error handling for API failures
- Loading states for purchase data
- Receipt generation or download functionality

## Future State Goal

A fully integrated purchase history section in the student dashboard that:

1. **Real-Time Purchase Data**
   - Displays actual student purchases from Shopify
   - Shows order status, dates, and details
   - Updates automatically when new purchases are made

2. **Enhanced User Experience**
   - Enables receipt download in PDF format
   - Provides order tracking capabilities when applicable
   - Offers reorder functionality for consumable products

3. **Administrative Features**
   - Links purchase data to student accounts for reporting
   - Enables administrators to view purchase history for support
   - Facilitates refund processing directly from the admin interface

4. **Optimized Performance**
   - Implements proper caching for Shopify API responses
   - Uses pagination for larger purchase histories
   - Minimizes API calls through efficient state management

## Implementation Plan

### 1. Shopify API Integration Setup

- [ ] Set up Shopify API credentials
  - [ ] Create API credentials in Shopify admin
  - [ ] Store API keys in environment variables
  - [ ] Set up appropriate CORS and security measures

- [ ] Create Shopify API client
  - [ ] Implement authentication handling
  - [ ] Set up request/response interfaces
  - [ ] Create error handling utilities

### 2. Data Access Layer Implementation

- [ ] Create data access functions for Shopify in `/lib/shopify/data-access.ts`
  - [ ] `getCustomerOrders(customerId)` - Fetch all orders for a customer
  - [ ] `getOrderDetails(orderId)` - Get detailed information about a specific order
  - [ ] `generateOrderReceipt(orderId)` - Generate downloadable receipt for an order

- [ ] Create customer matching functions
  - [ ] Map Supabase user IDs to Shopify customer IDs
  - [ ] Handle cases where customer might not exist in Shopify

### 3. Client-Side Hooks and State Management

- [ ] Implement Shopify hooks in `/lib/shopify/hooks.ts`
  - [ ] `useCustomerOrders(userId)` - Hook for fetching customer orders with SWR
  - [ ] `useOrderDetails(orderId)` - Hook for fetching specific order details

- [ ] Extend dashboard Zustand store for purchase data
  - [ ] Add purchase history state
  - [ ] Implement actions for fetching and updating purchase data
  - [ ] Create selectors for different purchase data views

### 4. UI Component Implementation

- [ ] Create `PurchasesSection` component in `/components/dashboard/purchases-section.tsx`
  - [ ] Implement responsive grid/list view for purchases
  - [ ] Add sorting and filtering capabilities
  - [ ] Create detailed expandable purchase items

- [ ] Implement receipt generation and download
  - [ ] Create PDF template for receipts
  - [ ] Implement download functionality
  - [ ] Add print options

- [ ] Implement loading and error states
  - [ ] Create skeleton loaders for purchase items
  - [ ] Design error messages for API failures
  - [ ] Add retry functionality for failed requests

### 5. Dashboard Integration

- [ ] Integrate purchases section in dashboard
  - [ ] Replace mock data with real purchase hook
  - [ ] Update UI to match real data structure
  - [ ] Ensure responsive design on all devices

- [ ] Implement pagination for large purchase histories
  - [ ] Add "load more" or traditional pagination UI
  - [ ] Optimize initial load performance
  - [ ] Implement virtual scrolling for large datasets if needed

### 6. Testing and Deployment

- [ ] Create comprehensive tests
  - [ ] Unit tests for Shopify API functions
  - [ ] Integration tests for purchase display
  - [ ] Test receipt generation with various order types

- [ ] Performance optimization
  - [ ] Audit render performance with real data
  - [ ] Implement proper memoization for expensive operations
  - [ ] Add appropriate caching headers for API responses

## Relevant Context

### From Project Context

From the `ProjectContext.md`, the following key points inform our Shopify integration approach:

- **Technical Foundation**: Next.js 15 with TypeScript, TailwindCSS, and Shadcn UI
- **State Management**: React hooks for local state, Zustand for more complex client-side state
- **API Integration**: API routes for payment processing and external service integration

### From Design Context

From the `designContext.md`, these design principles apply:

- **Typography**: Clear hierarchical structure with Inter for body text and Playfair Display for headings
- **Component Patterns**: Consistent styling for cards, buttons, and responsive tables
- **Animation Principles**: Subtle animations that enhance rather than distract from content

### From Previously Completed Phases

The student dashboard implementation (from `platform-integration_phase2-2_enrollment-system.md`) provides:

- **Dashboard Structure**: Overall layout and navigation patterns
- **State Management**: Zustand store patterns for global dashboard state
- **UI Patterns**: Card-based interfaces with proper loading and error states

### From Business Context

The Shopify integration must consider:

- Graceful Homeschooling maintains a Shopify store for selling digital and physical products
- Templates and commercial licenses are core products in the store
- Purchase history should emphasize the value of premium products
- Opportunities for cross-selling related products should be highlighted
- Receipt access is important for business expense records for customers
