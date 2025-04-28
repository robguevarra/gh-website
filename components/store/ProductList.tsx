'use client';

import React from 'react';
import ProductCard from './ProductCard';
import { ProductData } from '@/app/dashboard/store/page'; // Import type from page

interface ProductListProps {
  products: ProductData[];
  wishlistedIds: Set<string>;
  onOpenQuickView: (product: ProductData) => void; // Add callback prop
  ownedProductIds: string[]; // <-- Add ownedProductIds prop
}

const ProductList: React.FC<ProductListProps> = ({ products, wishlistedIds, onOpenQuickView, ownedProductIds }) => {
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
        />
      ))}
    </div>
  );
};

export default ProductList; 