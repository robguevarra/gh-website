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
import { ProductReviewWithProfile } from '@/app/actions/store-actions';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star } from 'lucide-react';
import { Badge } from "@/components/ui/badge";

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
  reviews: ProductReviewWithProfile[]; // Add reviews prop
  ownedProductIds: string[]; // <-- Add owned IDs prop
  baseUrl?: string;
}

const ProductDetail: React.FC<ProductDetailProps> = ({
  product,
  relatedProducts,
  reviews,
  ownedProductIds,
  baseUrl = '/dashboard/store'
}) => {
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const addItem = useCartStore((state) => state.addItem);
  const { toast } = useToast();

  // Determine if the user owns this product
  const isOwned = ownedProductIds.includes(product.id);

  // ... (lines 60-111 unchanged)
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
    switch (licenseType) {
      case 'CUR': return 'Commercial Use Rights';
      case 'PLR': return 'Private Label Rights';
      case 'BUNDLE': return 'Mixed License Bundle';
      default: return 'Commercial License';
    }
  };

  const handleAddToCart = () => {
    // Prevent adding if owned
    if (isOwned) {
      toast({ title: "Already Owned", description: "You already own this product.", variant: "destructive" });
      return;
    }
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
        <Link href={baseUrl} className="inline-flex items-center text-primary hover:text-primary/80 transition-colors">
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
                  className={`relative w-20 h-20 shrink-0 rounded border-2 overflow-hidden transition-all ${selectedImageIndex === index
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
              {/* Conditional Add to Cart Button / Owned Indicator */}
              {isOwned ? (
                <Badge variant="secondary" className="w-full justify-center px-3 py-3 text-base bg-green-100 text-green-800 border-green-200">
                  Purchased
                </Badge>
              ) : (
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
              )}
            </div>
          </div>
        </div>
      </div>

      {relatedProducts.length > 0 && (
        <RelatedDesigns products={relatedProducts} baseUrl={baseUrl} />
      )}

      {/* Reviews Section - FIXING PROFILE ACCESS */}
      <div className="mt-12">
        <h2 className="text-2xl font-semibold mb-6">Customer Reviews</h2>
        {reviews.length > 0 ? (
          <div className="space-y-6">
            {reviews.map((review) => (
              <div key={review.id} className="flex items-start gap-4 border-b pb-6 last:border-b-0">
                <Avatar>
                  {/* Access profile data via the nested unified_profiles object */}
                  {/* Note: avatar_url is not included in the ProductReviewWithProfile type */}
                  <AvatarImage src={undefined} alt={review.unified_profiles?.first_name || 'User'} />
                  <AvatarFallback>
                    {review.unified_profiles?.first_name?.charAt(0) || 'U'}
                    {review.unified_profiles?.last_name?.charAt(0) || ''}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-grow">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-medium">
                      {review.unified_profiles?.first_name || 'Anonymous'} {review.unified_profiles?.last_name || ''}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(review.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {/* Render Stars based on rating */}
                  <div className="flex items-center gap-1 mb-2">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={`h-4 w-4 ${i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground'}`} />
                    ))}
                  </div>
                  {review.comment && <p className="text-sm text-muted-foreground">{review.comment}</p>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-6 border rounded-lg">No reviews yet for this product.</p>
        )}
        {/* TODO: Add Review Submission Form Here (Blocked by Phase 5-3) */}
      </div>
    </div>
  );
};

export default ProductDetail; 