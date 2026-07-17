import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Product, Vehicle } from '@/types';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CartItem {
  readonly product: Product;
  quantity: number;
  technicianName?: string;
}

export interface CartState {
  // State
  items: CartItem[];
  vehicle: Vehicle | null;
  discount: number;

  // Mutating actions
  addItem: (product: Product, quantity?: number, technicianName?: string) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  setVehicle: (vehicle: Vehicle | null) => void;
  setDiscount: (amount: number) => void;

  // Computed — always reads fresh state via get()
  getSubtotal: () => number;
  getTotal: () => number;
  getItemCount: () => number;
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const usePOSCartStore = create<CartState>()(
  devtools(
    (set, get) => ({
      items: [],
      vehicle: null,
      discount: 0,

      addItem: (product, quantity = 1, technicianName) => {
        if (quantity <= 0) return;
        set(
          (state) => {
            const existing = state.items.find((i) => i.product.id === product.id);
            if (existing) {
              return {
                items: state.items.map((i) =>
                  i.product.id === product.id
                    ? { ...i, quantity: i.quantity + quantity, technicianName: technicianName ?? i.technicianName }
                    : i,
                ),
              };
            }
            return { items: [...state.items, { product, quantity, technicianName }] };
          },
          false,
          'addItem',
        );
      },

      removeItem: (productId) => {
        set(
          (state) => ({
            items: state.items.filter((i) => i.product.id !== productId),
          }),
          false,
          'removeItem',
        );
      },

      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId);
          return;
        }
        set(
          (state) => ({
            items: state.items.map((i) =>
              i.product.id === productId ? { ...i, quantity } : i,
            ),
          }),
          false,
          'updateQuantity',
        );
      },

      clearCart: () => {
        set({ items: [], vehicle: null, discount: 0 }, false, 'clearCart');
      },

      setVehicle: (vehicle) => {
        set({ vehicle }, false, 'setVehicle');
      },

      setDiscount: (amount) => {
        set({ discount: Math.max(0, amount) }, false, 'setDiscount');
      },

      getSubtotal: () =>
        get().items.reduce(
          (sum, item) => sum + Number(item.product.sellingPrice) * item.quantity,
          0,
        ),

      getTotal: () => Math.max(0, get().getSubtotal() - get().discount),

      getItemCount: () =>
        get().items.reduce((sum, item) => sum + item.quantity, 0),
    }),
    { name: 'pos-cart', enabled: import.meta.env.MODE !== 'test' },
  ),
);
