'use client';

import React, { useEffect, useState } from 'react';
import { ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usePublicCartStore, selectPublicCartTotalQuantity } from '@/stores/publicCartStore';

const PublicCartIndicator = () => {
  const [mounted, setMounted] = useState(false);
  const totalQuantity = usePublicCartStore(selectPublicCartTotalQuantity);
  const toggleCartSheet = usePublicCartStore((state) => state.toggleCartSheet);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative rounded-full h-10 w-10 hover:bg-neutral-100"
      onClick={toggleCartSheet}
      aria-label="Open shopping cart"
    >
      <ShoppingCart className="h-5 w-5" />
      {/* Only render the badge if mounted and quantity > 0 */}
      {mounted && totalQuantity > 0 && (
        <Badge
          variant="destructive"
          className="absolute top-0 right-0 h-4 w-4 min-w-[1rem] p-0 flex items-center justify-center rounded-full text-[10px]"
        >
          {totalQuantity}
        </Badge>
      )}
      <span className="sr-only">Open shopping cart</span>
    </Button>
  );
};

export default PublicCartIndicator; 