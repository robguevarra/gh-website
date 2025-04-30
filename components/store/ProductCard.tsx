'use client';

import React, { useState, useTransition } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Eye, Info, Heart } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ProductData } from '@/lib/stores/student-dashboard'; // CORRECT import source
import { useCartStore } from '@/stores/cartStore'; 
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import LicenseTerms, { getLicenseTypeFromTitle, LicenseType } from './LicenseTerms';
import { formatPriceDisplayPHP } from '@/lib/utils/formatting';
import { addToWishlist, removeFromWishlist } from '@/app/actions/store-actions';

interface ProductCardProps {
  product: ProductData;
  isInitiallyWishlisted: boolean;
  onOpenQuickView: (product: ProductData) => void;
  ownedProductIds: string[];
}

// Helper to format currency
// const formatPrice = (price: number | null): string => {
//   if (price === null) return 'N/A';
//   return new Intl.NumberFormat('en-US', {
//     style: 'currency',
//     currency: 'USD', // TODO: Make currency dynamic if needed
//   }).format(price);
// };

// Helper to format license label text
const getLicenseBadgeText = (licenseType: LicenseType): string => {
  switch(licenseType) {
    case 'CUR': return 'CUR License';
    case 'PLR': return 'PLR License';
    case 'BUNDLE': return 'Mixed License';
    default: return 'Commercial License';
  }
};

