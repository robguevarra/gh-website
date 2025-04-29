import React, { Suspense } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { getWishlistDetails, getWishlistedProductIds } from '@/app/actions/store-actions';
import { ProductData } from '@/app/dashboard/store/page'; // Reuse ProductData type
import { createServerSupabaseClient } from '@/lib/supabase/server'; // Needed for auth check
import { getOwnedProductIds } from '@/app/actions/userActions'; // <-- Import action
import StoreResultsManager from '@/components/store/StoreResultsManager';
import LoadingSkeleton from '@/components/store/LoadingSkeleton';

// Wishlist page component - server-side rendering
export default async function WishlistPage() {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        // Show login prompt for non-authenticated users
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

    // Fetch wishlist details, current wishlist IDs, AND owned IDs concurrently
    const [wishlistItems, wishlistedIds, ownedProductIds] = await Promise.all([
        getWishlistDetails(),
        getWishlistedProductIds(),
        getOwnedProductIds() // <-- Fetch owned IDs
    ]);

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
                <Suspense fallback={<LoadingSkeleton />}>
                    {/* Use StoreResultsManager with wishlist products to enable Quick View */}
                    <StoreResultsManager 
                        products={wishlistItems} 
                        isLoading={false}
                        searchTerm={null}
                        initialWishlistedIds={wishlistedIds}
                        ownedProductIds={ownedProductIds} // <-- Pass prop
                    />
                </Suspense>
            )}
        </div>
    );
}