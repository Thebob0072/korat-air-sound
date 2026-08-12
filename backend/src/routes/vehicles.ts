import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';

const router = Router();

const CreateVehicleSchema = z.object({
  licensePlate: z.string().min(1, 'License plate is required'),
  brand: z.string().optional(),
  model: z.string().optional(),
  customerId: z.string().uuid().optional(),
});

/** GET /api/vehicles/search?q=<license_plate_or_phone> */
router.get('/search', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = String(req.query.q ?? '').trim();
    if (!q) {
      res.json([]);
      return;
    }
    const vehicles = await prisma.vehicle.findMany({
      where: {
        OR: [
          { licensePlate: { contains: q } },
          { customer: { phone: { contains: q } } },
        ],
      },
      include: { customer: true },
      take: 10,
    });
    res.json(vehicles);
  } catch (err) {
    next(err);
  }
});

/** GET /api/vehicles/:id — includes full order history */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: req.params.id },
      include: {
        customer: true,
        orders: {
          orderBy: { createdAt: 'desc' },
          include: { orderItems: { include: { product: true } } },
        },
      },
    });
    if (!vehicle) throw new AppError(404, 'Vehicle not found');
    res.json(vehicle);
  } catch (err) {
    next(err);
  }
});

/** POST /api/vehicles */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = CreateVehicleSchema.parse(req.body);
    const existing = await prisma.vehicle.findUnique({
      where: { licensePlate: data.licensePlate },
    });
    if (existing) {
      throw new AppError(409, `License plate "${data.licensePlate}" is already registered`);
    }
    const vehicle = await prisma.vehicle.create({
      data,
      include: { customer: true },
    });
    res.status(201).json(vehicle);
  } catch (err) {
    next(err);
  }
});

/** PATCH /api/vehicles/:id/link — เชื่อมรถ (anonymous) เข้ากับลูกค้า */
router.patch('/:id/link', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { customerId } = z.object({ customerId: z.string().uuid() }).parse(req.body);
    const vehicle = await prisma.vehicle.update({
      where: { id: req.params.id },
      data: { customerId },
      include: { customer: true },
    });
    res.json(vehicle);
  } catch (err) {
    next(err);
  }
});

export default router;
