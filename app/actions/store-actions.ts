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

    return {
        id: product.id,
        title: product.title,
        handle: product.handle,
        featured_image_url: product.featured_image_url,
        images,
        description_html: product.description_html, // Ensure this is mapped
        price: Number(variant.price),
        compare_at_price: compareAtPrice,
    };
}
// --- End Helper --- 

/**
 * Fetches the initial set of products for the store page (no search query).
 * 
 * @returns A promise resolving to an array of ProductData.
 */
export async function getInitialStoreProducts(): Promise<ProductData[]> {
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
            .or('status.eq.ACTIVE,status.eq.active')
            .eq('vendor', 'Graceful Resources') // Filter by vendor
            .not('shopify_product_variants', 'is', null)
            .limit(1, { foreignTable: 'shopify_product_variants' })
            // Add ordering if desired, e.g., by creation date
            .order('created_at', { ascending: false })
            .returns<ProductWithVariantPrice[]>();

        if (error) {
            console.error('Error fetching initial store products:', error);
            return [];
        }
        if (!data) {
            return [];
        }

        // Transform data using the helper
        const products: ProductData[] = data
            .map(transformProductData)
            .filter((product): product is ProductData => product !== null);

        return products;
    } catch (err) {
        console.error('Unexpected error fetching initial products:', err);
        return [];
    }
}

/**
 * Server action to search for products based on a query string.
 * Searches title and description fields using case-insensitive matching.
 * 
 * @param query The search term.
 * @returns A promise resolving to an array of matching ProductData.
 */
export async function searchProductsStore(query: string): Promise<ProductData[]> {
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
        // If query is empty or invalid, maybe return all products or an empty array?
        // Returning empty for now, assuming search requires a term.
        return [];
    }

    const supabase = await createServerSupabaseClient();
    const searchTerm = `%${query.trim()}%`; // Prepare for ILIKE

    try {
        // Query products matching the search term in title or description_html
        // Selecting the same fields as getMemberProductsStore
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
            .or('status.eq.ACTIVE,status.eq.active')
            .eq('vendor', 'Graceful Resources') // Filter by vendor
            // Search title OR description_html
            .or(`title.ilike.${searchTerm},description_html.ilike.${searchTerm}`)
            .not('shopify_product_variants', 'is', null)
            .limit(1, { foreignTable: 'shopify_product_variants' })
            .limit(50) // Limit search results
            .returns<ProductWithVariantPrice[]>();

        if (error) {
            console.error('Error searching products:', error);
            throw new Error(`Failed to search products: ${error.message}`);
        }

        if (!data) {
            return [];
        }

        // Transform data to match ProductData type, use the helper
        const products: ProductData[] = data
            .map(transformProductData)
            .filter((product): product is ProductData => product !== null);

        return products;

    } catch (err) {
        console.error('Unexpected error during product search:', err);
        // Depending on error handling strategy, you might re-throw or return empty
        return [];
    }
}

/**
 * Adds a product to the current user's wishlist.
 * @param productId The UUID of the product to add.
 * @returns Object indicating success or error.
 */
export async function addToWishlist(productId: string): Promise<{ success: boolean; error?: string }> {
    if (!productId) {
        return { success: false, error: 'Product ID is required.' };
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
        return { success: false, error: userError?.message || 'User not authenticated.' };
    }

    try {
        const { error } = await supabase
            .from('wishlist_items')
            .insert({ user_id: user.id, product_id: productId });

        if (error) {
            // Handle potential unique constraint violation gracefully
            if (error.code === '23505') { // unique_violation
                console.warn(`Product ${productId} already in wishlist for user ${user.id}`);
                return { success: true }; // Already exists, consider it success
            }
            console.error('Error adding to wishlist:', error);
            return { success: false, error: `Database error: ${error.message}` };
        }

        // Optionally revalidate paths if there's a dedicated wishlist page
        // revalidatePath('/dashboard/wishlist'); 
        revalidatePath('/dashboard/store'); // Revalidate store page in case UI depends on it

        return { success: true };
    } catch (err: any) {
        console.error('Unexpected error adding to wishlist:', err);
        return { success: false, error: err.message || 'An unexpected error occurred.' };
    }
}

/**
 * Removes a product from the current user's wishlist.
 * @param productId The UUID of the product to remove.
 * @returns Object indicating success or error.
 */
export async function removeFromWishlist(productId: string): Promise<{ success: boolean; error?: string }> {
    if (!productId) {
        return { success: false, error: 'Product ID is required.' };
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
        return { success: false, error: userError?.message || 'User not authenticated.' };
    }

    try {
        const { error } = await supabase
            .from('wishlist_items')
            .delete()
            .eq('user_id', user.id)
            .eq('product_id', productId);

        if (error) {
            console.error('Error removing from wishlist:', error);
            return { success: false, error: `Database error: ${error.message}` };
        }

        // Optionally revalidate paths
        // revalidatePath('/dashboard/wishlist');
        revalidatePath('/dashboard/store');

        return { success: true };
    } catch (err: any) {
        console.error('Unexpected error removing from wishlist:', err);
        return { success: false, error: err.message || 'An unexpected error occurred.' };
    }
}

