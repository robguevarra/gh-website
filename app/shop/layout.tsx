import React from 'react';
import { PublicHeader } from '@/components/layout/public-header';
import { PublicFooter } from '@/components/layout/public-footer';
import PublicCartView from '@/components/shop/PublicCartView';
import PublicCartIndicator from '@/components/shop/PublicCartIndicator';
import ShopCountdownOverlay from '@/components/shop/ShopCountdownOverlay';

export default function ShopLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen flex flex-col bg-background relative">
            <PublicHeader />
            <main className="flex-1 relative">
                {children}
                {/* Launch Countdown Overlay */}
                <ShopCountdownOverlay />
            </main>
            <PublicFooter />

            {/* Cart Drawer */}
            <PublicCartView />

            {/* Floating Cart Button for Shop Context */}
            <div className="fixed bottom-6 right-6 z-50 shadow-lg rounded-full bg-white">
                <div className="p-1">
                    <PublicCartIndicator />
                </div>
            </div>
        </div>
    );
}
