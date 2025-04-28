'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { formatPriceDisplayPHP } from '@/lib/utils/formatting';
import { ProductData } from '@/app/dashboard/store/page';

// Client component for displaying sale products with animations
const SaleProductDisplay = ({ products }: { products: ProductData[] }) => {
  // Skip rendering if no sale products
  if (!products.length) {
    return null;
  }

  return (
    <div className="lg:w-2/3 flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory">
      {products.map((product, index) => {
        // Format prices
        const { formattedPrice, formattedCompareAtPrice } = formatPriceDisplayPHP({
          price: product.price,
          compareAtPrice: product.compare_at_price
        });
        
        // Calculate discount percentage
        const discountPercentage = product.compare_at_price ? 
          Math.round((1 - (product.price / product.compare_at_price)) * 100) : 0;
        
        // Clean the product title
        const cleanTitle = product.title?.replace(/ \((CUR|PLR)\)/, '') || 'Untitled Product';
        
        return (
          <div 
            key={product.id}
            className="w-[280px] min-w-[280px] snap-start bg-white rounded-lg shadow-sm overflow-hidden border border-neutral-100 flex-shrink-0 animate-fadeIn"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <Link 
              href={`/dashboard/store/product/${product.handle}`}
              className="block hover:opacity-95 transition-opacity"
            >
              <div className="relative aspect-video w-full">
                {product.featured_image_url ? (
                  <Image 
                    src={product.featured_image_url}
                    alt={cleanTitle}
                    fill
                    style={{ objectFit: 'cover' }}
                    sizes="280px"
                    className="bg-neutral-50"
                  />
                ) : (
                  <div className="absolute inset-0 bg-neutral-100 flex items-center justify-center">
                    <span className="text-neutral-500 text-sm">No Image</span>
                  </div>
                )}
                
                {/* Sale badge with discount percentage */}
                <div className="absolute top-2 right-2 bg-primary text-white text-xs font-bold py-1 px-2 rounded-full shadow-sm">
                  {discountPercentage}% OFF
                </div>
              </div>
              
              <div className="p-4">
                <h3 className="font-medium text-sm line-clamp-1 mb-1">{cleanTitle}</h3>
                
                <div className="flex items-baseline gap-2">
                  {formattedCompareAtPrice && (
                    <span className="text-xs text-muted-foreground line-through">
                      {formattedCompareAtPrice}
                    </span>
                  )}
                  <span className="text-primary font-semibold">
                    {formattedPrice}
                  </span>
                </div>
              </div>
            </Link>
          </div>
        );
      })}
    </div>
  );
};

export default SaleProductDisplay;
