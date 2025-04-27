import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { getWishlistDetails, getWishlistedProductIds } from '@/app/actions/store-actions';
import ProductList from '@/components/store/ProductList';
import { ProductData } from '@/app/dashboard/store/page'; // Reuse ProductData type
import { createServerSupabaseClient } from '@/lib/supabase/server'; // Needed for auth check

// Wishlist page component - server-side rendering
export default async function WishlistPage() {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        // Optionally, you could redirect to login or show a specific message
        // For now, showing an empty state consistent with getWishlistDetails logic
        return (
            <div className="container mx-auto px-4 py-8">
                <h1 className="text-3xl font-serif font-bold mb-6">My Wishlist</h1>
                <div className="text-center text-muted-foreground py-10 border rounded-lg">
                    <p className="mb-4">Please log in to view your wishlist.</p>
                    <Button asChild>
                        <Link href="/auth/signin">Log In</Link>
                    </Button>
                </div>
            </div>
        );
    }

    // Fetch wishlist details and current wishlist IDs for the logged-in user
    const wishlistItems: ProductData[] = await getWishlistDetails();
    const wishlistedIds: string[] = await getWishlistedProductIds();
    // Convert to Set for efficient lookup in ProductList/ProductCard
    const wishlistedIdsSet = new Set(wishlistedIds);

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-serif font-bold mb-6">My Wishlist</h1>

            {wishlistItems.length === 0 ? (
                <div className="text-center text-muted-foreground py-10 border rounded-lg">
                    <p className="mb-4">Your wishlist is currently empty.</p>
                    <Button asChild variant="outline">
                        <Link href="/dashboard/store">Browse Designs</Link>
                    </Button>
                </div>
            ) : (
                // Display the products using ProductList
                // Note: Quick View won't work here unless ProductList/Card is adapted
                // or this page uses a client component wrapper similar to StoreSubheader.
                // For now, Quick View button might appear but won't function on this page.
                <ProductList 
                    products={wishlistItems} 
                    wishlistedIds={wishlistedIdsSet} 
                    // Explicitly omit or pass a no-op for onOpenQuickView
                    onOpenQuickView={() => { /* Quick view not implemented on this page */ }}
                />
            )}
        </div>
    );
} 