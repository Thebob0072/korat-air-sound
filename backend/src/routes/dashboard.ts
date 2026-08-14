import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

function startOfDay(d: Date) { const r = new Date(d); r.setHours(0, 0, 0, 0); return r; }
function endOfDay(d: Date)   { const r = new Date(d); r.setHours(23, 59, 59, 999); return r; }
function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function startOfYear(d: Date)  { return new Date(d.getFullYear(), 0, 1); }

const VEHICLE_CUSTOMER = {
  vehicle: { include: { customer: true } },
} as const;

/**
 * GET /api/dashboard
 * Single endpoint for the overview dashboard — all data in one round-trip.
 */
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const now = new Date();

    const [
      todayAgg,
      monthAgg,
      yearAgg,
      activeOrders,
      invoicePending,
      recentPaid,
      newCustomersMonth,
    ] = await Promise.all([
      // Revenue today
      prisma.order.aggregate({
        where: { status: 'Paid', createdAt: { gte: startOfDay(now), lte: endOfDay(now) } },
        _sum: { totalAmount: true }, _count: true,
      }),
      // Revenue this month
      prisma.order.aggregate({
        where: { status: 'Paid', createdAt: { gte: startOfMonth(now) } },
        _sum: { totalAmount: true }, _count: true,
      }),
      // Revenue this year
      prisma.order.aggregate({
        where: { status: 'Paid', createdAt: { gte: startOfYear(now) } },
        _sum: { totalAmount: true }, _count: true,
      }),
      // Active orders (InProgress | WaitingForParts | Ready) — latest 15
      prisma.order.findMany({
        where: { status: { in: ['InProgress', 'WaitingForParts', 'Ready'] } },
        include: VEHICLE_CUSTOMER,
        orderBy: { updatedAt: 'desc' },
        take: 15,
      }),
      // Credit outstanding
      prisma.order.findMany({
        where: { status: 'InvoicePending' },
        include: VEHICLE_CUSTOMER,
        orderBy: { dueDate: 'asc' },
      }),
      // Last 10 paid orders
      prisma.order.findMany({
        where: { status: 'Paid' },
        include: VEHICLE_CUSTOMER,
        orderBy: { updatedAt: 'desc' },
        take: 10,
      }),
      // New customers this month
      prisma.customer.count({
        where: { createdAt: { gte: startOfMonth(now) } },
      }),
    ]);

    const creditTotal = invoicePending.reduce((s, o) => s + Number(o.totalAmount), 0);
    const overdueCount = invoicePending.filter(
      (o) => o.dueDate && o.dueDate < now,
    ).length;

    res.json({
      revenue: {
        today:     { amount: Number(todayAgg._sum.totalAmount ?? 0), orders: todayAgg._count },
        thisMonth: { amount: Number(monthAgg._sum.totalAmount ?? 0), orders: monthAgg._count },
        thisYear:  { amount: Number(yearAgg._sum.totalAmount  ?? 0), orders: yearAgg._count  },
      },
      active: {
        orders: activeOrders,
        count: activeOrders.length,
      },
      credit: {
        orders: invoicePending,
        total: creditTotal,
        overdueCount,
      },
      recentPaid,
      newCustomersMonth,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
