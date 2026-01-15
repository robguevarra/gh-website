'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ShoppingBag, ArrowRight, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose
} from "@/components/ui/sheet";
import { Separator } from '@/components/ui/separator';
// Use Public Cart Store
import {
  usePublicCartStore,
  selectPublicCartItems,
  selectPublicCartTotalPrice,
  selectIsPublicCartSheetOpen,
  selectPublicCartTotalQuantity
} from '@/stores/publicCartStore';
import { formatPriceDisplayPHP } from '@/lib/utils/formatting';

const PublicCartView = () => {
  const items = usePublicCartStore(selectPublicCartItems);
  const totalPrice = usePublicCartStore(selectPublicCartTotalPrice);
  const totalQuantity = usePublicCartStore(selectPublicCartTotalQuantity);
  const isSheetOpen = usePublicCartStore(selectIsPublicCartSheetOpen);

  const removeItem = usePublicCartStore((state) => state.removeItem);
  const closeCartSheet = usePublicCartStore((state) => state.closeCartSheet);
  const toggleCartSheet = usePublicCartStore((state) => state.toggleCartSheet);

  return (
    <Sheet open={isSheetOpen} onOpenChange={toggleCartSheet}>
      <SheetContent className="flex w-full flex-col pr-0 sm:max-w-lg">
        <SheetHeader className="px-1">
          <SheetTitle className="flex items-center">
            Cart ({totalQuantity})
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center space-y-2">
            <ShoppingBag className="h-12 w-12 text-muted-foreground/50" />
            <span className="text-lg font-medium text-muted-foreground">
              Your cart is empty
            </span>
            <SheetClose asChild>
              <Button variant="link" className="text-sm text-primary">
                Continue Shopping
              </Button>
            </SheetClose>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 pr-6">
              <div className="flex flex-col gap-5 py-4">
                {items.map((item) => (
                  <div key={item.productId} className="flex gap-4">
                    <div className="relative aspect-square h-20 w-20 min-w-20 overflow-hidden rounded-md border bg-muted">
                      {item.imageUrl ? (
                        <Image
                          src={item.imageUrl}
                          alt={item.title}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-secondary">
                          <ShoppingBag className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col gap-1">
                      <div className="flex justify-between">
                        <span className="font-semibold line-clamp-2">{item.title}</span>
                        <span className="font-medium">
                          {formatPriceDisplayPHP({ price: item.price }).formattedPrice}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-auto">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Qty: {item.quantity}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => removeItem(item.productId)}
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Remove</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <div className="space-y-4 pr-6 pt-6 pb-6">
              <Separator />
              <div className="flex items-center justify-between text-base font-semibold">
                <span>Total</span>
                <span>{formatPriceDisplayPHP({ price: totalPrice }).formattedPrice}</span>
              </div>
              <Button
                className="w-full"
                size="lg"
                asChild
                onClick={closeCartSheet}
              >
                <Link href="/shop/checkout">
                  Proceed to Checkout <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default PublicCartView; 