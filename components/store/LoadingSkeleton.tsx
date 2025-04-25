'use client';

import React from 'react';
import ProductCardSkeleton from './ProductCardSkeleton';

const LoadingSkeleton = () => {
  // Display a grid of skeleton cards similar to the ProductList layout
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {/* Create an array of 8 skeletons */}
      {Array.from({ length: 8 }).map((_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </div>
  );
};

export default LoadingSkeleton; 