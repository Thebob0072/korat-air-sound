import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

// ── Date helpers (no external deps) ──────────────────────────────────────────

function startOfDay(d: Date) { const r = new Date(d); r.setHours(0, 0, 0, 0); return r; }
function endOfDay(d: Date) { const r = new Date(d); r.setHours(23, 59, 59, 999); return r; }
function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function startOfYear(d: Date) { return new Date(d.getFullYear(), 0, 1); }
function subDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() - n); return r; }
function subMonths(d: Date, n: number) { const r = new Date(d); r.setMonth(r.getMonth() - n); return r; }
function fmtDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function fmtMonth(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * GET /api/reports/summary?days=30&months=12
 *
 * Returns:
 *  - today / thisMonth / thisYear / allTime  summary cards
 *  - daily   array  (last `days`   days)
 *  - monthly array  (last `months` months, max 36 = 3 years)
 *  - byCategory array
 */
router.get('/summary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const days   = Math.min(90,  Math.max(7,  parseInt(String(req.query.days   ?? 30))));
    const months = Math.min(36,  Math.max(3,  parseInt(String(req.query.months ?? 12))));
    const now    = new Date();

    // ── Summary cards ─────────────────────────────────────────────────────────
    const [todayAgg, monthAgg, yearAgg, allAgg] = await Promise.all([
      prisma.order.aggregate({
        where: { status: 'Paid', createdAt: { gte: startOfDay(now), lte: endOfDay(now) } },
        _sum: { totalAmount: true }, _count: true,
      }),
      prisma.order.aggregate({
        where: { status: 'Paid', createdAt: { gte: startOfMonth(now) } },
        _sum: { totalAmount: true }, _count: true,
      }),
      prisma.order.aggregate({
        where: { status: 'Paid', createdAt: { gte: startOfYear(now) } },
        _sum: { totalAmount: true }, _count: true,
      }),
      prisma.order.aggregate({
        where: { status: 'Paid' },
        _sum: { totalAmount: true }, _count: true,
      }),
    ]);

    // ── Daily trend ───────────────────────────────────────────────────────────
    const rawDaily = await prisma.order.findMany({
      where: { status: 'Paid', createdAt: { gte: startOfDay(subDays(now, days - 1)) } },
      select: { totalAmount: true, createdAt: true },
    });

    const dailyMap: Record<string, { revenue: number; orders: number }> = {};
    for (let i = days - 1; i >= 0; i--) {
      dailyMap[fmtDate(subDays(now, i))] = { revenue: 0, orders: 0 };
    }
    for (const o of rawDaily) {
      const k = fmtDate(o.createdAt);
      if (dailyMap[k]) { dailyMap[k].revenue += Number(o.totalAmount); dailyMap[k].orders++; }
    }

    // ── Monthly trend (up to 3 years = 36 months) ─────────────────────────────
    const rawMonthly = await prisma.order.findMany({
      where: { status: 'Paid', createdAt: { gte: startOfMonth(subMonths(now, months - 1)) } },
      select: { totalAmount: true, createdAt: true },
    });

    const monthlyMap: Record<string, { revenue: number; orders: number }> = {};
    for (let i = months - 1; i >= 0; i--) {
      monthlyMap[fmtMonth(subMonths(now, i))] = { revenue: 0, orders: 0 };
    }
    for (const o of rawMonthly) {
      const k = fmtMonth(o.createdAt);
      if (monthlyMap[k]) { monthlyMap[k].revenue += Number(o.totalAmount); monthlyMap[k].orders++; }
    }

    // ── By category ───────────────────────────────────────────────────────────
    const paidItems = await prisma.orderItem.findMany({
      where: { order: { status: 'Paid' } },
      select: {
        subtotalPrice: true,
        orderId: true,
        product: { select: { category: true } },
      },
    });

    const catMap: Record<string, { revenue: number; orderIds: Set<string> }> = {};
    for (const item of paidItems) {
      const cat = item.product?.category ?? 'ServiceFee';
      if (!catMap[cat]) catMap[cat] = { revenue: 0, orderIds: new Set() };
      catMap[cat].revenue += Number(item.subtotalPrice);
      catMap[cat].orderIds.add(item.orderId);
    }

    const byCategory = Object.entries(catMap)
      .map(([category, { revenue, orderIds }]) => ({ category, revenue, orders: orderIds.size }))
      .sort((a, b) => b.revenue - a.revenue);

    res.json({
      today:     { revenue: Number(todayAgg._sum.totalAmount ?? 0), orders: todayAgg._count },
      thisMonth: { revenue: Number(monthAgg._sum.totalAmount ?? 0), orders: monthAgg._count },
      thisYear:  { revenue: Number(yearAgg._sum.totalAmount  ?? 0), orders: yearAgg._count  },
      allTime:   { revenue: Number(allAgg._sum.totalAmount   ?? 0), orders: allAgg._count   },
      daily:     Object.entries(dailyMap).map(([date, v])  => ({ date,  ...v })),
      monthly:   Object.entries(monthlyMap).map(([month, v]) => ({ month, ...v })),
      byCategory,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
