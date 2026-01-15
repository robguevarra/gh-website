'use client';

import React from 'react';
import ProductCard from './ProductCard';
import { ProductData } from '@/lib/stores/student-dashboard'; // Corrected import source

import { CartItem } from '@/stores/cartStore';

interface ProductListProps {
  products: ProductData[];
  wishlistedIds: Set<string>;
  onOpenQuickView: (product: ProductData) => void;
  ownedProductIds: string[];
  baseUrl?: string;
  onAddToCart?: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void;
}

const ProductList: React.FC<ProductListProps> = ({ products, wishlistedIds, onOpenQuickView, ownedProductIds, baseUrl, onAddToCart }) => {
  if (!products || products.length === 0) {
    // This case should ideally be handled by the parent component (StorePage)
    // but added here for robustness.
    return <p className="text-center text-muted-foreground">No products found.</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          isInitiallyWishlisted={wishlistedIds.has(product.id)} // Pass initial state
          onOpenQuickView={onOpenQuickView} // Pass callback down
          ownedProductIds={ownedProductIds} // <-- Pass prop down to ProductCard
          baseUrl={baseUrl}
          onAddToCart={onAddToCart}
        />
      ))}
    </div>
  );
};

export default ProductList; 