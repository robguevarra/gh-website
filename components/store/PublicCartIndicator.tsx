'use client';

import React, { useEffect, useState } from 'react';
import { ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet } from '@/components/ui/sheet';
import { useCartStore, selectCartTotalQuantity, selectIsCartSheetOpen } from '@/stores/cartStore';
import PublicCartView from './PublicCartView';

const PublicCartIndicator = () => {
  const totalQuantity = useCartStore(selectCartTotalQuantity);
  const isSheetOpen = useCartStore(selectIsCartSheetOpen);
  const toggleCartSheet = useCartStore((state) => state.toggleCartSheet);
  const openCartSheet = useCartStore((state) => state.openCartSheet);
  const closeCartSheet = useCartStore((state) => state.closeCartSheet);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => { setIsMounted(true); }, []);

  const handleTriggerClick = () => { toggleCartSheet(); };
  const handleOpenChange = (open: boolean) => { open ? openCartSheet() : closeCartSheet(); };

  return (
    <Sheet open={isSheetOpen} onOpenChange={handleOpenChange}>
      <Button variant="outline" size="icon" className="relative" onClick={handleTriggerClick} aria-label="Open shopping cart">
        <ShoppingCart className="h-5 w-5" />
        {isMounted && totalQuantity > 0 && (
          <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center rounded-full text-xs">
            {totalQuantity}
          </Badge>
        )}
        <span className="sr-only">Open shopping cart</span>
      </Button>
      <PublicCartView />
    </Sheet>
  );
};

export default PublicCartIndicator;



