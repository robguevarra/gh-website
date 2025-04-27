'use client';

import React, { useState, useEffect, useCallback, useTransition } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Loader2, X } from 'lucide-react';
import CartIndicator from './CartIndicator';
import { debounce } from 'lodash-es';

const StoreStickyBar = () => {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();

    // Initialize search term state from URL query param
    const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');

    // Update state if URL param changes externally
    useEffect(() => {
        setSearchTerm(searchParams.get('q') || '');
    }, [searchParams]);

    // Debounced function to update URL query parameter
    const debouncedUpdateQuery = useCallback(
        debounce((query: string) => {
            const current = new URLSearchParams(Array.from(searchParams.entries()));

            if (!query) {
                current.delete("q");
            } else {
                current.set("q", query);
            }

            const search = current.toString();
            const queryStr = search ? `?${search}` : "";

            startTransition(() => {
                router.replace(`${pathname}${queryStr}`);
            });
        }, 300), // 300ms delay
        [searchParams, pathname, router, startTransition] // Dependencies
    );

    const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const query = event.target.value;
        setSearchTerm(query);
        debouncedUpdateQuery(query);
    };

    // Function to clear search
    const handleClearSearch = useCallback(() => {
        setSearchTerm('');
        const current = new URLSearchParams(Array.from(searchParams.entries()));
        current.delete("q");
        const search = current.toString();
        const queryStr = search ? `?${search}` : "";
        // Use replace and no transition needed for clearing
        router.replace(`${pathname}${queryStr}`);
        // Cancel any pending debounced updates
        debouncedUpdateQuery.cancel();
    }, [searchParams, pathname, router, debouncedUpdateQuery]);

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
                    {/* Clear Button */}
                    {searchTerm && !isPending && (
                        <Button 
                            variant="ghost"
                            size="icon"
                            className="absolute right-10 top-1/2 transform -translate-y-1/2 h-7 w-7 rounded-full text-muted-foreground hover:text-foreground" 
                            onClick={handleClearSearch}
                            aria-label="Clear search"
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