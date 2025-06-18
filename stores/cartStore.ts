import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { getBrowserClient } from '@/lib/supabase/client';

// Define the structure for an item in the cart
export interface CartItem {
  productId: string;
  quantity: number;
  title: string; // Include details needed for display
  price: number;
  imageUrl: string;
}

// Define the state structure for the cart store
interface CartState {
  items: CartItem[];
  userId: string | null;
  isSyncing: boolean;
  lastSynced: number | null;
  
  // Sheet Control
  isSheetOpen: boolean;
  
  // Cart item actions
  addItem: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  
  // User sync actions
  setUserId: (userId: string | null) => void;
  syncWithDatabase: () => Promise<void>;
  loadUserCart: (userId: string) => Promise<void>;
  
  // Utility selectors
  getTotalItems: () => number;
  getTotalPrice: () => number;

  // Sheet Control Actions
  openCartSheet: () => void;
  closeCartSheet: () => void;
  toggleCartSheet: () => void;

  // New functions
  clearLocalStorage: () => void;
}

// Get the supabase client
const getSupabase = () => getBrowserClient();

// Create the Zustand store with persistence
export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      userId: null,
      isSyncing: false,
      lastSynced: null,

      // Sheet Control State
      isSheetOpen: false,

      // Action to add an item or increment its quantity
      addItem: (newItem) => {
        set((state) => {
          const existingItemIndex = state.items.findIndex(
            (item) => item.productId === newItem.productId
          );
          const quantityToAdd = newItem.quantity ?? 1; // Default to adding 1

          let updatedItems;
          
          if (existingItemIndex > -1) {
            // If item exists, update its quantity
            updatedItems = [...state.items];
            const currentItem = updatedItems[existingItemIndex];
            // In this model, we might just replace or ensure quantity is 1 for licenses
            // If quantity can be > 1, use: currentItem.quantity += quantityToAdd;
            currentItem.quantity = 1; // For simplicity, assume max 1 per license product
          } else {
            // If item is new, add it to the cart
            // Ensure the new item has quantity property explicitly set
            const itemToAdd: CartItem = {
                ...newItem,
                quantity: quantityToAdd, 
            };
            updatedItems = [...state.items, itemToAdd];
          }
          
          // Schedule a sync with the database if user is logged in
          setTimeout(() => {
            const store = get();
            if (store.userId) {
              store.syncWithDatabase();
            }
          }, 300);
          
          return { items: updatedItems };
        });
      },

      // Action to remove an item completely
      removeItem: (productId) => {
        set((state) => {
          const newItems = state.items.filter((item) => item.productId !== productId);
          
          // Schedule a sync with the database if user is logged in
          setTimeout(() => {
            const store = get();
            if (store.userId) {
              store.syncWithDatabase();
            }
          }, 300);
          
          return { items: newItems };
        });
      },

      // Action to update quantity
      updateQuantity: (productId, quantity) => {
        set((state) => {
          const updatedItems = state.items
            .map((item) =>
              item.productId === productId
                ? { ...item, quantity: Math.max(0, quantity) } // Ensure quantity isn't negative
                : item
            )
            .filter(item => item.quantity > 0); // Remove if quantity becomes 0
          
          // Schedule a sync with the database if user is logged in
          setTimeout(() => {
            const store = get();
            if (store.userId) {
              store.syncWithDatabase();
            }
          }, 300);
          
          return { items: updatedItems };
        });
      },

      // Action to clear the entire cart
      clearCart: () => {
        set({ items: [] });
        
        // Also clear from localStorage to prevent persistence
        try {
          localStorage.removeItem('cart-storage');
        } catch (error) {
          console.error('Failed to clear cart from localStorage:', error);
        }
        
        // Schedule a sync with the database if user is logged in
        setTimeout(() => {
          const store = get();
          if (store.userId) {
            store.syncWithDatabase();
          }
        }, 300);
      },
      
      // Utility function to manually clear localStorage (for debugging/admin use)
      clearLocalStorage: () => {
        try {
          localStorage.removeItem('cart-storage');
          set({ items: [], userId: null, lastSynced: null });
        } catch (error) {
          console.error('Failed to clear localStorage:', error);
        }
      },
      
      // Set the user ID when logging in/out
      setUserId: (userId) => {
        const currentState = get();
        const previousUserId = currentState.userId;
        
        set({ userId });
        
        if (userId) {
          // User just logged in
          if (previousUserId && previousUserId !== userId) {
            // Different user logging in - clear cart completely first
            set({ items: [] });
          }
          
          // Load their cart from database
          setTimeout(() => {
            get().loadUserCart(userId);
          }, 0);
        } else {
          // User logged out - clear the cart completely
          set({ items: [] });
        }
      },
      
      // Sync cart with database
      syncWithDatabase: async () => {
        const { items, userId, isSyncing } = get();
        
        if (!userId || isSyncing) return;
        
        set({ isSyncing: true });
        
        try {
          const supabase = getSupabase();
          
          // First, delete existing cart items for this user
          await supabase
            .from('user_carts')
            .delete()
            .eq('user_id', userId);
          
          // Then insert all current items
          if (items.length > 0) {
            await supabase
              .from('user_carts')
              .insert(
                items.map(item => ({
                  user_id: userId,
                  product_id: item.productId,
                  quantity: item.quantity,
                  title: item.title,
                  price: item.price,
                  image_url: item.imageUrl,
                  created_at: new Date().toISOString(),
                }))
              );
          }
          
          set({ isSyncing: false, lastSynced: Date.now() });
        } catch (error) {
          console.error('Failed to sync cart with database:', error);
          set({ isSyncing: false });
        }
      },
      
      // Load user's cart from database
      loadUserCart: async (userId) => {
        set({ isSyncing: true });
        
        try {
          const supabase = getSupabase();
          
          const { data, error } = await supabase
            .from('user_carts')
            .select('*')
            .eq('user_id', userId);
          
          if (error) throw error;
          
          if (data && data.length > 0) {
            // Convert from database format to cart items
            const cartItems: CartItem[] = data.map(item => ({
              productId: item.product_id,
              quantity: item.quantity,
              title: item.title || 'Untitled Product', // Handle null title
              price: item.price,
              imageUrl: item.image_url || '', // Handle null image_url
            }));
            
            // For security and data integrity, ONLY use database items
            // Do not merge with local storage to prevent cross-user contamination
            set({ items: cartItems });
          } else {
            // User has no saved cart items, start with empty cart
            set({ items: [] });
          }
          
          set({ isSyncing: false, lastSynced: Date.now() });
        } catch (error) {
          console.error('Failed to load user cart:', error);
          set({ isSyncing: false });
          // On error, clear cart to prevent potential contamination
          set({ items: [] });
        }
      },
      
      // Sheet Control Actions
      openCartSheet: () => set({ isSheetOpen: true }),
      closeCartSheet: () => set({ isSheetOpen: false }),
      toggleCartSheet: () => set((state) => ({ isSheetOpen: !state.isSheetOpen })),
      
      // Utility selectors
      getTotalItems: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0);
      },
      
      getTotalPrice: () => {
        return get().items.reduce((total, item) => total + (item.price * item.quantity), 0);
      },
    }),
    {
      name: 'cart-storage', // Unique name for localStorage key
      storage: createJSONStorage(() => localStorage), // Use localStorage
      partialize: (state) => ({ 
        items: state.items,
        userId: state.userId,
        lastSynced: state.lastSynced
      }), // Only persist specific state properties
    }
  )
);

// Define selectors outside the store for better component usage
export const selectCartItems = (state: CartState) => state.items;
export const selectCartTotalQuantity = (state: CartState) => state.getTotalItems();
export const selectCartTotalPrice = (state: CartState) => state.getTotalPrice();
export const selectIsCartSyncing = (state: CartState) => state.isSyncing;
export const selectCartUserId = (state: CartState) => state.userId; 
export const selectIsCartSheetOpen = (state: CartState) => state.isSheetOpen; 