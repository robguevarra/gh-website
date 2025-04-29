import React from 'react';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import ProductDetail from '@/components/store/ProductDetail';
import { Database } from '@/types/supabase';
import { getProductReviews, ProductReviewWithProfile } from '@/app/actions/store-actions';
import { getOwnedProductIds } from '@/app/actions/userActions';

// Define the type for a product with all details
type ProductWithDetails = Database['public']['Tables']['shopify_products']['Row'] & {
  shopify_product_variants: { 
    id: string;
    price: number | null;
  }[];
  description_html?: string | null;
  image_urls?: {
    url: string;
    altText: string | null;
  }[] | null;
};

// Fetch a single product by handle from Supabase
async function getProductByHandle(handle: string): Promise<ProductWithDetails | null> {
  console.log(`DEBUG: Attempting to fetch product with handle: ${handle}`); // Log entry
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from('shopify_products')
    .select(`
      *,
      shopify_product_variants (
        id, 
        price
      )
    `)
    .eq('handle', handle)
    .or('status.eq.ACTIVE,status.eq.active')
    .single();

  // Log result
  console.log('DEBUG: Raw result from Supabase for getProductByHandle:', { data: data ? { id: data.id, title: data.title } : null, error });

  if (error || !data) {
    console.error('Error fetching main product OR product not found.', error);
    return null;
  }

  console.log(`DEBUG: Successfully fetched product: ${data.id}`);
  return data as ProductWithDetails;
}

// Get related products by tags
async function getRelatedProducts(productId: string, tags: string[]): Promise<ProductWithDetails[]> {
  const supabase = await createServerSupabaseClient();
  console.log(`DEBUG: Fetching related products, excluding ID: ${productId}`); // Log input

  const { data, error } = await supabase
    .from('shopify_products')
    .select('id, title, status') // Simplified select for debugging
    .neq('id', productId)
    .or('status.eq.ACTIVE,status.eq.active')
    .limit(4);

  // Log the raw result BEFORE the check
  console.log('DEBUG: Raw result from Supabase for related products:', { data, error });

  if (error || !data || data.length === 0) { // Explicitly check for empty array too
    console.error('Error fetching related products OR no matching products found.');
    if (error) {
      console.error('Supabase error details:', { 
        message: error.message, 
        details: error.details, 
        hint: error.hint, 
        code: error.code 
      });
    } else if (!data) {
      console.error('Query returned null/undefined data.');
    } else { // data must be []
      console.log('Query executed successfully but returned an empty array (no matching products found meeting criteria).');
    }
    return [];
  }

  console.log(`DEBUG: Found ${data.length} related products initially.`); 
  // TODO: Revert select statement and casting later
  // For now, we can't properly cast to ProductWithDetails[] with the simplified select
  // Returning an empty array temporarily until we confirm data is fetched.
  // return data as ProductWithDetails[]; 
  return []; // Return empty for now to avoid type errors with simplified select
}

// Product detail page component
export default async function ProductPage({ params }: { params: { handle: string } }) {
  console.log('DEBUG: ProductPage component execution started.'); // Log page start
  
  // Await params before accessing properties
  const resolvedParams = await Promise.resolve(params);
  console.log(`DEBUG: Resolved handle: ${resolvedParams.handle}`);
  
  // Fetch the main product first using the resolved handle
  const product = await getProductByHandle(resolvedParams.handle);
  
  if (!product) {
    console.log(`DEBUG: Product with handle '${resolvedParams.handle}' not found or fetch failed. Calling notFound().`);
    notFound(); // Exit early if product not found
  }

  console.log(`DEBUG: Main product ${product.id} found. Preparing to fetch related data.`); // Log before Promise.all
  
  // Now that we have the product, fetch related data concurrently
  const [relatedProducts, reviews, ownedProductIds] = await Promise.all([
    getRelatedProducts(product.id, product.tags || []),
    getProductReviews(product.id), // Use product ID for consistency
    getOwnedProductIds()
  ]);

  console.log('DEBUG: Successfully fetched related data.'); // Log after Promise.all

  return (
    <ProductDetail 
        product={product} 
        relatedProducts={relatedProducts} 
        reviews={reviews} 
        ownedProductIds={ownedProductIds} 
    />
  );
} 