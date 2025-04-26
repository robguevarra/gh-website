'use client';

import { useEffect } from 'react';
import { useCartStore } from '@/stores/cartStore';
import { useAuth } from '@/context/auth-context';

/**
 * Provider component that synchronizes cart data between local storage and database
 * This handles loading cart items when a user logs in and merging items if needed
 */
export function CartSyncProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { 
    userId,
    isSyncing,
    items, 
    syncWithDatabase,
    loadUserCart
  } = useCartStore(state => ({
    userId: state.userId,
    isSyncing: state.isSyncing,
    items: state.items,
    syncWithDatabase: state.syncWithDatabase,
    loadUserCart: state.loadUserCart
  }));
  
  const { isAuthReady, user } = useAuth();
  
  // Load cart from database when user logs in
  useEffect(() => {
    if (isAuthReady && user && userId === user.id && !isSyncing) {
      loadUserCart(user.id);
    }
  }, [isAuthReady, user, userId, loadUserCart, isSyncing]);
  
  // Sync cart with database when items change and user is logged in
  useEffect(() => {
    if (isAuthReady && user && userId === user.id && !isSyncing) {
      // Add debounce to prevent excessive database operations
      const timeoutId = setTimeout(() => {
        syncWithDatabase();
      }, 1000);
      
      return () => clearTimeout(timeoutId);
    }
  }, [isAuthReady, items, user, userId, syncWithDatabase, isSyncing]);
  
  // This is just a wrapper component, so render children directly
  return <>{children}</>;
} 