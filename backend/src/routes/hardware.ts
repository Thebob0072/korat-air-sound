import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { printReceipt } from '../lib/PrinterController';

// ── Validation schema ─────────────────────────────────────────────────────────

const PrintPayloadSchema = z.object({
  order_number: z.string().min(1),
  customer_name: z.string().min(1),
  license_plate: z.string().min(1),
  items: z.array(
    z.object({
      name: z.string(),
      qty: z.number().int().positive(),
      price: z.number().nonnegative(),
    }),
  ),
  total: z.number().nonnegative(),
});

// ── Router ────────────────────────────────────────────────────────────────────

const hardwareRouter = Router();

hardwareRouter.post(
  '/print',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const parsed = PrintPayloadSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
      return;
    }

    try {
      await printReceipt(parsed.data);
      res.json({ success: true });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'UNKNOWN_ERROR';

      if (message === 'PRINTER_NOT_FOUND' || message === 'PRINTER_DRIVER_NOT_INSTALLED') {
        res
          .status(503)
          .json({ error: 'ไม่พบเครื่องพิมพ์ กรุณาตรวจสอบการเชื่อมต่อ USB' });
        return;
      }

      if (message === 'PAPER_OUT') {
        res.status(503).json({ error: 'กระดาษหมด กรุณาเติมกระดาษ' });
        return;
      }

      next(err);
    }
  },
);

export default hardwareRouter;
