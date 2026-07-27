import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { Product, Vehicle, OrderItemMeta } from '@/types';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CartItem {
  /** Local UUID — stable React key + used in remove/update ops (not the DB row id) */
  id: string;
  product: Product;
  quantity: number;
  technicianName?: string;
  meta?: OrderItemMeta;
  warrantyMonths?: number;
}

export interface BillData {
  id: string;
  label: string;
  vehicle: Vehicle | null;
  items: CartItem[];
  discount: number;
}

export interface CartState {
  /** Normalized: O(1) access/update per bill — no cross-bill re-renders */
  bills: Record<string, BillData>;
  activeBillId: string;

  // Bill tab actions
  createBill: () => void;
  removeBill: (id: string) => void;
  setActiveBill: (id: string) => void;

  // Active-bill mutations (operate on bills[activeBillId] implicitly)
  addItem: (product: Product, quantity?: number, technicianName?: string, meta?: OrderItemMeta, warrantyMonths?: number) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  setVehicle: (vehicle: Vehicle | null) => void;
  setDiscount: (amount: number) => void;

  // Computed
  getSubtotal: () => number;
  getTotal: () => number;
  getItemCount: () => number;
  getActiveBill: () => BillData;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeBill(): BillData {
  return { id: crypto.randomUUID(), label: 'บิล', vehicle: null, items: [], discount: 0 };
}

/** Immutably update a single bill in the record */
function patchBill(
  bills: Record<string, BillData>,
  id: string,
  patch: Partial<BillData>,
): Record<string, BillData> {
  const bill = bills[id];
  if (!bill) return bills;
  return { ...bills, [id]: { ...bill, ...patch } };
}

const FIRST_BILL = makeBill();

// ── Store ─────────────────────────────────────────────────────────────────────

export const usePOSCartStore = create<CartState>()(
  devtools(
    persist(
      (set, get) => ({
        bills: { [FIRST_BILL.id]: FIRST_BILL },
        activeBillId: FIRST_BILL.id,

        // ── Bill tab actions ──────────────────────────────────────────────

        createBill: () => {
          const bill = makeBill();
          set(
            (s) => ({ bills: { ...s.bills, [bill.id]: bill }, activeBillId: bill.id }),
            false,
            'createBill',
          );
        },

        removeBill: (id) => {
          set(
            (s) => {
              const remaining = Object.fromEntries(
                Object.entries(s.bills).filter(([k]) => k !== id),
              );
              if (Object.keys(remaining).length === 0) {
                const bill = makeBill();
                return { bills: { [bill.id]: bill }, activeBillId: bill.id };
              }
              if (id !== s.activeBillId) return { bills: remaining };
              // Switch to the bill adjacent to the removed one
              const allIds = Object.keys(s.bills);
              const removedIdx = allIds.indexOf(id);
              const remainingIds = Object.keys(remaining);
              const nextId = remainingIds[Math.min(removedIdx, remainingIds.length - 1)];
              return { bills: remaining, activeBillId: nextId };
            },
            false,
            'removeBill',
          );
        },

        setActiveBill: (id) => {
          set((s) => (s.bills[id] ? { activeBillId: id } : {}), false, 'setActiveBill');
        },

        // ── Active-bill mutations ─────────────────────────────────────────

        addItem: (product, quantity = 1, technicianName, meta, warrantyMonths) => {
          if (quantity <= 0) return;
          set(
            (s) => {
              const bill = s.bills[s.activeBillId];
              if (!bill) return {};
              const existing = bill.items.find((i) => i.product.id === product.id);
              const newItems = existing
                ? bill.items.map((i) =>
                    i.product.id === product.id
                      ? {
                          ...i,
                          quantity: i.quantity + quantity,
                          technicianName: technicianName ?? i.technicianName,
                          meta: meta ?? i.meta,
                          warrantyMonths: warrantyMonths ?? i.warrantyMonths,
                        }
                      : i,
                  )
                : [
                    ...bill.items,
                    { id: crypto.randomUUID(), product, quantity, technicianName, meta, warrantyMonths },
                  ];
              return { bills: patchBill(s.bills, s.activeBillId, { items: newItems }) };
            },
            false,
            'addItem',
          );
        },

        removeItem: (itemId) => {
          set(
            (s) => {
              const bill = s.bills[s.activeBillId];
              if (!bill) return {};
              return {
                bills: patchBill(s.bills, s.activeBillId, {
                  items: bill.items.filter((i) => i.id !== itemId),
                }),
              };
            },
            false,
            'removeItem',
          );
        },

        updateQuantity: (itemId, quantity) => {
          if (quantity <= 0) {
            get().removeItem(itemId);
            return;
          }
          set(
            (s) => {
              const bill = s.bills[s.activeBillId];
              if (!bill) return {};
              return {
                bills: patchBill(s.bills, s.activeBillId, {
                  items: bill.items.map((i) => (i.id === itemId ? { ...i, quantity } : i)),
                }),
              };
            },
            false,
            'updateQuantity',
          );
        },

        clearCart: () => {
          set(
            (s) => ({
              bills: patchBill(s.bills, s.activeBillId, { items: [], vehicle: null, discount: 0 }),
            }),
            false,
            'clearCart',
          );
        },

        setVehicle: (vehicle) => {
          set(
            (s) => ({ bills: patchBill(s.bills, s.activeBillId, { vehicle }) }),
            false,
            'setVehicle',
          );
        },

        setDiscount: (amount) => {
          set(
            (s) => ({
              bills: patchBill(s.bills, s.activeBillId, { discount: Math.max(0, amount) }),
            }),
            false,
            'setDiscount',
          );
        },

        // ── Computed ──────────────────────────────────────────────────────

        getActiveBill: () => {
          const { bills, activeBillId } = get();
          return bills[activeBillId] ?? Object.values(bills)[0];
        },

        getSubtotal: () =>
          (get().getActiveBill()?.items ?? []).reduce(
            (sum, item) => sum + Number(item.product.sellingPrice) * item.quantity,
            0,
          ),

        getTotal: () => {
          const bill = get().getActiveBill();
          return Math.max(0, get().getSubtotal() - (bill?.discount ?? 0));
        },

        getItemCount: () =>
          (get().getActiveBill()?.items ?? []).reduce((sum, item) => sum + item.quantity, 0),
      }),
      {
        name: 'korat-pos-v1',
        partialize: (s) => ({ bills: s.bills, activeBillId: s.activeBillId }),
      },
    ),
    { name: 'pos-cart', enabled: import.meta.env.MODE !== 'test' },
  ),
);
