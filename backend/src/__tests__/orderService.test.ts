import { vi, describe, it, expect, beforeEach } from 'vitest';

// vi.hoisted runs before vi.mock factories, so values are available in closures
const { mockTx, mockPrisma } = vi.hoisted(() => {
  const mockTx = {
    order: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    product: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  };
  return {
    mockTx,
    mockPrisma: {
      $transaction: vi.fn((fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx)),
      order: { findFirst: vi.fn() },
    },
  };
});

vi.mock('../lib/prisma', () => ({ prisma: mockPrisma }));

import { processPayment, generateOrderNumber } from '../services/orderService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeOrder(overrides: object = {}) {
  return {
    id: 'order-1',
    status: 'Draft',
    orderItems: [],
    ...overrides,
  };
}

function makeProductItem(overrides: object = {}) {
  return {
    id: 'item-1',
    productId: 'prod-1',
    customLabel: null,
    quantity: 2,
    product: { id: 'prod-1', name: 'แอร์ Daikin', stockQuantity: 5 },
    ...overrides,
  };
}

function makeCustomItem(overrides: object = {}) {
  return {
    id: 'item-2',
    productId: null,
    customLabel: 'ค่าแรงติดตั้ง',
    quantity: 1,
    product: null,
    ...overrides,
  };
}

// ─── processPayment ───────────────────────────────────────────────────────────

describe('processPayment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.$transaction.mockImplementation(
      (fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx),
    );
  });

  it('throws 404 when order does not exist', async () => {
    mockTx.order.findUnique.mockResolvedValue(null);
    await expect(processPayment('nonexistent')).rejects.toMatchObject({ statusCode: 404 });
  });

  it('throws 400 when order is already Paid', async () => {
    mockTx.order.findUnique.mockResolvedValue(makeOrder({ status: 'Paid' }));
    await expect(processPayment('order-1')).rejects.toMatchObject({ statusCode: 400 });
  });

  it('throws 400 when order is Cancelled', async () => {
    mockTx.order.findUnique.mockResolvedValue(makeOrder({ status: 'Cancelled' }));
    await expect(processPayment('order-1')).rejects.toMatchObject({ statusCode: 400 });
  });

  it('throws 400 when order has no items', async () => {
    mockTx.order.findUnique.mockResolvedValue(makeOrder({ orderItems: [] }));
    await expect(processPayment('order-1')).rejects.toMatchObject({ statusCode: 400 });
  });

  it('throws 422 when product has insufficient stock', async () => {
    mockTx.order.findUnique.mockResolvedValue(
      makeOrder({ orderItems: [makeProductItem({ quantity: 10 })] }),
    );
    mockTx.product.findUnique.mockResolvedValue({ id: 'prod-1', name: 'แอร์ Daikin', stockQuantity: 5 });

    await expect(processPayment('order-1')).rejects.toMatchObject({ statusCode: 422 });
  });

  it('deducts stock and marks order Paid on success', async () => {
    mockTx.order.findUnique.mockResolvedValue(
      makeOrder({ orderItems: [makeProductItem({ quantity: 2 })] }),
    );
    mockTx.product.findUnique.mockResolvedValue({ id: 'prod-1', name: 'แอร์ Daikin', stockQuantity: 5 });
    mockTx.product.update.mockResolvedValue({});
    mockTx.order.update.mockResolvedValue({ ...makeOrder({ status: 'Paid' }), vehicle: {}, orderItems: [] });

    const result = await processPayment('order-1') as { status: string };

    expect(result.status).toBe('Paid');
    expect(mockTx.product.update).toHaveBeenCalledOnce();
    expect(mockTx.product.update).toHaveBeenCalledWith({
      where: { id: 'prod-1' },
      data: { stockQuantity: { decrement: 2 } },
    });
  });

  // This is the critical regression test for the bug where null productId caused a crash
  it('does NOT crash and skips stock check for custom-label items', async () => {
    mockTx.order.findUnique.mockResolvedValue(
      makeOrder({ orderItems: [makeCustomItem()] }),
    );
    mockTx.order.update.mockResolvedValue({ ...makeOrder({ status: 'Paid' }), vehicle: {}, orderItems: [] });

    const result = await processPayment('order-1') as { status: string };

    expect(result.status).toBe('Paid');
    expect(mockTx.product.findUnique).not.toHaveBeenCalled();
    expect(mockTx.product.update).not.toHaveBeenCalled();
  });

  it('handles mixed product + custom-label items: deducts only product stock', async () => {
    mockTx.order.findUnique.mockResolvedValue(
      makeOrder({
        orderItems: [
          makeProductItem({ quantity: 3 }),
          makeCustomItem(),
        ],
      }),
    );
    mockTx.product.findUnique.mockResolvedValue({ id: 'prod-1', name: 'แอร์ Daikin', stockQuantity: 10 });
    mockTx.product.update.mockResolvedValue({});
    mockTx.order.update.mockResolvedValue({ ...makeOrder({ status: 'Paid' }), vehicle: {}, orderItems: [] });

    const result = await processPayment('order-1') as { status: string };

    expect(result.status).toBe('Paid');
    // stock deducted only for the product item, not the custom one
    expect(mockTx.product.update).toHaveBeenCalledOnce();
    expect(mockTx.product.update).toHaveBeenCalledWith({
      where: { id: 'prod-1' },
      data: { stockQuantity: { decrement: 3 } },
    });
  });

  it('throws 404 when a product linked to an item no longer exists', async () => {
    mockTx.order.findUnique.mockResolvedValue(
      makeOrder({ orderItems: [makeProductItem()] }),
    );
    mockTx.product.findUnique.mockResolvedValue(null); // product was deleted

    await expect(processPayment('order-1')).rejects.toMatchObject({ statusCode: 404 });
    expect(mockTx.product.update).not.toHaveBeenCalled();
  });

  it('does not deduct stock when preflight fails (atomicity)', async () => {
    // Two items: first ok, second insufficient — neither should be deducted
    mockTx.order.findUnique.mockResolvedValue(
      makeOrder({
        orderItems: [
          makeProductItem({ id: 'item-1', productId: 'prod-1', quantity: 1 }),
          makeProductItem({ id: 'item-2', productId: 'prod-2', quantity: 99 }),
        ],
      }),
    );
    mockTx.product.findUnique
      .mockResolvedValueOnce({ id: 'prod-1', name: 'แอร์', stockQuantity: 10 }) // ok
      .mockResolvedValueOnce({ id: 'prod-2', name: 'ฟิล์ม', stockQuantity: 5 }); // 99 > 5

    await expect(processPayment('order-1')).rejects.toMatchObject({ statusCode: 422 });
    expect(mockTx.product.update).not.toHaveBeenCalled();
  });
});

