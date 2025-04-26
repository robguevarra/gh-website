'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { ChevronLeft, Loader2, ShoppingCart } from 'lucide-react';
import { useCartStore } from '@/stores/cartStore';
import LicenseTerms, { getLicenseTypeFromTitle } from './LicenseTerms';
import RelatedDesigns from './RelatedDesigns';
import { formatPriceDisplayPHP } from '@/lib/utils/formatting';

interface ProductVariant {
  id: string;
  price: number | null;
}

interface ProductImage {
  url: string;
  altText: string | null;
}

interface ProductDetailProps {
  product: {
    id: string;
    title: string | null;
    handle: string | null;
    description_html: string | null;
    featured_image_url: string | null;
    image_urls: ProductImage[] | null;
    tags: string[] | null;
    shopify_product_variants: ProductVariant[];
    product_type: string | null;
  };
  relatedProducts: any[]; // Type this more strictly as needed
}

const ProductDetail: React.FC<ProductDetailProps> = ({ product, relatedProducts }) => {
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  
  const addItem = useCartStore((state) => state.addItem);
  const { toast } = useToast();

  const variant = product.shopify_product_variants?.[0];
  const price = variant?.price || null;
  const compareAtPrice = (variant as any)?.compare_at_price || null;
  
  let displayImages: string[] = [];
  
  if (product.image_urls && Array.isArray(product.image_urls)) {
    displayImages = product.image_urls.map(img => img.url);
  } else if (product.featured_image_url) {
    displayImages = [product.featured_image_url];
  }
  
  const selectedImage = displayImages[selectedImageIndex] || '';

  const productType = product.product_type || '';
  const tags = product.tags || [];
  
  const licenseType = getLicenseTypeFromTitle(product.title);

  const getLicenseBadgeText = () => {
    switch(licenseType) {
      case 'CUR': return 'Commercial Use Rights';
      case 'PLR': return 'Private Label Rights';
      case 'BUNDLE': return 'Mixed License Bundle';
      default: return 'Commercial License';
    }
  };

  const handleAddToCart = () => {
    setIsAddingToCart(true);
    
    const numericPrice = typeof price === 'number' ? price : 0;
    
    addItem({
      productId: product.id,
      title: product.title || 'Untitled Product',
      price: numericPrice,
      imageUrl: displayImages[0] || '',
    });

    toast({
      title: "Added to Cart",
      description: `${product.title || 'Product'} has been added to your cart.`,
    });

    setTimeout(() => setIsAddingToCart(false), 500);
  };

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <Link href="/dashboard/store" className="inline-flex items-center text-primary hover:text-primary/80 transition-colors">
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to Store
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
        <div className="space-y-4">
          <div className="relative aspect-square bg-muted/20 rounded-lg overflow-hidden">
            {selectedImage ? (
              <Image 
                src={selectedImage}
                alt={product.title || 'Product image'}
                fill
                style={{ objectFit: 'contain' }}
                sizes="(max-width: 768px) 100vw, 50vw"
                className="bg-white"
                priority
              />
            ) : (
              <div className="flex items-center justify-center h-full bg-muted/20">
                <span className="text-muted-foreground">No image available</span>
              </div>
            )}
          </div>

          {displayImages.length > 1 && (
            <div className="flex overflow-x-auto gap-2 pb-2">
              {displayImages.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImageIndex(index)}
                  className={`relative w-20 h-20 shrink-0 rounded border-2 overflow-hidden transition-all ${
                    selectedImageIndex === index 
                      ? 'border-primary' 
                      : 'border-transparent hover:border-primary/50'
                  }`}
                  aria-label={`View image ${index + 1}`}
                >
                  <Image 
                    src={image}
                    alt={`${product.title || 'Product'} thumbnail ${index + 1}`}
                    fill
                    style={{ objectFit: 'cover' }}
                    sizes="80px"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col h-full">
          <div className="space-y-4">
            <h1 className="text-3xl font-serif font-bold text-primary">
              {product.title?.replace(/ \((CUR|PLR)\)/, '') || 'Untitled Product'}
            </h1>
            
            <div className="flex items-center">
              {(() => {
                const { formattedPrice, formattedCompareAtPrice } = formatPriceDisplayPHP({
                  price: price, 
                  compareAtPrice: compareAtPrice 
                });
                
                return (
                  <div className="flex items-baseline gap-3">
                    {formattedCompareAtPrice && (
                      <span className="text-xl text-muted-foreground line-through">
                        {formattedCompareAtPrice}
                      </span>
                    )}
                    <span className="text-2xl font-semibold">{formattedPrice || 'N/A'}</span>
                  </div>
                );
              })()}
              
              <span className="ml-3 inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                {getLicenseBadgeText()}
              </span>
            </div>

            {product.description_html && (
              <div 
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: product.description_html }}
              />
            )}

            <div className="space-y-2 py-4 border-t border-b">
              {productType && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Type:</span>
                  <span className="font-medium">{productType}</span>
                </div>
              )}

              {tags.length > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tags:</span>
                  <div className="flex flex-wrap justify-end gap-1">
                    {tags
                      .filter(tag => !tag.startsWith('access:'))
                      .map((tag, index) => (
                        <span 
                          key={index} 
                          className="inline-block px-2 py-0.5 rounded-full bg-muted text-xs"
                        >
                          {tag}
                        </span>
                      ))
                    }
                  </div>
                </div>
              )}
            </div>

            <div className="bg-muted/30 p-4 rounded-lg border">
              <LicenseTerms variant="inline" licenseType={licenseType} />
            </div>

            <div className="mt-auto pt-4">
              <Button 
                onClick={handleAddToCart} 
                className="w-full py-6 text-lg bg-primary hover:bg-primary/90"
                disabled={isAddingToCart}
              >
                {isAddingToCart ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <ShoppingCart className="mr-2 h-5 w-5" />
                )}
                Add to Cart
              </Button>
            </div>
          </div>
        </div>
      </div>

      {relatedProducts.length > 0 && (
        <RelatedDesigns products={relatedProducts} />
      )}
    </div>
  );
};

export default ProductDetail; 