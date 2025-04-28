'use client';

import { useEffect } from 'react';
import { useCartStore } from '@/stores/cartStore';

// This client component runs once on mount to clear the cart after a successful purchase.
export default function ClearCartClient() {
  const clearCart = useCartStore((state) => state.clearCart);

  useEffect(() => {
    console.log('[ClearCartClient] Clearing cart after successful checkout...');
    clearCart();
  }, [clearCart]); // Dependency array ensures this runs only once

  // This component doesn't render anything visible
  return null;
} 