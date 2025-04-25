import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

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
  addItem: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void; // Optional: If quantity needs adjustment
  clearCart: () => void;
  // Selectors can be defined here or derived in components
  // getCartTotalQuantity: () => number; // Example selector definition
  // getCartTotalPrice: () => number; // Example selector definition
}

// Create the Zustand store with persistence
export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      // Action to add an item or increment its quantity
      addItem: (newItem) => {
        set((state) => {
          const existingItemIndex = state.items.findIndex(
            (item) => item.productId === newItem.productId
          );
          const quantityToAdd = newItem.quantity ?? 1; // Default to adding 1

          if (existingItemIndex > -1) {
            // If item exists, update its quantity
            const updatedItems = [...state.items];
            const currentItem = updatedItems[existingItemIndex];
            // In this model, we might just replace or ensure quantity is 1 for licenses
            // If quantity can be > 1, use: currentItem.quantity += quantityToAdd;
            currentItem.quantity = 1; // For simplicity, assume max 1 per license product
            return { items: updatedItems };
          } else {
            // If item is new, add it to the cart
            // Ensure the new item has quantity property explicitly set
            const itemToAdd: CartItem = {
                ...newItem,
                quantity: quantityToAdd, 
            };
            return { items: [...state.items, itemToAdd] };
          }
        });
      },

      // Action to remove an item completely
      removeItem: (productId) => {
        set((state) => ({
          items: state.items.filter((item) => item.productId !== productId),
        }));
      },

      // Action to update quantity (optional, might not be needed for licenses)
      updateQuantity: (productId, quantity) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.productId === productId
              ? { ...item, quantity: Math.max(0, quantity) } // Ensure quantity isn't negative
              : item
          ).filter(item => item.quantity > 0), // Remove if quantity becomes 0
        }));
      },

      // Action to clear the entire cart
      clearCart: () => {
        set({ items: [] });
      },

      // Example selectors defined within the store
      // getCartTotalQuantity: () => get().items.reduce((total, item) => total + item.quantity, 0),
      // getCartTotalPrice: () => get().items.reduce((total, item) => total + item.price * item.quantity, 0),
    }),
    {
      name: 'cart-storage', // Unique name for localStorage key
      storage: createJSONStorage(() => localStorage), // Use localStorage
      // partialize: (state) => ({ items: state.items }), // Optionally persist only specific parts
    }
  )
);

// Define selectors outside the store for better component usage
export const selectCartItems = (state: CartState) => state.items;
export const selectCartTotalQuantity = (state: CartState) => 
  state.items.reduce((total, item) => total + item.quantity, 0);
export const selectCartTotalPrice = (state: CartState) => 
  state.items.reduce((total, item) => total + (item.price * item.quantity), 0); 