'use client';

import React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation'; // Import useRouter
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetTrigger, // Will be used in the header
  SheetClose, 
} from "@/components/ui/sheet";
import { Button } from '@/components/ui/button';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Trash2 } from 'lucide-react'; // Icon for remove button
import { 
    useCartStore, 
    selectCartItems, 
    selectCartTotalPrice,
    selectCartTotalQuantity // Import quantity selector too
} from '@/stores/cartStore';
import { ShoppingBag } from 'lucide-react'; // Added ShoppingBag icon
import { useToast } from '@/components/ui/use-toast';
import { formatCurrencyPHP } from '@/lib/utils/formatting';

// Helper to format currency
// const formatPrice = (price: number): string => {
//     return new Intl.NumberFormat('en-US', {
//       style: 'currency',
//       currency: 'USD', // TODO: Make currency dynamic if needed
//     }).format(price);
// };

// This component will likely be triggered by a button elsewhere (e.g., in Header)
// It assumes it's rendered within a Sheet component structure.
const CartView = () => {
  // Get cart state and actions from Zustand store using selectors
  const items = useCartStore(selectCartItems);
  const totalPrice = useCartStore(selectCartTotalPrice);
  const totalQuantity = useCartStore(selectCartTotalQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const clearCart = useCartStore((state) => state.clearCart);
  const closeCartSheet = useCartStore((state) => state.closeCartSheet); // Get sheet close action
  
  // Get router instance
  const router = useRouter();
  
  // Add toast for user feedback
  const { toast } = useToast();

  // Handle remove item with toast feedback
  const handleRemoveItem = (productId: string, title: string) => {
    removeItem(productId);
    toast({
      title: "Item Removed",
      description: `${title} has been removed from your cart.`,
    });
  };

  // Handle clear cart with toast feedback
  const handleClearCart = () => {
    clearCart();
    toast({
      title: "Cart Cleared",
      description: "All items have been removed from your cart.",
      variant: "destructive",
    });
  };

  // Handle checkout navigation
  const handleCheckout = () => {
    // Close the sheet first
    closeCartSheet(); 
    // Navigate to the checkout page
    router.push('/dashboard/checkout');
  };

  return (
    <SheetContent className="flex flex-col w-full sm:max-w-lg bg-background">
      <SheetHeader className="mb-4">
        <SheetTitle className="text-primary text-2xl">Shopping Cart ({totalQuantity})</SheetTitle>
      </SheetHeader>
      
      {items.length === 0 ? (
        <div className="flex-grow flex flex-col items-center justify-center text-center px-6">
          <ShoppingBag className="h-16 w-16 text-neutral-300 mb-4" />
          <p className="text-muted-foreground mb-4">Your cart is empty.</p>
          <SheetClose asChild>
            <Button 
              variant="outline" 
              className="border-primary text-primary hover:bg-primary/10"
            >
                Continue Shopping
            </Button>
          </SheetClose>
        </div>
      ) : (
        <>
          <ScrollArea className="flex-grow mb-4 pr-6 -mr-6"> {/* Offset padding for scrollbar */}
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.productId} className="flex items-start gap-4">
                  <div className="relative h-16 w-16 overflow-hidden rounded border bg-neutral-50">
                    {item.imageUrl ? (
                       <Image 
                        src={item.imageUrl} 
                        alt={item.title} 
                        fill 
                        style={{ objectFit: 'cover' }} 
                        sizes="64px" 
                      />
                    ) : (
                      <div className="h-full w-full bg-secondary flex items-center justify-center rounded">
                         <span className="text-xs text-muted-foreground">No img</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-grow">
                    <p className="font-medium text-sm mb-1 line-clamp-2 text-neutral-800">{item.title}</p>
                    <p className="text-sm font-semibold text-neutral-900">{formatCurrencyPHP(item.price)}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-neutral-400 hover:text-destructive hover:bg-destructive/10 shrink-0"
                    onClick={() => handleRemoveItem(item.productId, item.title)}
                    aria-label={`Remove ${item.title} from cart`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
          
          <Separator className="my-4 bg-neutral-200" />
          
          <SheetFooter className="mt-auto pt-4 border-t border-neutral-200 sm:flex-col sm:items-stretch sm:gap-4">
             <div className="flex justify-between items-center mb-4">
               <span className="text-base text-neutral-600">Subtotal:</span>
               <span className="text-xl font-semibold text-neutral-900">{formatCurrencyPHP(totalPrice)}</span>
             </div>
            <div className="flex flex-col sm:flex-row justify-between gap-2">
              <Button 
                variant="outline" 
                onClick={handleClearCart}
                className="border-destructive text-destructive hover:bg-destructive/10"
                >Clear Cart
               </Button>
              <Button 
                className="flex-grow bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={handleCheckout} // Attach handleCheckout function
              >
                Proceed to Checkout
              </Button>
            </div>
          </SheetFooter>
        </>
      )}
    </SheetContent>
  );
};

export default CartView; 