-- Migration: apply schema changes to Cloud SQL (production)
-- Run this on Cloud SQL after deploying new code to audithebob.art
-- ---------------------------------------------------------------

-- 1. Make Customer.name and Customer.phone optional (nullable)
ALTER TABLE customers
  MODIFY COLUMN name VARCHAR(255) NULL,
  MODIFY COLUMN phone VARCHAR(50) NULL;

-- 2. Make Vehicle.brand and Vehicle.model optional (nullable)
ALTER TABLE vehicles
  MODIFY COLUMN brand VARCHAR(255) NULL,
  MODIFY COLUMN model VARCHAR(255) NULL;

-- 3. Add customer_id FK to vehicles (if not exists)
-- Check first:
-- SHOW COLUMNS FROM vehicles LIKE 'customer_id';
ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS customer_id VARCHAR(36) NULL;

ALTER TABLE vehicles
  ADD CONSTRAINT IF NOT EXISTS fk_vehicle_customer
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL;

-- Verify
DESCRIBE customers;
DESCRIBE vehicles;
