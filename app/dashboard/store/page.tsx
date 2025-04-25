import React from 'react';
// Import the CORRECT function for creating a server-side client
import { createServerSupabaseClient } from '@/lib/supabase/server'; 
// Remove unused client import if it existed before
// import { createClient } from '@supabase/supabase-js'; 
import ProductList from '@/components/store/ProductList'; // Will be created next
import { Database } from '@/types/supabase'; // Assuming Supabase generated types

// Base type for shopify_products row from generated types
type ShopifyProductRow = Database['public']['Tables']['shopify_products']['Row'];

// Define the structure of the product data we need for the frontend
export type ProductData = {
  id: string;
  title: string | null;
  handle: string | null;
  featured_image_url: string | null;
  price: number; // Price is now guaranteed by filter
};

// Type definition for the raw data structure returned by Supabase query
// It includes the base product row AND the nested variant price
type ProductWithVariantPrice = ShopifyProductRow & {
  shopify_product_variants: { price: number | string | null }[];
};

// Fetch products intended for members from Supabase
async function getMemberProductsStore(): Promise<ProductData[]> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from('shopify_products')
    .select(`
      id,
      title,
      handle,
      featured_image_url, 
      shopify_product_variants ( price )
    `)
    .eq('status', 'active')
    .contains('tags', ['access:members'])
    .not('shopify_product_variants', 'is', null)
    .limit(1, { foreignTable: 'shopify_product_variants' })
    // Revert to using the specific type now that types are regenerated
    .returns<ProductWithVariantPrice[]>(); 

  if (error) {
    console.error('Error fetching member products:', error);
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
      
      // Access properties directly from the correctly typed 'product' parameter
      return {
        id: product.id,
        title: product.title,
        handle: product.handle,
        featured_image_url: product.featured_image_url, 
        price: Number(variant.price),
      };
    })
    .filter((product): product is ProductData => product !== null);

  return products;
}

// Store page component - now fetches data server-side
export default async function StorePage() {
  const products = await getMemberProductsStore();

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Member Store</h1>
      
      {products.length === 0 ? (
        <p>No products available at this time.</p>
      ) : (
        // Pass the fetched products to the client component
        <ProductList products={products} />
      )}
    </div>
  );
} 