import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { OrderStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { generateOrderNumber, processPayment } from '../services/orderService';

const router = Router();

const AddItemSchema = z.object({
  productId: z.string().uuid().optional(),
  customLabel: z.string().max(300).trim().optional(),
  technicianName: z.string().max(300).trim().optional(),
  quantity: z.number().int().positive(),
  unitPrice: z.number().nonnegative(),
}).refine((d) => d.productId || d.customLabel, {
  message: 'Either productId or customLabel is required',
});

const VEHICLE_CUSTOMER_INCLUDE = {
  vehicle: { include: { customer: true } },
  orderItems: { include: { product: true } },
} as const;

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

/** POST /api/orders — create a new Draft order for a vehicle */
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

/** PATCH /api/orders/:id/status — set Draft→Quoted or Draft/Quoted→Cancelled */
router.patch('/:id/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = z
      .object({ status: z.enum(['Draft', 'Quoted', 'Cancelled']) })
      .parse(req.body);

    const existing = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError(404, 'Order not found');
    if (existing.status === 'Paid' || existing.status === 'Cancelled') {
      throw new AppError(400, `Cannot change status of a ${existing.status} order`);
    }

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

/** POST /api/orders/:id/items — add a product line to the order */
router.post('/:id/items', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orderId = req.params.id;
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new AppError(404, 'Order not found');
    if (order.status === 'Paid' || order.status === 'Cancelled') {
      throw new AppError(400, 'Cannot modify a Paid or Cancelled order');
    }

    const { productId, customLabel, technicianName, quantity, unitPrice } = AddItemSchema.parse(req.body);
    const subtotalPrice = quantity * unitPrice;

    const item = await prisma.$transaction(async (tx) => {
      const newItem = await tx.orderItem.create({
        data: { orderId, productId, customLabel, technicianName, quantity, unitPrice, subtotalPrice },
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
    if (order.status === 'Paid' || order.status === 'Cancelled') {
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

/** DELETE /api/orders/:id — delete a Draft order (irreversible) */
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const order = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!order) throw new AppError(404, 'Order not found');
    if (order.status !== 'Draft') {
      throw new AppError(400, `Only Draft orders can be deleted`);
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
