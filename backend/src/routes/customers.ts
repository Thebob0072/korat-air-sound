import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';

const router = Router();

const CreateCustomerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().min(1, 'Phone is required'),
});

/** GET /api/customers — paginated list with optional search and order stats */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q        = String(req.query.q        ?? '').trim();
    const page     = Math.max(1, parseInt(String(req.query.page     ?? '1')));
    const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize ?? '20'))));

    const where = q ? {
      OR: [
        { phone: { contains: q } },
        { name:  { contains: q } },
      ],
    } : {};

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        include: {
          vehicles: {
            include: {
              orders: {
                where:  { status: 'Paid' },
                select: { id: true, orderNumber: true, totalAmount: true, createdAt: true, status: true },
                orderBy: { createdAt: 'desc' },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take:  pageSize,
      }),
      prisma.customer.count({ where }),
    ]);

    // Attach computed stats
    const data = customers.map((c) => {
      const allOrders = c.vehicles.flatMap((v) => v.orders);
      const totalRevenue = allOrders.reduce((s, o) => s + Number(o.totalAmount), 0);
      const dates = allOrders.map((o) => o.createdAt).sort((a, b) => +b - +a);
      return {
        ...c,
        totalRevenue,
        totalOrders: allOrders.length,
        vehicleCount: c.vehicles.length,
        lastVisit: dates[0] ?? null,
      };
    });

    res.json({ customers: data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
  } catch (err) {
    next(err);
  }
});

/** GET /api/customers/search?q=<phone_or_name> */
router.get('/search', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = String(req.query.q ?? '').trim();
    if (!q) {
      res.json([]);
      return;
    }
    const customers = await prisma.customer.findMany({
      where: {
        OR: [
          { phone: { contains: q } },
          { name: { contains: q } },
        ],
      },
      include: { vehicles: true },
      take: 10,
    });
    res.json(customers);
  } catch (err) {
    next(err);
  }
});

/** GET /api/customers/:id */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: req.params.id },
      include: {
        vehicles: {
          include: {
            orders: { orderBy: { createdAt: 'desc' }, take: 5 },
          },
        },
      },
    });
    if (!customer) throw new AppError(404, 'Customer not found');
    res.json(customer);
  } catch (err) {
    next(err);
  }
});

/** POST /api/customers */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = CreateCustomerSchema.parse(req.body);
    const existing = await prisma.customer.findUnique({ where: { phone: data.phone } });
    if (existing) throw new AppError(409, `Phone ${data.phone} is already registered`);
    const customer = await prisma.customer.create({ data });
    res.status(201).json(customer);
  } catch (err) {
    next(err);
  }
});

export default router;
