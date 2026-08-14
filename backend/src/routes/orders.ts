import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { OrderStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import {
  generateOrderNumber,
  processPayment,
  markInProgress,
  submitOrder,
} from '../services/orderService';

const router = Router();

// ── Schemas ───────────────────────────────────────────────────────────────────

const AddItemSchema = z
  .object({
    productId: z.string().uuid().optional(),
    customLabel: z.string().max(300).trim().optional(),
    technicianName: z.string().max(300).trim().optional(),
    quantity: z.number().positive(), // decimal OK: film 15.5 m², hose 3.25 m
    unitPrice: z.number().nonnegative(),
  })
  .refine((d) => d.productId || d.customLabel, {
    message: 'Either productId or customLabel is required',
  });

const SubmitOrderSchema = z.object({
  vehicleId: z.string().uuid(),
  discount: z.number().nonnegative().default(0),
  credit: z.boolean().optional(),
  items: z
    .array(
      z
        .object({
          productId: z.string().uuid().optional(),
          customLabel: z.string().max(300).trim().optional(),
          quantity: z.number().positive(),
          unitPrice: z.number().nonnegative().optional(), // only for custom-label items
          technicianId: z.string().uuid().nullable().optional(),
          technicianName: z.string().max(200).trim().nullable().optional(),
          metadata: z.record(z.unknown()).nullable().optional(),
        })
        .refine((d) => d.productId || d.customLabel, {
          message: 'Each item needs productId or customLabel',
        }),
    )
    .min(1, 'Order must have at least one item'),
});

const VEHICLE_CUSTOMER_INCLUDE = {
  vehicle: { include: { customer: true } },
  orderItems: { include: { product: true } },
} as const;

// ── Immutable terminal statuses ────────────────────────────────────────────────

const TERMINAL_STATUSES: OrderStatus[] = ['Paid', 'Cancelled'];

// ── Routes ────────────────────────────────────────────────────────────────────

/** GET /api/orders?status=Paid */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.query;
    const orders = await prisma.order.findMany({
      where: status ? { status: status as OrderStatus } : {},
      include: VEHICLE_CUSTOMER_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    res.json(orders);
  } catch (err) {
    next(err);
  }
});

/** GET /api/orders/:id */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: VEHICLE_CUSTOMER_INCLUDE,
    });
    if (!order) throw new AppError(404, 'Order not found');
    res.json(order);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/orders/submit — atomic POS bill submission
 *
 * Accepts the full bill from the POS terminal, re-fetches all product prices
 * from the DB (ignores any prices sent by the client), and creates the Order
 * plus all OrderItems in a single Prisma $transaction.
 * Creates the order with status = Quoted.
 */
router.post('/submit', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dto = SubmitOrderSchema.parse(req.body);
    const order = await submitOrder(dto);
    res.status(201).json(order);
  } catch (err) {
    next(err);
  }
});

/** POST /api/orders — create a new Draft order shell (used by edit flow, not POS) */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { vehicleId } = z.object({ vehicleId: z.string().uuid() }).parse(req.body);
    const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) throw new AppError(404, 'Vehicle not found');

    const orderNumber = await generateOrderNumber();
    const order = await prisma.order.create({
      data: { vehicleId, orderNumber },
      include: VEHICLE_CUSTOMER_INCLUDE,
    });
    res.status(201).json(order);
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/orders/:id/status — workflow status transitions
 *
 * Allowed transitions:
 *   Draft → Quoted | Cancelled
 *   Quoted → InProgress (deducts stock) | WaitingForParts | Cancelled
 *   InProgress → WaitingForParts | Ready | Cancelled
 *   WaitingForParts → InProgress | Ready | Cancelled
 *   Ready → Paid (use /pay) | Cancelled
 *   Paid, Cancelled → (blocked)
 *
 * Use POST /orders/:id/pay for the Paid transition (handles PromptPay + stock).
 */
router.patch('/:id/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = z
      .object({
        status: z.enum([
          'Draft',
          'Quoted',
          'InProgress',
          'WaitingForParts',
          'Ready',
          'InvoicePending',
          'Cancelled',
        ]),
      })
      .parse(req.body);

    const existing = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError(404, 'Order not found');
    if (TERMINAL_STATUSES.includes(existing.status)) {
      throw new AppError(400, `Cannot change status of a ${existing.status} order`);
    }

    // Quoted → InProgress triggers stock deduction
    if (status === 'InProgress' && existing.status === 'Quoted') {
      const order = await markInProgress(req.params.id);
      return res.json(order);
    }

    // All other transitions: simple status update
    const order = await prisma.order.update({
      where: { id: req.params.id },
      data: { status },
      include: VEHICLE_CUSTOMER_INCLUDE,
    });
    res.json(order);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/orders/:id/items — add a line item to an existing order
 * Re-fetches product price from DB; ignores unitPrice for real products.
 */
router.post('/:id/items', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orderId = req.params.id;
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new AppError(404, 'Order not found');
    if (TERMINAL_STATUSES.includes(order.status)) {
      throw new AppError(400, 'Cannot modify a Paid or Cancelled order');
    }

    const parsed = AddItemSchema.parse(req.body);

    // Re-fetch real price from DB; trust unitPrice only for custom-label items
    let unitPrice = parsed.unitPrice;
    if (parsed.productId) {
      const product = await prisma.product.findUnique({ where: { id: parsed.productId } });
      if (!product) throw new AppError(404, `Product not found: ${parsed.productId}`);
      unitPrice = Number(product.sellingPrice);
    }

    const subtotalPrice = parsed.quantity * unitPrice;

    const item = await prisma.$transaction(async (tx) => {
      const newItem = await tx.orderItem.create({
        data: {
          orderId,
          productId: parsed.productId,
          customLabel: parsed.customLabel,
          technicianName: parsed.technicianName,
          quantity: parsed.quantity,
          unitPrice,
          subtotalPrice,
        },
        include: { product: true },
      });
      const allItems = await tx.orderItem.findMany({ where: { orderId } });
      const totalAmount = allItems.reduce((sum, i) => sum + Number(i.subtotalPrice), 0);
      await tx.order.update({ where: { id: orderId }, data: { totalAmount } });
      return newItem;
    });

    res.status(201).json(item);
  } catch (err) {
    next(err);
  }
});

/** DELETE /api/orders/:id/items/:itemId — remove a line item */
router.delete('/:id/items/:itemId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id: orderId, itemId } = req.params;
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new AppError(404, 'Order not found');
    if (TERMINAL_STATUSES.includes(order.status)) {
      throw new AppError(400, 'Cannot modify a Paid or Cancelled order');
    }

    await prisma.$transaction(async (tx) => {
      await tx.orderItem.delete({ where: { id: itemId } });
      const remaining = await tx.orderItem.findMany({ where: { orderId } });
      const totalAmount = remaining.reduce((sum, i) => sum + Number(i.subtotalPrice), 0);
      await tx.order.update({ where: { id: orderId }, data: { totalAmount } });
    });

    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

/** DELETE /api/orders/:id — delete a Draft order */
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const order = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!order) throw new AppError(404, 'Order not found');
    if (order.status !== 'Draft') {
      throw new AppError(400, 'Only Draft orders can be deleted');
    }
    await prisma.order.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

/** POST /api/orders/:id/pay — mark Paid + atomic stock deduction */
router.post('/:id/pay', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const order = await processPayment(req.params.id);
    res.json(order);
  } catch (err) {
    next(err);
  }
});

export default router;
