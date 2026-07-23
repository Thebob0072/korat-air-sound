import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';

/**
 * Generates a unique, human-readable order number.
 * Format: KAS-YYYYMMDD-XXXX  e.g. KAS-20240315-0001
 */
export async function generateOrderNumber(): Promise<string> {
  const now = new Date();
  const datePart = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('');

  const prefix = `KAS-${datePart}-`;

  const lastOrder = await prisma.order.findFirst({
    where: { orderNumber: { startsWith: prefix } },
    orderBy: { orderNumber: 'desc' },
  });

  const seq = lastOrder
    ? parseInt(lastOrder.orderNumber.slice(-4), 10) + 1
    : 1;

  return `${prefix}${String(seq).padStart(4, '0')}`;
}

/**
 * Processes payment for an order using a DB transaction:
 * 1. Pre-flight: verify every item has sufficient stock
 * 2. Deduct stock for each item
 * 3. Mark order status as Paid
 *
 * Throws AppError (422) if any product has insufficient stock.
 */
export async function processPayment(orderId: string) {
  return prisma.$transaction(async (tx) => {
    // 1. Load the order with its items and products
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { orderItems: { include: { product: true } } },
    });

    if (!order) throw new AppError(404, 'Order not found');
    if (order.status === 'Paid') throw new AppError(400, 'Order is already paid');
    if (order.status === 'Cancelled') throw new AppError(400, 'Cannot pay a cancelled order');
    if (order.orderItems.length === 0) throw new AppError(400, 'Order has no items');

    // 2. Pre-flight stock check — skip custom-label items (no product, no stock)
    for (const item of order.orderItems) {
      if (!item.productId) continue;
      const product = await tx.product.findUnique({ where: { id: item.productId } });
      if (!product) {
        throw new AppError(404, `Product not found: ${item.productId}`);
      }
      if (product.stockQuantity < item.quantity) {
        throw new AppError(
          422,
          `Insufficient stock for "${product.name}". ` +
            `Available: ${product.stockQuantity}, Required: ${item.quantity}`,
        );
      }
    }

    // 3. Deduct stock atomically — skip custom-label items
    for (const item of order.orderItems) {
      if (!item.productId) continue;
      await tx.product.update({
        where: { id: item.productId },
        data: { stockQuantity: { decrement: item.quantity } },
      });
    }

    // 4. Mark order as Paid
    return tx.order.update({
      where: { id: orderId },
      data: { status: 'Paid' },
      include: {
        vehicle: { include: { customer: true } },
        orderItems: { include: { product: true } },
      },
    });
  });
}
