import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';

// ── Types ─────────────────────────────────────────────────────────────────────

/** Prisma transaction client — available inside $transaction callbacks */
type TxClient = Omit<
  typeof prisma,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

export interface SubmitOrderItem {
  productId?: string;    // UUID of a real DB product
  customLabel?: string;  // Free-text name for OtherItem / manual entries
  quantity: number;      // Decimal OK (e.g. 15.5 m² of film)
  unitPrice?: number;    // Required only when customLabel is set (no DB product to re-fetch)
  technicianId?: string | null;
  technicianName?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface SubmitOrderDto {
  vehicleId: string;
  items: SubmitOrderItem[];
  discount?: number;
  credit?: boolean; // วางบิล 30 วัน — sets InvoicePending + dueDate
}

// ── generateOrderNumber ───────────────────────────────────────────────────────

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

  const seq = lastOrder ? parseInt(lastOrder.orderNumber.slice(-4), 10) + 1 : 1;
  return `${prefix}${String(seq).padStart(4, '0')}`;
}

// ── Stock deduction helper ────────────────────────────────────────────────────

/**
 * Pre-flight check then stock deduction for all real (non-service) items.
 * Throws AppError 422 if any item is undersupplied before touching anything.
 */
async function deductStock(orderId: string, tx: TxClient): Promise<void> {
  const order = await tx.order.findUnique({
    where: { id: orderId },
    include: { orderItems: { include: { product: true } } },
  });
  if (!order) throw new AppError(404, 'Order not found');

  // Pre-flight — all-or-nothing check before touching any row
  for (const item of order.orderItems) {
    if (!item.productId || !item.product || item.product.isService) continue;
    if (Number(item.product.stockQuantity) < Number(item.quantity)) {
      throw new AppError(
        422,
        `สต็อก "${item.product.name}" ไม่เพียงพอ ` +
          `(มี ${item.product.stockQuantity}, ต้องการ ${item.quantity})`,
      );
    }
  }

  // Deduct atomically inside the same transaction
  for (const item of order.orderItems) {
    if (!item.productId || !item.product || item.product.isService) continue;
    await tx.product.update({
      where: { id: item.productId },
      data: { stockQuantity: { decrement: item.quantity } },
    });
  }
}

// ── submitOrder ───────────────────────────────────────────────────────────────

/**
 * Atomic bill submission from the POS terminal.
 * - Re-fetches every product price from DB (never trusts frontend price)
 * - Computes warrantyEndDate from product.warrantyMonths
 * - Creates Order + all OrderItems in one $transaction (Quoted status)
 */
export async function submitOrder(dto: SubmitOrderDto) {
  if (dto.items.length === 0) throw new AppError(400, 'Order must have at least one item');

  // Generate order number before the transaction so its own query doesn't hold the lock longer
  const orderNumber = await generateOrderNumber();

  return prisma.$transaction(async (tx) => {
    const vehicle = await tx.vehicle.findUnique({ where: { id: dto.vehicleId } });
    if (!vehicle) throw new AppError(404, 'Vehicle not found');

    let subtotal = 0;
    const itemsData: Prisma.OrderItemCreateWithoutOrderInput[] = [];

    for (const item of dto.items) {
      let unitPrice: number;
      let warrantyMonths: number | null = null;
      let warrantyEndDate: Date | null = null;

      if (item.productId) {
        // Trust No One — always re-fetch price from DB
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product) throw new AppError(404, `ไม่พบสินค้า ID: ${item.productId}`);
        unitPrice = Number(product.sellingPrice);

        if (product.warrantyMonths) {
          warrantyMonths = product.warrantyMonths;
          warrantyEndDate = new Date();
          warrantyEndDate.setMonth(warrantyEndDate.getMonth() + product.warrantyMonths);
        }
      } else {
        // OtherItem / custom-label: no DB product, trust the manually entered price
        if (item.unitPrice == null) {
          throw new AppError(400, `unitPrice required for custom item "${item.customLabel}"`);
        }
        unitPrice = Number(item.unitPrice);
      }

      const qty = Number(item.quantity);
      const subtotalPrice = unitPrice * qty;
      subtotal += subtotalPrice;

      itemsData.push({
        product: item.productId ? { connect: { id: item.productId } } : undefined,
        customLabel: item.customLabel ?? undefined,
        technicianName: item.technicianName ?? undefined,
        quantity: qty,
        unitPrice,
        subtotalPrice,
        metadata: (item.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
        warrantyMonths,
        warrantyEndDate,
      });
    }

    const totalAmount = Math.max(0, subtotal - (dto.discount ?? 0));

    let dueDate: Date | undefined;
    if (dto.credit) {
      dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);
    }

    return tx.order.create({
      data: {
        vehicleId: dto.vehicleId,
        orderNumber,
        totalAmount,
        status: dto.credit ? 'InvoicePending' : 'Quoted',
        dueDate,
        orderItems: { create: itemsData },
      },
      include: {
        vehicle: { include: { customer: true } },
        orderItems: { include: { product: true } },
      },
    });
  });
}

// ── markInProgress ────────────────────────────────────────────────────────────

/**
 * Quoted → InProgress: deducts stock atomically.
 * This is the "ช่างเบิกของเริ่มงาน" action.
 * Stock will NOT be deducted again when the order is later marked Paid.
 */
export async function markInProgress(orderId: string) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (!order) throw new AppError(404, 'Order not found');
    if (order.status !== 'Quoted') {
      throw new AppError(400, `เปลี่ยนเป็น InProgress ได้เฉพาะจาก Quoted (ปัจจุบัน: ${order.status})`);
    }

    await deductStock(orderId, tx);

    return tx.order.update({
      where: { id: orderId },
      data: { status: 'InProgress' },
      include: {
        vehicle: { include: { customer: true } },
        orderItems: { include: { product: true } },
      },
    });
  });
}

// ── processPayment ────────────────────────────────────────────────────────────

/**
 * → Paid: deducts stock (unless already deducted at InProgress), marks Paid.
 */
export async function processPayment(orderId: string) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (!order) throw new AppError(404, 'Order not found');
    if (order.status === 'Paid') throw new AppError(400, 'Order is already paid');
    if (order.status === 'Cancelled') throw new AppError(400, 'Cannot pay a cancelled order');
    if (order.status === 'Draft') throw new AppError(400, 'Confirm the order (Quoted) before paying');

    // Skip stock deduction if InProgress already deducted it
    if (order.status !== 'InProgress') {
      await deductStock(orderId, tx);
    }

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
