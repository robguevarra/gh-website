'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { ProductData } from '@/lib/stores/student-dashboard'; // Reuse ProductData type
import { Database } from '@/types/supabase';
import { revalidatePath } from 'next/cache'; // To potentially update wishlist views

// Type definition for the raw data structure returned by Supabase query
type ProductWithVariantPrice = Database['public']['Tables']['shopify_products']['Row'] & {
    shopify_product_variants: {
        price: number | string | null;
        compare_at_price?: number | string | null;
    }[];
};

// --- Helper function for transforming product data --- 
function transformProductData(product: ProductWithVariantPrice): ProductData | null {
    const variant = product.shopify_product_variants?.[0];

    if (!variant || variant.price === null || variant.price === undefined || isNaN(Number(variant.price))) {
        console.warn(`Product ${product.id} (${product.title}) skipped, missing variant or invalid price.`);
        return null;
    }

    let compareAtPrice: number | null = null;
    if (variant.compare_at_price !== null && variant.compare_at_price !== undefined) {
        const parsedCompareAtPrice = Number(variant.compare_at_price);
        if (!isNaN(parsedCompareAtPrice)) {
            compareAtPrice = parsedCompareAtPrice;
        }
    }

    let images: string[] = [];
    if (Array.isArray(product.image_urls)) {
        images = product.image_urls.map((img: any) => {
            if (typeof img === 'string') return img;
            if (typeof img === 'object' && img !== null) {
                if ('src' in img) return img.src;
                if ('url' in img) return img.url;
            }
            return null;
        }).filter((url): url is string => typeof url === 'string');
    }

    // ... inside transformProductData
    return {
        id: product.id,
        title: product.title,
        handle: product.handle,
        featured_image_url: product.featured_image_url,
        images,
        description_html: product.description_html, // Map description
        price: Number(variant.price),
        compare_at_price: compareAtPrice,
    };
}
// --- End Helper --- 

// ... (existing getInitialStoreProducts - ensure it maps description if needed, or leave as is if not used) ...
// Actually, getInitialStoreProducts was NOT selecting description_html in the original file I viewed, 
// so I should probably leave it or add it if the user wants descriptions in the main store grid too.
// The user specifically complained about the **Advent** page description. 

// ... (searchProductsStore selects description_html already) ...

// ... (other functions) ...

/**
 * Fetches product details publically for the Advent Calendar.
 * Bypasses user authentication to allow public viewing.
 */
export async function getAdventProductByHandle(handle: string): Promise<ProductData | null> {
    const supabase = await createServerSupabaseClient();

    try {
        const { data: product, error } = await supabase
            .from('shopify_products')
            .select(`
                id,
                title,
                handle,
                description_html,
                featured_image_url,
                image_urls,
                shopify_product_variants (
                    price,
                    compare_at_price
                )
            `)
            .eq('handle', handle)
            .maybeSingle();

        if (error) {
            console.error(`Error fetching advent product ${handle}:`, error);
            return null;
        }

        if (!product) return null;

        return transformProductData(product as any);

    } catch (err) {
        console.error('Unexpected error fetching advent product:', err);
        return null;
    }
}

/**
 * Fetches multiple advent products by their handles in a single query.
 * Used to optimize the Advent Calendar grid loading.
 */
export async function getAdventProducts(handles: string[]): Promise<ProductData[]> {
    if (!handles || handles.length === 0) return [];

    const supabase = await createServerSupabaseClient();

    try {
        const { data, error } = await supabase
            .from('shopify_products')
            .select(`
                id,
                title,
                handle,
                description_html,
                featured_image_url,
                image_urls,
                shopify_product_variants (
                    price,
                    compare_at_price
                )
            `)
            .in('handle', handles);

        if (error) {
            console.error('Error fetching bulk advent products:', error);
            return [];
        }

        if (!data) return [];

        return data
            .map(p => transformProductData(p as any))
            .filter((p): p is ProductData => p !== null);

    } catch (err) {
        console.error('Unexpected error fetching bulk advent products:', err);
        return [];
    }
} 