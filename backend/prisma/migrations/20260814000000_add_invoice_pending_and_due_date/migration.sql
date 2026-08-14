-- AlterEnum
ALTER TYPE "OrderStatus" ADD VALUE 'InvoicePending';

-- AlterTable
ALTER TABLE "orders" ADD COLUMN "due_date" TIMESTAMP(3);
