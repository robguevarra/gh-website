'use client';

// Renamed from StoreSubheader - now manages results display
import React, { useState, useEffect, useCallback } from 'react';
// Removed Link, Input, Button, Search, Loader2, CartIndicator, History, Heart
import ProductList from './ProductList';
import LoadingSkeleton from './LoadingSkeleton';
import QuickViewModal from './QuickViewModal';
import { ProductData } from '@/lib/stores/student-dashboard';
// Removed search action import - data comes via props
// Removed debounce import

import { usePublicCartStore } from '@/stores/publicCartStore';
import { useCartStore } from '@/stores/cartStore'; // Still needed for type? Or dashboard case?
// Actually, StoreResultsManager is client side. Can we pass the handler?
// No, the handler comes from a hook. Hooks can only be called in components.
// So StoreResultsManager needs to use the hook.

interface StoreResultsManagerProps {
  products: ProductData[];
  isLoading: boolean;
  searchTerm: string | null;
  initialWishlistedIds: string[];
  ownedProductIds: string[];
  baseUrl?: string;
  cartStoreType?: 'student' | 'public'; // 'student' is default
}

const StoreResultsManager: React.FC<StoreResultsManagerProps> = ({
  products,
  isLoading,
  searchTerm,
  initialWishlistedIds,
  ownedProductIds,
  baseUrl,
  cartStoreType = 'student'
}) => {
  // State for interactions within this component
  const [wishlistedIds, setWishlistedIds] = useState<Set<string>>(new Set(initialWishlistedIds));
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
  const [selectedProductForQuickView, setSelectedProductForQuickView] = useState<ProductData | null>(null);

  // Determine which cart action to use
  // We can't conditionally call hooks, so we call both? No.
  // We can wrap the selector?
  // Or just get the addItem function from the appropriate store.
  // Since we are in a component, we can use the hooks.

  const publicAddItem = usePublicCartStore(state => state.addItem);
  const studentAddItem = useCartStore(state => state.addItem);

  // Select the correct handler based on prop
  const onAddToCart = cartStoreType === 'public' ? publicAddItem : studentAddItem;
  const isPublic = cartStoreType === 'public';

  // Update wishlist state if initial IDs change
  useEffect(() => {
    setWishlistedIds(new Set(initialWishlistedIds));
  }, [initialWishlistedIds]);

  // Quick view handler remains
  const handleOpenQuickView = useCallback((product: ProductData) => {
    setSelectedProductForQuickView(product);
    setIsQuickViewOpen(true);
  }, []);

  return (
    <>
      <div className="container mx-auto px-4 pb-12">
        {isLoading ? (
          <LoadingSkeleton />
        ) : products.length > 0 ? (
          <ProductList
            products={products}
            wishlistedIds={wishlistedIds}
            onOpenQuickView={handleOpenQuickView}
            ownedProductIds={ownedProductIds}
            baseUrl={baseUrl}
            onAddToCart={onAddToCart} // Pass the selected handler
            isPublic={isPublic} // Pass isPublic
          />
        ) : (
          <div className="text-center text-muted-foreground py-10">
            {searchTerm ? (
              <p>No designs found matching "{searchTerm}".</p>
            ) : (
              <p>No designs available at the moment.</p>
            )}
          </div>
        )}
      </div>

      <QuickViewModal
        product={selectedProductForQuickView}
        isOpen={isQuickViewOpen}
        onOpenChange={setIsQuickViewOpen}
      />
    </>
  );
};

export default StoreResultsManager; 