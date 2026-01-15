'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import CartIndicator from '@/components/store/CartIndicator';
import { Button } from '@/components/ui/button';

export const ShopHeader = () => {
    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-16 items-center justify-between">
                <div className="flex items-center gap-6">
                    <Link href="/" className="flex items-center space-x-2">
                        {/* Fallback text or logo if available. Using text for now matching dashboard style or main site logic */}
                        <span className="font-serif text-xl font-bold tracking-tight">Graceful Homeschooling</span>
                    </Link>
                    <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
                        <Link href="/shop" className="transition-colors hover:text-foreground/80 text-foreground">
                            Store
                        </Link>
                        {/* Add more links if needed */}
                    </nav>
                </div>
                <div className="flex items-center gap-4">
                    {/* Simple Login Link for users who have accounts */}
                    <Button variant="ghost" asChild className="hidden sm:inline-flex">
                        <Link href="/login">Login</Link>
                    </Button>
                    <CartIndicator />
                </div>
            </div>
        </header>
    );
};

export default ShopHeader;
