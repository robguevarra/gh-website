'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { formatPriceDisplayPHP } from '@/lib/utils/formatting';
import { ProductData } from '@/lib/stores/student-dashboard';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"

// Client component for displaying sale products with animations
const SaleProductDisplay = ({ products }: { products: ProductData[] }) => {
  // Skip rendering if no sale products
  if (!products.length) {
    return (
      <div className="flex justify-center items-center h-full min-h-[200px] text-muted-foreground">
        No sale items available.
      </div>
    );
  }

  return (
    <Carousel
      opts={{
        align: "start",
      }}
      className="w-full max-w-full"
    >
      <CarouselContent className="-ml-4">
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
            <CarouselItem key={product.id} className="pl-4 md:basis-1/2 lg:basis-1/2 xl:basis-1/3">
              <div 
                className="bg-white rounded-lg shadow-sm overflow-hidden border border-neutral-100 h-full flex flex-col animate-fadeIn"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <Link 
                  href={`/dashboard/store/product/${product.handle}`}
                  className="block hover:opacity-95 transition-opacity flex-grow flex flex-col"
                >
                  <div className="relative aspect-video w-full">
                    {product.featured_image_url ? (
                      <Image 
                        src={product.featured_image_url}
                        alt={cleanTitle}
                        fill
                        style={{ objectFit: 'cover' }}
                        sizes="(max-width: 768px) 50vw, (max-width: 1280px) 33vw, 25vw"
                        className="bg-neutral-50"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-neutral-100 flex items-center justify-center">
                        <span className="text-neutral-500 text-sm">No Image</span>
                      </div>
                    )}
                    
                    {/* Sale badge */}
                    <div className="absolute top-2 right-2 bg-primary text-white text-xs font-bold py-1 px-2 rounded-full shadow-sm">
                      {discountPercentage}% OFF
                    </div>
                  </div>
                  
                  <div className="p-4 flex-grow flex flex-col justify-between">
                    <div>
                      <h3 className="font-medium text-sm line-clamp-1 mb-1">{cleanTitle}</h3>
                    </div>
                    <div className="flex items-baseline gap-2 mt-auto">
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
            </CarouselItem>
          );
        })}
      </CarouselContent>
      <CarouselPrevious className="absolute left-[-12px] top-1/2 -translate-y-1/2 z-10" />
      <CarouselNext className="absolute right-[-12px] top-1/2 -translate-y-1/2 z-10" />
    </Carousel>
  );
};

export default SaleProductDisplay;