// ─── generateOrderNumber ──────────────────────────────────────────────────────

describe('generateOrderNumber', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function todayDatePart() {
    const d = new Date();
    return [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, '0'),
      String(d.getDate()).padStart(2, '0'),
    ].join('');
  }

  it('starts at 0001 when no orders exist today', async () => {
    mockPrisma.order.findFirst.mockResolvedValue(null);
    const num = await generateOrderNumber();
    expect(num).toBe(`KAS-${todayDatePart()}-0001`);
  });

  it('increments from the last order of the day', async () => {
    const dp = todayDatePart();
    mockPrisma.order.findFirst.mockResolvedValue({ orderNumber: `KAS-${dp}-0007` });
    const num = await generateOrderNumber();
    expect(num).toBe(`KAS-${dp}-0008`);
  });

  it('produces a zero-padded 4-digit sequence', async () => {
    const dp = todayDatePart();
    mockPrisma.order.findFirst.mockResolvedValue({ orderNumber: `KAS-${dp}-0099` });
    const num = await generateOrderNumber();
    expect(num).toMatch(/^KAS-\d{8}-0100$/);
  });

  it('matches the expected format KAS-YYYYMMDD-XXXX', async () => {
    mockPrisma.order.findFirst.mockResolvedValue(null);
    const num = await generateOrderNumber();
    expect(num).toMatch(/^KAS-\d{8}-\d{4}$/);
  });
});
