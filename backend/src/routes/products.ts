import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ProductCategory } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';

const router = Router();

const ProductSchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  category: z.nativeEnum(ProductCategory),
  costPrice: z.number().nonnegative(),
  sellingPrice: z.number().nonnegative(),
  stockQuantity: z.number().int().nonnegative(),
  supplier: z.string().optional(),
  brand: z.string().optional(),
  squareFeet: z.number().nonnegative().optional(),
  productDate: z.string().optional(),
  modelYear: z.number().int().min(1900).max(2100).optional(),
});

function toProductData(data: z.infer<typeof ProductSchema>) {
  const { productDate, ...rest } = data;
  return {
    ...rest,
    ...(productDate !== undefined ? { productDate: productDate ? new Date(productDate) : null } : {}),
  };
}

function toProductDataPartial(data: Partial<z.infer<typeof ProductSchema>>) {
  const { productDate, ...rest } = data;
  return {
    ...rest,
    ...(productDate !== undefined ? { productDate: productDate ? new Date(productDate) : null } : {}),
  };
}

/** GET /api/products?category=AirCon&q=filter */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { category, q } = req.query;
    const products = await prisma.product.findMany({
      where: {
        ...(category ? { category: category as ProductCategory } : {}),
        ...(q
          ? {
              OR: [
                { name: { contains: String(q) } },
                { sku: { contains: String(q) } },
              ],
            }
          : {}),
      },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
    res.json(products);
  } catch (err) {
    next(err);
  }
});

/** GET /api/products/:id */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const product = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!product) throw new AppError(404, 'Product not found');
    res.json(product);
  } catch (err) {
    next(err);
  }
});

/** POST /api/products */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = ProductSchema.parse(req.body);
    const existing = await prisma.product.findUnique({ where: { sku: data.sku } });
    if (existing) throw new AppError(409, `SKU "${data.sku}" already exists`);
    const product = await prisma.product.create({ data: toProductData(data) });
    res.status(201).json(product);
  } catch (err) {
    next(err);
  }
});

/** PUT /api/products/:id */
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = ProductSchema.partial().parse(req.body);
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: toProductDataPartial(data),
    });
    res.json(product);
  } catch (err) {
    next(err);
  }
});

/** DELETE /api/products/:id */
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.product.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
