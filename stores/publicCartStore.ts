// ... (imports same)
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// ... (CartItem interface same)
export interface CartItem {
  productId: string;
  quantity: number;
  title: string;
  price: number;
  imageUrl: string;
}

interface PublicCartState {
  items: CartItem[];
  // Removed userId, isSyncing, lastSynced as this is guest/public only

  // Sheet Control
  isSheetOpen: boolean;

  // Cart item actions
  addItem: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;

  // Utility selectors
  getTotalItems: () => number;
  getTotalPrice: () => number;

  // Sheet Control Actions
  openCartSheet: () => void;
  closeCartSheet: () => void;
  toggleCartSheet: () => void;
}

export const usePublicCartStore = create<PublicCartState>()(
  persist(
    (set, get) => ({
      items: [],
      isSheetOpen: false,

      addItem: (newItem) => {
        set((state) => {
          const existingItemIndex = state.items.findIndex(
            (item) => item.productId === newItem.productId
          );
          const quantityToAdd = newItem.quantity ?? 1;

          let updatedItems;

          if (existingItemIndex > -1) {
            updatedItems = [...state.items];
            const currentItem = updatedItems[existingItemIndex];
            currentItem.quantity = 1; // Limit to 1 per item for digital goods
          } else {
            const itemToAdd: CartItem = {
              ...newItem,
              quantity: quantityToAdd,
            };
            updatedItems = [...state.items, itemToAdd];
          }

          return { items: updatedItems };
        });
      },

      removeItem: (productId) => {
        set((state) => ({
          items: state.items.filter((item) => item.productId !== productId)
        }));
      },

      updateQuantity: (productId, quantity) => {
        set((state) => ({
          items: state.items
            .map((item) =>
              item.productId === productId
                ? { ...item, quantity: Math.max(0, quantity) }
                : item
            )
            .filter(item => item.quantity > 0)
        }));
      },

      clearCart: () => {
        set({ items: [] });
        try {
          localStorage.removeItem('public-cart-storage');
        } catch (error) {
          console.error('Failed to clear public cart from localStorage:', error);
        }
      },

      openCartSheet: () => set({ isSheetOpen: true }),
      closeCartSheet: () => set({ isSheetOpen: false }),
      toggleCartSheet: () => set((state) => ({ isSheetOpen: !state.isSheetOpen })),

      getTotalItems: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0);
      },

      getTotalPrice: () => {
        return get().items.reduce((total, item) => total + (item.price * item.quantity), 0);
      },
    }),
    {
      name: 'public-cart-storage', // Unique name for public store
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        items: state.items,
      }),
    }
  )
);

// Define selectors
export const selectPublicCartItems = (state: PublicCartState) => state.items;
export const selectPublicCartTotalQuantity = (state: PublicCartState) => state.getTotalItems();
export const selectPublicCartTotalPrice = (state: PublicCartState) => state.getTotalPrice();
export const selectIsPublicCartSheetOpen = (state: PublicCartState) => state.isSheetOpen;
