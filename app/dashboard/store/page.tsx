'use client';

import React, { Suspense, useEffect, useState, useCallback } from 'react';
// import { createServerSupabaseClient } from '@/lib/supabase/server'; // REMOVED: Using client-side fetching
import LoadingSkeleton from '@/components/store/LoadingSkeleton';
import CategoryNavigation from '@/components/store/CategoryNavigation';
import SuccessShowcase from '@/components/store/SuccessShowcase';
import { Database } from '@/types/supabase'; // Keep types
import SaleSection from '@/components/store/SaleSection';
import { getWishlistedProductIds, searchProductsStore } from '@/app/actions/store-actions'; // Keep server actions for now
// import { getOwnedProductIds } from '@/app/actions/userActions'; // Keep for now
import StoreStickyBar from '@/components/store/StoreStickyBar';
import StoreResultsManager from '@/components/store/StoreResultsManager';
import WelcomeStoreWrapper from '@/components/store/WelcomeStoreWrapper';
import { useStudentDashboardStore, ProductData, StoreCollection } from '@/lib/stores/student-dashboard'; // UPDATED import
import { useSearchParams } from 'next/navigation'; // ADDED: Hook for client-side search params
import { useAuth } from '@/context/auth-context'; // ADDED

// Base type for shopify_products row from generated types
type ShopifyProductRow = Database['public']['Tables']['shopify_products']['Row'];

// Type definition for the raw data structure returned by Supabase query
// It includes the base product row AND the nested variant price
type ProductWithVariantPrice = ShopifyProductRow & {
  shopify_product_variants: {
    price: number | string | null;
    compare_at_price?: number | string | null;
  }[];
};