const ProductCard: React.FC<ProductCardProps> = ({ 
  product, 
  isInitiallyWishlisted, 
  onOpenQuickView,
  ownedProductIds
}) => {
  // State for loading when adding to cart
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  // State for wishlist status and transition
  const [isWishlisted, setIsWishlisted] = useState(isInitiallyWishlisted);
  const [isWishlistPending, startWishlistTransition] = useTransition();
  
  // Get addItem action from cart store
  const addItem = useCartStore((state) => state.addItem); 
  
  // Use toast for feedback
  const { toast } = useToast();
  
  // Determine license type from title
  const licenseType = getLicenseTypeFromTitle(product.title);

  // Determine if the product is on sale
  const isOnSale = typeof product.compare_at_price === 'number' && product.compare_at_price > (product.price ?? 0);

  // Determine if the current user owns this product
  // Use string comparison to handle potential format differences (string vs number)
  const isOwned = ownedProductIds.some(id => String(id) === String(product.id));

  const handleAddToCart = () => {
    // Prevent adding if owned (belt-and-suspenders check)
    if (isOwned) {
        toast({ title: "Already Owned", description: "You already own this product.", variant: "destructive" });
        return;
    }
    // Set loading state
    setIsAddingToCart(true);

    // Extract the numeric price for adding to cart
    const numericPrice = typeof product.price === 'number' ? product.price : 0;

    // Call the addItem action from the cart store
    addItem({
      productId: product.id,
      title: product.title || 'Untitled Product', 
      price: numericPrice, // Use the extracted numeric price
      imageUrl: product.featured_image_url || '',
    });

    // Show success toast
    toast({
      title: "Added to Cart",
      description: `${product.title || 'Product'} has been added to your cart.`,
    });

    // Reset loading state after a short delay
    setTimeout(() => setIsAddingToCart(false), 500);
  };

  // Handle wishlist button click
  const handleWishlistToggle = () => {
    startWishlistTransition(async () => {
      const currentWishlistedState = isWishlisted;
      // Optimistically update UI
      setIsWishlisted(!currentWishlistedState);

      try {
        let result;
        if (currentWishlistedState) {
          // Currently wishlisted, so remove
          result = await removeFromWishlist(product.id);
        } else {
          // Not wishlisted, so add
          result = await addToWishlist(product.id);
        }

        if (!result.success) {
          // Revert UI on error
          setIsWishlisted(currentWishlistedState);
          toast({
            title: "Wishlist Error",
            description: result.error || "Could not update wishlist.",
            variant: "destructive",
          });
        } else {
          toast({
            title: currentWishlistedState ? "Removed from Wishlist" : "Added to Wishlist",
            description: `${product.title || 'Product'} has been ${currentWishlistedState ? 'removed from' : 'added to'} your wishlist.`,
          });
        }
      } catch (error) {
        // Revert UI on unexpected error
        setIsWishlisted(currentWishlistedState);
        toast({
          title: "Wishlist Error",
          description: "An unexpected error occurred.",
          variant: "destructive",
        });
        console.error("Wishlist toggle error:", error);
      }
    });
  };

  // Clean title by removing license type suffix
  const cleanTitle = product.title?.replace(/ \((CUR|PLR)\)/, '') || 'Untitled Product';

  return (
    <Card className={`flex flex-col overflow-hidden border rounded-lg shadow-sm hover:shadow-md transition-all duration-200 h-full ${isOnSale ? 'border-rose-200 bg-rose-50/30' : 'border-neutral-200'}`}>
      <CardHeader className="p-0 group relative">
        {/* Enhanced Sale Badge conditionally */}
        {isOnSale && (
          <Badge 
            variant="destructive" 
            className="absolute top-2 right-2 z-10 px-2.5 py-1 text-xs font-semibold shadow-sm animate-pulse"
          >
            Sale
          </Badge>
        )}
        <Link href={`/dashboard/store/product/${product.handle}`} className="block">
          <div className="aspect-video relative w-full overflow-hidden">
            {product.featured_image_url ? (
              <>
                <Image
                  src={product.featured_image_url}
                  alt={cleanTitle}
                  fill
                  style={{ objectFit: 'cover' }}
                  sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
                  className="transition-transform duration-500 group-hover:scale-105"
                />
                {/* Quick preview overlay - trigger callback */}
                <div 
                  className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer"
                  // TEMPORARILY REMOVED onClick to test navigation
                  /*
                  onClick={(e) => {
                    e.preventDefault(); // Prevent Link navigation
                    e.stopPropagation(); // Prevent event bubbling
                    onOpenQuickView(product); // Call the passed handler
                  }}
                  */
                  role="button"
                  aria-label={`Quick view ${cleanTitle}`}
                >
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    className="gap-1.5 pointer-events-none" // Prevent button intercepting click
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>Preview</span>
                  </Button>
                </div>
              </>
            ) : (
              <div className="aspect-video bg-neutral-100 flex items-center justify-center">
                <span className="text-neutral-500 text-sm">No Image</span>
              </div>
            )}
          </div>
        </Link>
      </CardHeader>
      
      <CardContent className="p-4 flex-grow flex flex-col">
        <div className="flex justify-between items-start mb-1">
          <Link href={`/dashboard/store/product/${product.handle}`} className="block flex-1 mr-2">
            <CardTitle className="text-lg font-semibold line-clamp-2 hover:text-primary transition-colors">
              {cleanTitle}
            </CardTitle>
          </Link>
          
          {/* Wishlist Button */}
          <Button 
            variant="ghost" 
            size="icon" 
            className={`h-8 w-8 ml-1 shrink-0 group ${isWishlistPending ? 'opacity-50 cursor-not-allowed' : ''}`} 
            onClick={handleWishlistToggle}
            disabled={isWishlistPending}
            aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
          >
            <Heart 
              className={`h-5 w-5 transition-all ${isWishlisted ? 'text-red-500 fill-red-500' : 'text-muted-foreground group-hover:text-red-500'}`}
            />
          </Button>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 ml-1 shrink-0 text-muted-foreground" 
                  aria-label="View license information">
                  <Info className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{getLicenseBadgeText(licenseType)}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        
        {/* License type badge */}
        <div className="mt-1 mb-2">
          <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary">
            {getLicenseBadgeText(licenseType)}
          </span>
        </div>
        
        {/* Add license terms component in minimal mode */}
        <div className="mt-1 mb-3">
          <LicenseTerms minimal variant="hover" licenseType={licenseType} />
        </div>
      </CardContent>
      
      {/* Enhanced Sale Pricing Display */}
      <CardFooter className={`p-4 flex justify-between items-center rounded-b-lg border-t ${isOnSale ? 'bg-rose-50/50 border-rose-100' : 'bg-neutral-50 border-neutral-100'}`}>
        {(() => {
          // Use the formatting utility which handles sale logic
          const { formattedPrice, formattedCompareAtPrice } = formatPriceDisplayPHP({
            price: product.price,
            compareAtPrice: product.compare_at_price // Pass compare_at_price
          });

          return (
            <div className="flex flex-col items-start gap-0.5">
              {/* Display compare-at price if it exists */}
              {formattedCompareAtPrice && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground line-through">
                    {formattedCompareAtPrice}
                  </span>
                  {/* Show discount percentage when on sale */}
                  {product.compare_at_price && (
                    <span className="text-xs font-medium text-rose-600 bg-rose-100 px-1.5 py-0.5 rounded">
                      {Math.round((1 - (product.price / product.compare_at_price)) * 100)}% OFF
                    </span>
                  )}
                </div>
              )}
              {/* Display the final price */}
              <span className={`text-lg font-semibold ${isOnSale ? 'text-rose-700' : 'text-neutral-800'}`}>
                {formattedPrice || 'N/A'} { /* Fallback if formatting fails */ }
              </span>
            </div>
          );
        })()}
        
        {/* Conditional Add to Cart Button / Owned Indicator */}
        {isOwned ? (
          <Badge variant="secondary" className="px-3 py-1.5 text-sm bg-green-100 text-green-800 border-green-200">
            Purchased
          </Badge>
        ) : (
          <Button 
            onClick={handleAddToCart} 
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            disabled={isAddingToCart}
          >
            {isAddingToCart && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Add to Cart
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default ProductCard; 