import { describe, it, expect, beforeEach } from 'vitest';
import { usePOSCartStore } from './POSCartStore';
import type { Product, Vehicle } from '@/types';
import { ProductCategory } from '@/types';

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'p1',
    sku: 'AC-001',
    name: 'น้ำยาแอร์ R134a',
    category: ProductCategory.AirCon,
    costPrice: 100,
    sellingPrice: 250,
    stockQuantity: 50,
    ...overrides,
  };
}

function makeVehicle(overrides: Partial<Vehicle> = {}): Vehicle {
  return {
    id: 'v1',
    licensePlate: 'กข 1234 นครราชสีมา',
    brand: 'Toyota',
    model: 'Fortuner',
    customerId: 'c1',
    ...overrides,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const resetStore = () =>
  usePOSCartStore.setState({ items: [], vehicle: null, discount: 0 });

// ── Test Suite ────────────────────────────────────────────────────────────────

describe('POSCartStore', () => {
  beforeEach(resetStore);

  // ── addItem ───────────────────────────────────────────────────────────────

  describe('addItem', () => {
    it('adds a new product to an empty cart with qty 1 by default', () => {
      usePOSCartStore.getState().addItem(makeProduct());

      const { items } = usePOSCartStore.getState();
      expect(items).toHaveLength(1);
      expect(items[0].product.id).toBe('p1');
      expect(items[0].quantity).toBe(1);
    });

    it('adds a product with a specified quantity', () => {
      usePOSCartStore.getState().addItem(makeProduct(), 3);

      expect(usePOSCartStore.getState().items[0].quantity).toBe(3);
    });

    it('increments quantity when the same product is added again', () => {
      const { addItem } = usePOSCartStore.getState();
      addItem(makeProduct());
      addItem(makeProduct(), 2);

      const { items } = usePOSCartStore.getState();
      expect(items).toHaveLength(1);
      expect(items[0].quantity).toBe(3);
    });

    it('adds two different products as separate line items', () => {
      const { addItem } = usePOSCartStore.getState();
      addItem(makeProduct({ id: 'p1' }));
      addItem(makeProduct({ id: 'p2', sku: 'GL-001' }));

      expect(usePOSCartStore.getState().items).toHaveLength(2);
    });

    it('is a no-op when quantity is 0', () => {
      usePOSCartStore.getState().addItem(makeProduct(), 0);
      expect(usePOSCartStore.getState().items).toHaveLength(0);
    });

    it('is a no-op when quantity is negative', () => {
      usePOSCartStore.getState().addItem(makeProduct(), -5);
      expect(usePOSCartStore.getState().items).toHaveLength(0);
    });
  });

  // ── removeItem ────────────────────────────────────────────────────────────

  describe('removeItem', () => {
    it('removes the correct product from the cart', () => {
      const { addItem, removeItem } = usePOSCartStore.getState();
      addItem(makeProduct({ id: 'p1' }));
      addItem(makeProduct({ id: 'p2' }));

      removeItem('p1');

      const { items } = usePOSCartStore.getState();
      expect(items).toHaveLength(1);
      expect(items[0].product.id).toBe('p2');
    });

    it('is a no-op when the product is not in the cart', () => {
      usePOSCartStore.getState().addItem(makeProduct());
      usePOSCartStore.getState().removeItem('does-not-exist');

      expect(usePOSCartStore.getState().items).toHaveLength(1);
    });
  });

  // ── updateQuantity ────────────────────────────────────────────────────────

  describe('updateQuantity', () => {
    it('updates the quantity of an existing line item', () => {
      usePOSCartStore.getState().addItem(makeProduct());
      usePOSCartStore.getState().updateQuantity('p1', 7);

      expect(usePOSCartStore.getState().items[0].quantity).toBe(7);
    });

    it('removes the item when quantity is set to 0', () => {
      usePOSCartStore.getState().addItem(makeProduct());
      usePOSCartStore.getState().updateQuantity('p1', 0);

      expect(usePOSCartStore.getState().items).toHaveLength(0);
    });

    it('removes the item when quantity is negative', () => {
      usePOSCartStore.getState().addItem(makeProduct());
      usePOSCartStore.getState().updateQuantity('p1', -3);

      expect(usePOSCartStore.getState().items).toHaveLength(0);
    });
  });

  // ── clearCart ─────────────────────────────────────────────────────────────

  describe('clearCart', () => {
    it('resets items, vehicle, and discount to initial state', () => {
      const { addItem, setVehicle, setDiscount, clearCart } = usePOSCartStore.getState();
      addItem(makeProduct());
      setVehicle(makeVehicle());
      setDiscount(500);

      clearCart();

      const state = usePOSCartStore.getState();
      expect(state.items).toHaveLength(0);
      expect(state.vehicle).toBeNull();
      expect(state.discount).toBe(0);
    });
  });

  // ── setDiscount ───────────────────────────────────────────────────────────

  describe('setDiscount', () => {
    it('sets a positive discount', () => {
      usePOSCartStore.getState().setDiscount(200);
      expect(usePOSCartStore.getState().discount).toBe(200);
    });

    it('clamps negative values to 0', () => {
      usePOSCartStore.getState().setDiscount(-100);
      expect(usePOSCartStore.getState().discount).toBe(0);
    });

    it('allows a discount of 0', () => {
      usePOSCartStore.getState().setDiscount(0);
      expect(usePOSCartStore.getState().discount).toBe(0);
    });
  });

  // ── getSubtotal ───────────────────────────────────────────────────────────

  describe('getSubtotal', () => {
    it('returns 0 for an empty cart', () => {
      expect(usePOSCartStore.getState().getSubtotal()).toBe(0);
    });

    it('computes subtotal for a single item correctly', () => {
      usePOSCartStore.getState().addItem(makeProduct({ sellingPrice: 250 }), 3);
      expect(usePOSCartStore.getState().getSubtotal()).toBe(750);
    });

    it('sums multiple distinct products', () => {
      const { addItem } = usePOSCartStore.getState();
      addItem(makeProduct({ id: 'p1', sellingPrice: 200 }), 2);  // 400
      addItem(makeProduct({ id: 'p2', sellingPrice: 1500 }), 1); // 1500
      expect(usePOSCartStore.getState().getSubtotal()).toBe(1900);
    });

    it('handles Prisma Decimal values serialised as strings', () => {
      // Prisma returns Decimal as string over JSON — Number() must coerce correctly
      const product = makeProduct({ sellingPrice: '350' as unknown as number });
      usePOSCartStore.getState().addItem(product, 2);
      expect(usePOSCartStore.getState().getSubtotal()).toBe(700);
    });

    it('handles very large quantities without floating-point drift', () => {
      usePOSCartStore.getState().addItem(makeProduct({ sellingPrice: 0.1 }), 10);
      // Rounding check: 0.1 * 10 === 1 (exact in IEEE 754)
      expect(usePOSCartStore.getState().getSubtotal()).toBeCloseTo(1, 10);
    });
  });

  // ── getTotal ──────────────────────────────────────────────────────────────

  describe('getTotal', () => {
    it('equals subtotal when discount is 0', () => {
      usePOSCartStore.getState().addItem(makeProduct({ sellingPrice: 500 }), 2);
      expect(usePOSCartStore.getState().getTotal()).toBe(1000);
    });

    it('deducts discount from the subtotal', () => {
      usePOSCartStore.getState().addItem(makeProduct({ sellingPrice: 1000 }));
      usePOSCartStore.getState().setDiscount(300);
      expect(usePOSCartStore.getState().getTotal()).toBe(700);
    });

    it('is clamped to 0 when discount exceeds subtotal', () => {
      usePOSCartStore.getState().addItem(makeProduct({ sellingPrice: 100 }));
      usePOSCartStore.getState().setDiscount(9999);
      expect(usePOSCartStore.getState().getTotal()).toBe(0);
    });

    it('returns 0 for an empty cart regardless of discount', () => {
      usePOSCartStore.getState().setDiscount(500);
      expect(usePOSCartStore.getState().getTotal()).toBe(0);
    });
  });

  // ── getItemCount ──────────────────────────────────────────────────────────

  describe('getItemCount', () => {
    it('returns 0 for an empty cart', () => {
      expect(usePOSCartStore.getState().getItemCount()).toBe(0);
    });

    it('returns the sum of all line item quantities', () => {
      const { addItem } = usePOSCartStore.getState();
      addItem(makeProduct({ id: 'p1' }), 3);
      addItem(makeProduct({ id: 'p2' }), 2);
      expect(usePOSCartStore.getState().getItemCount()).toBe(5);
    });
  });

  // ── Stock deduction payload ───────────────────────────────────────────────

  describe('stock deduction payload shape', () => {
    it('produces the correct payload for each line item', () => {
      const product = makeProduct({ id: 'p1', sku: 'AC-001', sellingPrice: 350 });
      usePOSCartStore.getState().addItem(product, 4);

      const { items } = usePOSCartStore.getState();
      const payload = items.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
        unitPrice: Number(item.product.sellingPrice),
        subtotalPrice: Number(item.product.sellingPrice) * item.quantity,
      }));

      expect(payload).toEqual([
        { productId: 'p1', quantity: 4, unitPrice: 350, subtotalPrice: 1400 },
      ]);
    });
  });
});
