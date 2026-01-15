import React, { Suspense } from 'react';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import StoreResultsManager from '@/components/store/StoreResultsManager';
import StoreStickyBar from '@/components/store/StoreStickyBar';
import { ProductData } from '@/lib/stores/student-dashboard';
import LoadingSkeleton from '@/components/store/LoadingSkeleton';
import { ShopHero } from '@/components/shop/ShopHero';
import { searchProductsStore } from '@/app/actions/store-actions';

// --- DATA FETCHING ---
async function getInitialProducts() {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('shopify_products')
    .select(`
      *,
      shopify_product_variants (
        id,
        price,
        compare_at_price
      )
    `)
    .or('status.eq.ACTIVE,status.eq.active')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching products:', error);
    return [];
  }

  // Transform data to match ProductData type if needed, similar to store-actions logic
  // However, since we are mimicking the dashboard behavior, maybe we should just use 
  // the same action from store-actions if possible?
  // getInitialStoreProducts() exists in store-actions. Let's use that instead of re-implementing!
  // But wait, the existing code here had a direct query. 
  // To ensure consistency, I'll stick to what was here but just return data casted.
  // Actually, using the action is safer for type transformation.
  // I will check if getInitialStoreProducts is exported. Yes, viewed in Step 412.
  return data as unknown as ProductData[];
}

import { getInitialStoreProducts } from '@/app/actions/store-actions';

export const dynamic = 'force-dynamic';

export default async function ShopPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = await props.searchParams;
  const searchTerm = typeof searchParams.q === 'string' ? searchParams.q : '';

  // 1. Fetch data based on search or initial load
  let products: ProductData[] = [];

  if (searchTerm) {
    products = await searchProductsStore(searchTerm);
  } else {
    products = await getInitialStoreProducts();
  }

  // For guests, owned products is alway empty
  const ownedProductIds: string[] = [];
  const wishlistedIds: string[] = [];

  return (
    <div className="relative min-h-screen pb-20 bg-background">
      {/* Hero Section */}
      <ShopHero />

      {/* Sticky Search/Filter Bar */}
      <Suspense fallback={<div className="h-16 w-full bg-muted/20 animate-pulse" />}>
        <StoreStickyBar isPublic={true} />
      </Suspense>

      <div className="container mx-auto px-4 py-8">
        <StoreResultsManager
          products={products}
          ownedProductIds={ownedProductIds}
          baseUrl="/shop" // Important: navigation base URL
          isLoading={false}
          searchTerm={searchTerm}
          initialWishlistedIds={wishlistedIds}
          cartStoreType="public"
        />
      </div>
    </div>
  );
}