
import React from 'react';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import ProductDetail from '@/components/store/ProductDetail';
import { Database } from '@/types/supabase';
import { getProductReviews } from '@/app/actions/store-actions';
import { Metadata } from 'next';

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
        .or('status.eq.ACTIVE,status.eq.active')
        .single();

    if (error || !data) {
        console.error('Error fetching main product OR product not found.', error);
        return null;
    }

    return data as ProductWithDetails;
}

// Get related products by tags
async function getRelatedProducts(productId: string, tags: string[]): Promise<ProductWithDetails[]> {
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
        .from('shopify_products')
        .select('id, title, handle, featured_image_url, image_urls, status, shopify_product_variants(id, price)') // Optimized select
        .neq('id', productId)
        .or('status.eq.ACTIVE,status.eq.active')
        .eq('vendor', 'Graceful Resources')
        .limit(4);

    if (error || !data) {
        return [];
    }

    return data as any; // Cast for now
}

export async function generateMetadata({ params }: { params: { handle: string } }): Promise<Metadata> {
    const product = await getProductByHandle(params.handle);
    if (!product) {
        return {
            title: 'Product Not Found',
        };
    }
    return {
        title: `${product.title} | Graceful Homeschooling Store`,
        description: product.description_html?.replace(/<[^>]*>?/gm, '').slice(0, 160) || 'Product details',
    };
}

export default async function PublicProductPage({ params }: { params: { handle: string } }) {
    const product = await getProductByHandle(params.handle);

    if (!product) {
        notFound();
    }

    const [relatedProducts, reviews] = await Promise.all([
        getRelatedProducts(product.id, product.tags || []),
        getProductReviews(product.id),
    ]);

    return (
        <ProductDetail
            product={product}
            relatedProducts={relatedProducts}
            reviews={reviews}
            ownedProductIds={[]} // Guests don't own products
            baseUrl="/shop" // Important for navigation
            isPublic={true}
        />
    );
}
