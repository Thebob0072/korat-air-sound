-- Add InvoicePending value to status enum (MySQL syntax)
ALTER TABLE `orders` MODIFY COLUMN `status` ENUM('Draft','Quoted','InProgress','WaitingForParts','Ready','InvoicePending','Paid','Cancelled') NOT NULL DEFAULT 'Draft';

-- Add due_date column
ALTER TABLE `orders` ADD COLUMN `due_date` DATETIME(3) NULL;
