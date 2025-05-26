'use client';

import { useEffect } from 'react';
import { useCartStore } from '@/stores/cartStore';

// This client component runs once on mount to clear the cart after a successful purchase.
export default function ClearCartClient() {
  const clearCart = useCartStore((state) => state.clearCart);
  const userId = useCartStore((state) => state.userId);
  const items = useCartStore((state) => state.items);

  useEffect(() => {
    // Log the current state before clearing
    console.log('[ClearCartClient] Component mounted. Current state:', { 
      hasItems: items.length > 0,
      itemCount: items.length, 
      userId 
    });
    
    // Add a small delay to ensure the store is fully initialized
    const timeoutId = setTimeout(() => {
      try {
        console.log('[ClearCartClient] Executing clearCart()...');
        clearCart();
        console.log('[ClearCartClient] Cart cleared successfully from client store');
      } catch (error) {
        console.error('[ClearCartClient] Error while clearing cart:', error);
      }
    }, 500);
    
    // Cleanup function to cancel the timeout if the component unmounts
    return () => clearTimeout(timeoutId);
  }, [clearCart, items.length, userId]); // Add dependencies to ensure proper triggering

  // This component doesn't render anything visible
  return null;
} 