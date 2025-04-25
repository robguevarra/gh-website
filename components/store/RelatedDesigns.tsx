'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';

interface ProductImage {
  url: string;
  altText: string | null;
}

interface RelatedProduct {
  id: string;
  handle: string | null;
  title: string | null;
  featured_image_url: string | null;
  image_urls: ProductImage[] | null;
  shopify_product_variants: { 
    id: string;
    price: number | null;
  }[];
}

interface RelatedDesignsProps {
  products: RelatedProduct[];
}

// Helper to format currency
const formatPrice = (price: number | null): string => {
  if (price === null) return 'N/A';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(price);
};

const RelatedDesigns: React.FC<RelatedDesignsProps> = ({ products }) => {
  if (!products || products.length === 0) {
    return null;
  }

  return (
    <div className="mt-16">
      <h2 className="text-2xl font-serif font-bold text-primary mb-6">Complete Your Collection</h2>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {products.map((product) => {
          const price = product.shopify_product_variants?.[0]?.price || null;
          // Get the first image from image_urls or fallback to featured_image_url
          let imageUrl = product.featured_image_url || '';
          if (product.image_urls && product.image_urls.length > 0) {
            imageUrl = product.image_urls[0].url;
          }
          
          return (
            <Card 
              key={product.id} 
              className="overflow-hidden h-full hover:shadow-md transition-shadow duration-200"
            >
              <Link 
                href={`/dashboard/store/product/${product.handle}`}
                className="block h-full"
              >
                <div className="aspect-video relative w-full">
                  {imageUrl ? (
                    <Image
                      src={imageUrl}
                      alt={product.title || 'Related product'}
                      fill
                      style={{ objectFit: 'cover' }}
                      sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 25vw"
                      className="transition-transform hover:scale-105 duration-500"
                    />
                  ) : (
                    <div className="w-full h-full bg-muted/20 flex items-center justify-center">
                      <span className="text-muted-foreground text-sm">No image</span>
                    </div>
                  )}
                </div>
                <CardContent className="p-4">
                  <h3 className="font-medium text-foreground line-clamp-2 hover:text-primary transition-colors">
                    {product.title || 'Untitled Product'}
                  </h3>
                  <p className="mt-2 font-semibold text-primary">
                    {formatPrice(price)}
                  </p>
                </CardContent>
              </Link>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default RelatedDesigns; 