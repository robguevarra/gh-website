'use client';

import React from 'react';
import ProductCard from './ProductCard';
import { ProductData } from '@/app/dashboard/store/page'; // Import type from page

interface ProductListProps {
  products: ProductData[];
}

const ProductList: React.FC<ProductListProps> = ({ products }) => {
  if (!products || products.length === 0) {
    // This case should ideally be handled by the parent component (StorePage)
    // but added here for robustness.
    return <p className="text-center text-muted-foreground">No products found.</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
};

export default ProductList; 