// Store page component - NOW A CLIENT COMPONENT
export default function StorePage() { // REMOVED: Props { searchParams } - use hook instead
  const searchParams = useSearchParams(); // ADDED: Get search params client-side
  const query = searchParams.get('q');
  const collectionHandle = searchParams.get('collection');

  // Get actions and state from Zustand store using individual selectors
  // REMOVED: userId selector
  // const userId = useStudentDashboardStore(state => state.userId);
  const storeProducts = useStudentDashboardStore(state => state.storeProducts);
  const isLoadingStoreProducts = useStudentDashboardStore(state => state.isLoadingStoreProducts);
  const hasStoreProductsError = useStudentDashboardStore(state => state.hasStoreProductsError);
  const storeCollections = useStudentDashboardStore(state => state.storeCollections);
  const isLoadingStoreCollections = useStudentDashboardStore(state => state.isLoadingStoreCollections); // Keep if needed for CategoryNav loading state
  const hasStoreCollectionsError = useStudentDashboardStore(state => state.hasStoreCollectionsError); // Keep if needed for CategoryNav error state
  const loadStoreProducts = useStudentDashboardStore(state => state.loadStoreProducts);
  const loadStoreCollections = useStudentDashboardStore(state => state.loadStoreCollections);
  
  // Get user from Auth context
  const { user, isLoading: isAuthLoading } = useAuth(); // ADDED
  const userId = user?.id; // Use user ID from auth context

  // State for data fetched via server actions (keep for now)
  const [wishlistedIds, setWishlistedIds] = useState<string[]>([]);
  const [ownedProductIds, setOwnedProductIds] = useState<string[]>([]);
  // REMOVED: useState for collections - now from store
  // const [collections, setCollections] = useState<{ handle: string }[]>([]); 

  // Fetch wishlist and owned IDs on mount (server actions)
  useEffect(() => {
    getWishlistedProductIds().then(setWishlistedIds);
    // getOwnedProductIds().then(setOwnedProductIds);
  }, []); // Runs once on mount

  // Fetch store products and collections using Zustand store actions
  useEffect(() => {
    // Fetch collections (always needed for navigation)
    loadStoreCollections(); // Force = false by default, respects staleness
  }, [loadStoreCollections]);

  // Track previous filter values to detect actual changes - REMOVED
  // const prevQuery = React.useRef(query);
  // const prevCollectionHandle = React.useRef(collectionHandle);
  const isInitialRender = React.useRef(true); // Track initial render

  // REMOVED: Effect to mark initial render as done AFTER mount
  /*
  useEffect(() => {
    // This runs only once after the component mounts
    isInitialRender.current = false;
    // Initialize refs with the initial values from props/searchParams
    prevQuery.current = query;
    prevCollectionHandle.current = collectionHandle;
  }, []);
  */

  // Effect for Filter Changes: Fetch products ONLY when query or collection actually changes
  useEffect(() => {
    console.log(`[StorePage] Filter useEffect running. Auth UserID: ${userId}, Query: ${query}, Collection: ${collectionHandle}`);

    // Skip the very first run after mount. Let initial load handle the first fetch.
    if (isInitialRender.current) {
      console.log("[StorePage] Filter useEffect skipped (initial render).");
      isInitialRender.current = false; // Set flag for subsequent runs
      return;
    }

    // Skip only if userId is not available yet.
    if (!userId) { 
      console.log(`[StorePage] Filter useEffect skipped (no userId).`);
      return;
    }
    
    // REMOVED: Check if filters have actually changed using refs 
    /*
    if (query === prevQuery.current && collectionHandle === prevCollectionHandle.current) {
      console.log(`[StorePage] Filter useEffect skipped (filters haven't changed).`);
      return; 
    }
    */

    console.log(`[StorePage] Filter change detected (run > 1). Calling loadStoreProducts with filter: ${JSON.stringify({ query, collectionHandle })}`);
    // Force the fetch when filters change, bypassing staleness check
    loadStoreProducts(userId, { query, collectionHandle }, true); // ADDED force: true

    // REMOVED: Update refs 
    /*
    prevQuery.current = query;
    prevCollectionHandle.current = collectionHandle;
    */

  }, [userId, query, collectionHandle, loadStoreProducts]); // Keep dependencies

  // Determine loading state (primarily for products, could add collections too if needed)
  const isLoading = isLoadingStoreProducts; // Use store loading state
  const error = hasStoreProductsError ? "Failed to load products." : null; // Use store error state

  // Determine if the page should show hero/sale sections based on URL query params
  const showFullExperience = !query && !collectionHandle && !searchParams.get('filter');

  return (
    <div className="relative">
      {/* Render the welcome modal via client wrapper component */}
      <WelcomeStoreWrapper hideForDays={30} />

      {/* RENDER THE STICKY BAR */}
      <Suspense fallback={<div className="h-12 bg-background/80 backdrop-blur-sm"></div>}>
        <StoreStickyBar />
      </Suspense>

      {/* Conditionally render Sale section */}
      {showFullExperience && (
        <Suspense fallback={<div>Loading Sale Section...</div>}>
          <SaleSection />
        </Suspense>
      )}

      {/* Render Category Navigation */}
      <div className="container mx-auto px-4 py-6">
        <CategoryNavigation 
          collections={storeCollections}
          activeCollectionHandle={collectionHandle ?? 'all'} 
        />
      </div>

      {/* Main content area: Product List or Loading/Error State */}
      <div className="container mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold mb-6">Store Products</h2>
        {/* Display error message if needed */} 
        {error && <div className="text-red-500 text-center mb-4">{error}</div>}
        {/* Use StoreResultsManager to handle display based on store state */} 
        <Suspense fallback={<LoadingSkeleton />}> 
          <StoreResultsManager
            products={storeProducts}
            isLoading={isLoading}
            initialWishlistedIds={wishlistedIds}
            ownedProductIds={ownedProductIds}
            searchTerm={query ?? ''} 
          />
        </Suspense>
      </div>

      {/* MOVED: Conditionally render Success Showcase after product list */}
      {showFullExperience && (
        <div className="container mx-auto px-4 pb-12"> {/* Added padding bottom */} 
          <Suspense fallback={<div>Loading Showcase...</div>}>
            <SuccessShowcase />
          </Suspense>
        </div>
      )}

    </div>
  );
} 