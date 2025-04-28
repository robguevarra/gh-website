'use client';

// Renamed from StoreSubheader - now manages results display
import React, { useState, useEffect, useCallback } from 'react';
// Removed Link, Input, Button, Search, Loader2, CartIndicator, History, Heart
import ProductList from './ProductList';
import LoadingSkeleton from './LoadingSkeleton';
import QuickViewModal from './QuickViewModal';
import { ProductData } from '@/app/dashboard/store/page';
// Removed search action import - data comes via props
// Removed debounce import

interface StoreResultsManagerProps {
  // Accept fetched products/results and loading state from the parent page
  products: ProductData[];
  isLoading: boolean; 
  searchTerm: string | null; // Receive current search term for empty state message
  initialWishlistedIds: string[];
  ownedProductIds: string[];
}

const StoreResultsManager: React.FC<StoreResultsManagerProps> = ({
  products,
  isLoading,
  searchTerm,
  initialWishlistedIds,
  ownedProductIds,
}) => {
  // State for interactions within this component
  const [wishlistedIds, setWishlistedIds] = useState<Set<string>>(new Set(initialWishlistedIds));
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
  const [selectedProductForQuickView, setSelectedProductForQuickView] = useState<ProductData | null>(null);

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
    // Removed the outer sticky div and the search/actions bar
    // This component now just returns the results area + modal
    <>
      {/* Product Listing Area - Rendered based on props from page */}
      <div className="container mx-auto px-4 pb-12"> {/* Removed pt-6, adjusted pb */}
        {isLoading ? (
          <LoadingSkeleton />
        ) : products.length > 0 ? (
          <ProductList
            products={products}
            wishlistedIds={wishlistedIds}
            onOpenQuickView={handleOpenQuickView}
            ownedProductIds={ownedProductIds}
          />
        ) : (
          <div className="text-center text-muted-foreground py-10">
            {/* Display message based on whether a search term was present */}
            {searchTerm ? (
                <p>No designs found matching "{searchTerm}".</p>
            ) : (
                <p>No designs available at the moment.</p> // Default empty message
            )}
          </div>
        )}
      </div>

      {/* Quick View Modal */}
      <QuickViewModal
        product={selectedProductForQuickView}
        isOpen={isQuickViewOpen}
        onOpenChange={setIsQuickViewOpen}
      />
    </>
  );
};

export default StoreResultsManager; 