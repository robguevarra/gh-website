'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, ShoppingCart, X } from 'lucide-react'; // Added X for close
import { useCartStore } from '@/stores/cartStore';
import { formatPriceDisplayPHP } from '@/lib/utils/formatting';
import { ProductData } from '@/app/dashboard/store/page'; // Assuming full details might be needed
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import LicenseTerms, { getLicenseTypeFromTitle } from './LicenseTerms'; // Reuse LicenseTerms
import Link from 'next/link';

interface QuickViewModalProps {
  product: ProductData | null; // Product to display, or null
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const QuickViewModal: React.FC<QuickViewModalProps> = ({ product, isOpen, onOpenChange }) => {
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const addItem = useCartStore((state) => state.addItem);
  const { toast } = useToast();

  if (!product) {
    return null; // Don't render anything if no product is selected
  }

  // Simplified Add to Cart for modal
  const handleAddToCart = () => {
    setIsAddingToCart(true);
    const numericPrice = typeof product.price === 'number' ? product.price : 0;
    addItem({
      productId: product.id,
      title: product.title || 'Untitled Product',
      price: numericPrice,
      imageUrl: product.featured_image_url || '',
    });
    toast({
      title: "Added to Cart",
      description: `${product.title || 'Product'} has been added to your cart.`,
    });
    setTimeout(() => {
        setIsAddingToCart(false);
        onOpenChange(false); // Close modal after adding
    }, 500);
  };

  // Determine license type
  const licenseType = getLicenseTypeFromTitle(product.title);
  const { formattedPrice, formattedCompareAtPrice } = formatPriceDisplayPHP({
    price: product.price,
    compareAtPrice: product.compare_at_price,
  });

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] p-0">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
          {/* Image Side */}
          <div className="relative aspect-square bg-muted/20 overflow-hidden md:rounded-l-lg">
            {product.featured_image_url ? (
              <Image
                src={product.featured_image_url}
                alt={product.title || 'Product image'}
                fill
                style={{ objectFit: 'cover' }}
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <span className="text-muted-foreground text-sm">No image</span>
              </div>
            )}
             <DialogClose className="absolute top-2 right-2 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground bg-background p-1.5">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </DialogClose>
          </div>

          {/* Details Side */}
          <div className="p-6 flex flex-col">
            <DialogHeader className="mb-4">
              <DialogTitle className="text-2xl font-serif line-clamp-2">
                {product.title?.replace(/ \((CUR|PLR)\)/, '') || 'Untitled Product'}
              </DialogTitle>
            </DialogHeader>

            {/* Price */}
            <div className="flex items-baseline gap-2 mb-4">
                {formattedCompareAtPrice && (
                    <span className="text-md text-muted-foreground line-through">
                    {formattedCompareAtPrice}
                    </span>
                )}
                <span className="text-xl font-semibold">
                    {formattedPrice || 'N/A'}
                </span>
            </div>

            {/* Short Description Placeholder - Assuming description isn't passed */}
            {/* In a real scenario, you might fetch full details or pass description */}
            {/* <p className="text-sm text-muted-foreground mb-4 line-clamp-3">Short description placeholder...</p> */}
            
            {/* License Info */}
            <div className="mb-4 bg-muted/30 p-3 rounded-md border text-sm">
                <LicenseTerms variant="inline" licenseType={licenseType} minimal />
            </div>

            {/* Add to Cart Button */}
            <div className="mt-auto">
                <Button 
                    onClick={handleAddToCart}
                    className="w-full py-3 text-md bg-primary hover:bg-primary/90"
                    disabled={isAddingToCart}
                >
                    {isAddingToCart ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    )}
                    Add to Cart
                </Button>
                {/* Optional: Link to full product page */}
                 <Button variant="outline" className="w-full mt-2" asChild>
                    <Link href={`/dashboard/store/product/${product.handle}`}>View Full Details</Link>
                 </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QuickViewModal; 