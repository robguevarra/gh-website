import React, { Suspense } from 'react';
// Import the CORRECT function for creating a server-side client
import { createServerSupabaseClient } from '@/lib/supabase/server';
// Remove unused client import if it existed before
// import { createClient } from '@supabase/supabase-js';
// Import components (ProductList is now rendered inside StoreSubheader)
// import ProductList from '@/components/store/ProductList'; 
import LoadingSkeleton from '@/components/store/LoadingSkeleton';
import StoreHero from '@/components/store/StoreHero';
import CategoryNavigation from '@/components/store/CategoryNavigation';
import SuccessShowcase from '@/components/store/SuccessShowcase';
import { Database } from '@/types/supabase'; // Assuming Supabase generated types
// Import the new SaleSection component
import SaleSection from '@/components/store/SaleSection';
// REMOVE the old handler
// import StoreSearchHandler from '@/components/store/StoreSearchHandler';
// IMPORT the new subheader
import StoreSubheader from '@/components/store/StoreSubheader';
// Import the action to get wishlist IDs
import { getWishlistedProductIds, searchProductsStore } from '@/app/actions/store-actions';
// Import the new components
import StoreStickyBar from '@/components/store/StoreStickyBar';
import StoreResultsManager from '@/components/store/StoreResultsManager';

// Base type for shopify_products row from generated types
type ShopifyProductRow = Database['public']['Tables']['shopify_products']['Row'];

// Define the structure of the product data we need for the frontend
export type ProductData = {
  id: string;
  title: string | null;
  handle: string | null;
  featured_image_url: string | null;
  price: number; // Price is now guaranteed by filter
  compare_at_price?: number | null;
};

// Type definition for the raw data structure returned by Supabase query
// It includes the base product row AND the nested variant price
type ProductWithVariantPrice = ShopifyProductRow & {
  shopify_product_variants: {
    price: number | string | null;
    compare_at_price?: number | string | null;
  }[];
};

// Fetch products intended for members from Supabase
// Renamed to getInitialStoreProducts as it fetches the initial set
async function getInitialStoreProducts(): Promise<ProductData[]> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from('shopify_products')
    .select(`
      id,
      title,
      handle,
      featured_image_url,
      shopify_product_variants (
        price,
        compare_at_price
      )
    `)
    .eq('status', 'ACTIVE')
    // Temporarily removed tag filter since none have 'access:members'
    // .contains('tags', ['access:members'])
    .not('shopify_product_variants', 'is', null)
    .limit(1, { foreignTable: 'shopify_product_variants' })
    // Revert to using the specific type now that types are regenerated
    .returns<ProductWithVariantPrice[]>();

  if (error) {
    console.error('Error fetching initial store products:', error);
    return [];
  }
  if (!data) {
    return [];
  }

  // Transform data using the correct types
  const products: ProductData[] = data
    .map((product: ProductWithVariantPrice): ProductData | null => {
      // Remove the explicit cast, use the parameter type directly
      const variant = product.shopify_product_variants?.[0];

      if (!variant || variant.price === null || variant.price === undefined || isNaN(Number(variant.price))) {
        console.warn(`Product ${product.id} (${product.title}) skipped, missing variant or invalid price.`);
        return null;
      }

      // Extract compare_at_price, ensuring it's a number or null
      let compareAtPrice: number | null = null;
      if (variant.compare_at_price !== null && variant.compare_at_price !== undefined) {
        const parsedCompareAtPrice = Number(variant.compare_at_price);
        if (!isNaN(parsedCompareAtPrice)) {
          compareAtPrice = parsedCompareAtPrice;
        }
      }

      // Access properties directly from the correctly typed 'product' parameter
      return {
        id: product.id,
        title: product.title,
        handle: product.handle,
        featured_image_url: product.featured_image_url,
        price: Number(variant.price),
        compare_at_price: compareAtPrice,
      };
    })
    .filter((product): product is ProductData => product !== null);

  return products;
}

// ProductListWithData component - REMOVED/REPLACED by fetch within page
// async function ProductListWithData() {
//   const products = await getInitialStoreProducts();
//
//   return (
//     <ProductList products={products} />
//   );
// }

// Define PageProps to include searchParams
interface PageProps {
  params: {};
  searchParams: { [key: string]: string | string[] | undefined };
}

// Store page component - server-side rendering
// Add props to receive searchParams
export default async function StorePage({ searchParams }: PageProps) {
  // Get search query from URL
  const query = typeof searchParams.q === 'string' ? searchParams.q : null;
  
  // Fetch initial/searched products AND wishlist IDs concurrently
  const [products, wishlistedIds] = await Promise.all([
    query ? searchProductsStore(query) : getInitialStoreProducts(),
    getWishlistedProductIds()
  ]);
  
  // Determine loading state for results manager (initially not loading on server)
  const isLoading = false; // ResultsManager handles its own transition loading

  return (
    <div className="">
      {/* RENDER THE STICKY BAR */}
      <Suspense fallback={<div>Loading Nav...</div>}> 
        <StoreStickyBar />
      </Suspense>

      {/* Conditionally render Hero and Sale sections only if NOT searching */}
      {!query && (
        <>
          {/* Hero Section - Reduced top padding */}
          <div className="pt-4 md:pt-6"> 
            <StoreHero />
          </div>

          {/* Sale Section - Reduced vertical padding */}
          <div className="py-4 md:py-6"> 
            <SaleSection />
          </div>
        </>
      )}

      {/* Category Navigation - Always visible, adjust top padding if searching */}
      {/* Add more top padding when search is active to account for removed sections */} 
      <div className={`container mx-auto px-4 py-4 md:py-6 ${query ? 'pt-6 md:pt-8' : ''}`}> 
        <CategoryNavigation activeCategory="all" />
      </div>

      {/* RENDER THE RESULTS MANAGER - Passes fetched data */}
      <StoreResultsManager 
        products={products} 
        isLoading={isLoading} // Pass initial loading state (false)
        searchTerm={query} // Pass search term for context
        initialWishlistedIds={wishlistedIds} 
      />

      {/* Success Showcase - Appears last, reduced vertical padding */}
      <div className="container mx-auto px-4 py-8 md:py-12"> 
        <SuccessShowcase />
      </div>

    </div>
  );
} 