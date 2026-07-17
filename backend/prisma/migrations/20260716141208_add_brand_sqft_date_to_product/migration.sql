-- AlterTable
ALTER TABLE "products" ADD COLUMN     "brand" TEXT,
ADD COLUMN     "product_date" TIMESTAMP(3),
ADD COLUMN     "square_feet" DECIMAL(10,2);
