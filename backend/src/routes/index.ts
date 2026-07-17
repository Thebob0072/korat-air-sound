import { Router } from 'express';
import customersRouter from './customers';
import vehiclesRouter from './vehicles';
import productsRouter from './products';
import ordersRouter from './orders';
import hardwareRouter from './hardware';
import reportsRouter from './reports';

export const router = Router();

router.use('/customers', customersRouter);
router.use('/vehicles', vehiclesRouter);
router.use('/products', productsRouter);
router.use('/orders', ordersRouter);
router.use('/hardware', hardwareRouter);
router.use('/reports', reportsRouter);
