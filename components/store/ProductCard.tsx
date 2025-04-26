'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Eye, Info } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ProductData } from '@/app/dashboard/store/page'; // Import type from page
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

interface ProductCardProps {
  product: ProductData;
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

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  // State for loading when adding to cart
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  
  // Get addItem action from cart store
  const addItem = useCartStore((state) => state.addItem); 
  
  // Use toast for feedback
  const { toast } = useToast();
  
  // Determine license type from title
  const licenseType = getLicenseTypeFromTitle(product.title);

  // Determine if the product is on sale
  const isOnSale = typeof product.compare_at_price === 'number' && product.compare_at_price > (product.price ?? 0);

  const handleAddToCart = () => {
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

  // Clean title by removing license type suffix
  const cleanTitle = product.title?.replace(/ \((CUR|PLR)\)/, '') || 'Untitled Product';

  return (
    <Card className="flex flex-col overflow-hidden border border-neutral-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 h-full">
      <CardHeader className="p-0 group relative">
        {/* Add Sale Badge conditionally */}
        {isOnSale && (
          <Badge 
            variant="destructive" 
            className="absolute top-2 right-2 z-10"
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
                {/* Quick preview overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <Button variant="secondary" size="sm" className="gap-1.5">
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
      
      {/* Step 1.4: Handle Sale Pricing Display */}
      <CardFooter className="p-4 flex justify-between items-center bg-neutral-50 rounded-b-lg border-t border-neutral-100">
        {(() => {
          // Use the formatting utility which handles sale logic
          const { formattedPrice, formattedCompareAtPrice } = formatPriceDisplayPHP({
            price: product.price,
            compareAtPrice: product.compare_at_price // Pass compare_at_price
          });

          return (
            <div className="flex items-baseline gap-2">
              {/* Display compare-at price if it exists */}
              {formattedCompareAtPrice && (
                <span className="text-sm text-muted-foreground line-through">
                  {formattedCompareAtPrice}
                </span>
              )}
              {/* Display the final price */}
              <span className="text-lg font-semibold text-neutral-800">
                {formattedPrice || 'N/A'} { /* Fallback if formatting fails */ }
              </span>
            </div>
          );
        })()}
        
        <Button 
          onClick={handleAddToCart} 
          className="bg-primary text-primary-foreground hover:bg-primary/90"
          disabled={isAddingToCart}
        >
          {isAddingToCart && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Add to Cart
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ProductCard; 