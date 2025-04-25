'use client';

import React from 'react';
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
import { useCartStore, selectCartTotalQuantity } from '@/stores/cartStore';
import CartView from './CartView'; // Import the cart view component

const CartIndicator = () => {
  // Get total quantity from the cart store
  const totalQuantity = useCartStore(selectCartTotalQuantity);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <ShoppingCart className="h-5 w-5" />
          {totalQuantity > 0 && (
            <Badge 
              variant="destructive" // Use a prominent color
              className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center rounded-full text-xs"
            >
              {totalQuantity}
            </Badge>
          )}
          <span className="sr-only">Open shopping cart</span>
        </Button>
      </SheetTrigger>
      {/* Render CartView inside the SheetContent */} 
      <CartView /> 
    </Sheet>
  );
};

export default CartIndicator; 