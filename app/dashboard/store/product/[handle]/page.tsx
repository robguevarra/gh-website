import React from 'react';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import ProductDetail from '@/components/store/ProductDetail';
import { Database } from '@/types/supabase';

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
    .eq('status', 'ACTIVE')
    .single();

  if (error || !data) {
    console.error('Error fetching product:', error);
    return null;
  }

  return data as ProductWithDetails;
}

// Get related products by tags
async function getRelatedProducts(productId: string, tags: string[]): Promise<ProductWithDetails[]> {
  const supabase = await createServerSupabaseClient();

  // Find products with similar tags, exclude the current product
  const { data, error } = await supabase
    .from('shopify_products')
    .select(`
      *,
      shopify_product_variants (
        id, 
        price
      )
    `)
    .neq('id', productId)
    .eq('status', 'ACTIVE')
    .limit(4);

  if (error || !data) {
    console.error('Error fetching related products:', error);
    return [];
  }

  return data as ProductWithDetails[];
}

// Product detail page component
export default async function ProductPage({ params }: { params: { handle: string } }) {
  const product = await getProductByHandle(params.handle);
  
  if (!product) {
    notFound();
  }

  // Get related products
  const tags = product.tags || [];
  const relatedProducts = await getRelatedProducts(product.id, tags);

  return (
    <ProductDetail product={product} relatedProducts={relatedProducts} />
  );
} 