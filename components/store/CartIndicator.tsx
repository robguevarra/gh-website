'use client';

import React, { useState, useEffect } from 'react';
import { ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useCartStore, selectCartTotalQuantity, selectIsCartSheetOpen } from '@/stores/cartStore';
import CartView from './CartView'; // Import the cart view component

const CartIndicator = () => {
  // Get total quantity from the cart store
  const totalQuantity = useCartStore(selectCartTotalQuantity);
  // Get sheet state and toggle action from the store
  const isSheetOpen = useCartStore(selectIsCartSheetOpen);
  const toggleCartSheet = useCartStore((state) => state.toggleCartSheet);
  const openCartSheet = useCartStore((state) => state.openCartSheet);
  const closeCartSheet = useCartStore((state) => state.closeCartSheet);
  
  // State to track client-side mounting
  const [isMounted, setIsMounted] = useState(false);

  // Set mounted state only on the client
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Handler for the button click
  const handleTriggerClick = () => {
    toggleCartSheet(); // Use action from store
  };
  
  // Handler for Sheet's onOpenChange
  const handleOpenChange = (open: boolean) => {
    if (open) {
      openCartSheet();
    } else {
      closeCartSheet();
    }
  };

  return (
    // Use Sheet component directly, controlled by store state
    <Sheet open={isSheetOpen} onOpenChange={handleOpenChange}>
      {/* Button remains the trigger visually, but onClick handled separately */}
      <Button 
        variant="outline" 
        size="icon" 
        className="relative" 
        onClick={handleTriggerClick} // Call store action on click
        aria-label="Open shopping cart"
      >
        <ShoppingCart className="h-5 w-5" />
        {/* Only render the badge if mounted and quantity > 0 */}
        {isMounted && totalQuantity > 0 && (
          <Badge 
            variant="destructive" // Use a prominent color
            className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center rounded-full text-xs"
          >
            {totalQuantity}
          </Badge>
        )}
        <span className="sr-only">Open shopping cart</span>
      </Button>
      {/* Render CartView inside the SheetContent (no longer needs SheetTrigger) */} 
      <CartView /> 
    </Sheet>
  );
};

export default CartIndicator; 