/**
 * Fetches the product IDs of items in the current user's wishlist.
 * Returns an empty array if user is not logged in or on error.
 * @returns A promise resolving to an array of product UUIDs.
 */
export async function getWishlistedProductIds(): Promise<string[]> {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return [];
    }

    try {
        // Correct table name is wishlist_items
        const { data, error } = await supabase
            .from('wishlist_items')
            .select('product_id')
            .eq('user_id', user.id);

        if (error) {
            console.error('Error fetching wishlist items:', error);
            return [];
        }

        return data?.map(item => item.product_id) || [];
    } catch (err) {
        console.error('Unexpected error fetching wishlist:', err);
        return [];
    }
}

/**
 * Fetches approved reviews for a specific product.
 * Includes reviewer's profile information (name).
 * @param productId The UUID of the product.
 * @returns A promise resolving to an array of reviews with profile info.
 */
export type ProductReviewWithProfile = Database['public']['Tables']['product_reviews']['Row'] & {
    unified_profiles: Pick<
        Database['public']['Tables']['unified_profiles']['Row'],
        'id' | 'first_name' | 'last_name' // Removed avatar_url
    > | null; // Can be null if profile join fails or profile doesn't exist
};

export async function getProductReviews(productId: string): Promise<ProductReviewWithProfile[]> {
    if (!productId) return [];

    const supabase = await createServerSupabaseClient();

    try {
        // Fetch approved reviews and explicitly join with unified_profiles table for reviewer name
        const { data, error } = await supabase
            .from('product_reviews')
            // Select ALL columns from product_reviews, plus specific unified_profiles columns (no avatar_url)
            .select(`
                *,
                unified_profiles!inner (
                    id,
                    first_name,
                    last_name
                )
            `)
            .eq('product_id', productId)
            .eq('is_approved', true) // Only fetch approved reviews
            .order('created_at', { ascending: false })
            // Explicitly cast the return type here - this is generally correct
            .returns<ProductReviewWithProfile[]>();

        if (error) {
            console.error('Error fetching product reviews:', error);
            // Return empty array on error
            return [];
        }
        // Add null check for data
        if (!data) {
            return [];
        }

        // Data should conform to ProductReviewWithProfile[] due to .returns<>()
        return data;

    } catch (err) {
        console.error('Unexpected error fetching product reviews:', err);
        return [];
    }
}

/**
 * Fetches the detailed product data for items in the current user's wishlist.
 * Returns an empty array if user is not logged in, has no items, or on error.
 * Reuses ProductData type for consistency.
 * 
 * @returns A promise resolving to an array of ProductData for wishlisted items.
 */
export async function getWishlistDetails(): Promise<ProductData[]> {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        console.log('No user logged in, returning empty wishlist.');
        return [];
    }

    try {
        // 1. Fetch the product IDs from the wishlist
        const { data: wishlistItems, error: wishlistError } = await supabase
            .from('wishlist_items')
            .select('product_id')
            .eq('user_id', user.id);

        if (wishlistError) {
            console.error('Error fetching wishlist item IDs:', wishlistError);
            return [];
        }

        if (!wishlistItems || wishlistItems.length === 0) {
            console.log('User wishlist is empty.');
            return [];
        }

        const productIds = wishlistItems.map(item => item.product_id);

        // 2. Fetch the details for those product IDs
        const { data: productDetails, error: productError } = await supabase
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
            .in('id', productIds) // Filter by the fetched IDs
            .or('status.eq.ACTIVE,status.eq.active')// Ensure products are active
            .not('shopify_product_variants', 'is', null)
            .limit(1, { foreignTable: 'shopify_product_variants' })
            .returns<ProductWithVariantPrice[]>(); // Use the existing type helper

        if (productError) {
            console.error('Error fetching product details for wishlist:', productError);
            return [];
        }

        if (!productDetails) {
            return [];
        }

        // 3. Transform data to match ProductData type (use the helper)
        const products: ProductData[] = productDetails
            .map(transformProductData)
            .filter((product): product is ProductData => product !== null);

        return products;

    } catch (err) {
        console.error('Unexpected error fetching wishlist details:', err);
        return [];
    }
}

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
            .maybeSingle()
            .returns<ProductWithVariantPrice | null>(); // Explicitly type the return

        if (error) {
            console.error(`Error fetching advent product ${handle}:`, error);
            return null;
        }

        if (!product) return null;

        // reuse transformProductData which is local to this file
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
            .in('handle', handles)
            .returns<ProductWithVariantPrice[]>();

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