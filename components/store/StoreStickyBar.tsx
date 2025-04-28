'use client';

import React, { useState, useEffect, useCallback, useTransition } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Loader2, X } from 'lucide-react';
import CartIndicator from './CartIndicator';
import { debounce } from 'lodash-es';

// Define props if we need to receive info from parent, e.g., initial collection
interface StoreStickyBarProps {
  // We don't pass the handler down directly anymore
  // onCollectionSelect: (collectionHandle: string) => void;
}

const StoreStickyBar: React.FC<StoreStickyBarProps> = () => {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();

    // Initialize search term state from URL query param 'q'
    const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');
    // Get the current collection from URL param 'collection'
    const currentCollection = searchParams.get('collection');

    // Update state if URL params change externally
    useEffect(() => {
        setSearchTerm(searchParams.get('q') || '');
        // No need to set collection state, it's read directly from searchParams
    }, [searchParams]);

    // --- URL Update Logic ---
    const updateUrlParams = useCallback((params: { q?: string | null; collection?: string | null }) => {
        const current = new URLSearchParams(Array.from(searchParams.entries()));

        // Update or delete 'q'
        if (params.q) {
            current.set("q", params.q);
        } else {
            current.delete("q");
        }
        
        // Update or delete 'collection'
        if (params.collection && params.collection !== 'all') {
            current.set("collection", params.collection);
        } else {
            current.delete("collection");
        }

        const search = current.toString();
        const queryStr = search ? `?${search}` : "";

        startTransition(() => {
            router.replace(`${pathname}${queryStr}`);
        });
    }, [searchParams, pathname, router, startTransition]);

    // Debounced function specifically for search input
    const debouncedUpdateSearchQuery = useCallback(
        debounce((query: string) => {
            // When search is used, clear the collection filter
            updateUrlParams({ q: query, collection: null }); 
        }, 300), 
        [updateUrlParams] // Dependency on the main URL updater
    );

    // --- Event Handlers ---
    const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const query = event.target.value;
        setSearchTerm(query);
        debouncedUpdateSearchQuery(query);
    };

    // Handler for collection selection (to be called by parent/event bus)
    // This is now handled externally by clicking CategoryNavigation buttons
    // which directly update the URL via router.push/replace in the parent page
    // or by modifying CategoryNavigation to call this handler.
    // For simplicity with server components, we'll rely on direct URL updates from CategoryNavigation clicks.
    // We will need to modify CategoryNavigation to perform the URL update on click.

    const handleClearFilters = useCallback(() => {
        setSearchTerm('');
        updateUrlParams({ q: null, collection: null });
        // Cancel any pending debounced updates
        debouncedUpdateSearchQuery.cancel();
    }, [updateUrlParams, debouncedUpdateSearchQuery]);

    return (
        <div className="sticky top-16 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-40 border-b">
            <div className="container mx-auto px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-4">
                {/* Search Area */}
                <div className="relative w-full sm:w-auto sm:flex-1 order-2 sm:order-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground z-10" />
                    <Input
                        type="search"
                        placeholder="Search designs..."
                        value={searchTerm}
                        onChange={handleSearchChange}
                        className="pl-10 pr-16 sm:pr-20 py-2 text-base h-11 rounded-full shadow-sm w-full"
                        aria-label="Search store designs"
                    />
                    {/* Clear Button - Changed condition to clear both */}
                    {(searchTerm || currentCollection) && !isPending && (
                        <Button 
                            variant="ghost"
                            size="icon"
                            className="absolute right-10 top-1/2 transform -translate-y-1/2 h-7 w-7 rounded-full text-muted-foreground hover:text-foreground" 
                            onClick={handleClearFilters} // Use the combined clear handler
                            aria-label="Clear filters"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    )}
                    {/* Loading Spinner */}
                    {isPending && (
                        <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground animate-spin" />
                    )}
                </div>

                {/* Navigation/Actions Area */}
                <div className="flex items-center gap-4 order-1 sm:order-2 flex-shrink-0">
                    <Button variant="link" asChild className="p-0 h-auto text-muted-foreground hover:text-primary transition-colors">
                        <Link href="/dashboard/wishlist" aria-label="View Wishlist">
                            Wishlist
                        </Link>
                    </Button>
                    <Button variant="link" asChild className="p-0 h-auto text-muted-foreground hover:text-primary transition-colors">
                        <Link href="/dashboard/purchase-history" aria-label="View Purchase History">
                            Purchases
                        </Link>
                    </Button>
                    <CartIndicator />
                </div>
            </div>
        </div>
    );
};

export default StoreStickyBar; 