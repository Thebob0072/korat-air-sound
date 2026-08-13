/**
 * One-shot production migration script — runs inside Cloud Run via Cloud SQL socket.
 * Usage: node prisma/run-migration.js
 */
const mysql = require('mysql2/promise');

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

// Parse mysql://user:pass@host/db?socket=...
const match = url.match(/mysql:\/\/([^:]+):([^@]+)@([^/]+)\/([^?]+)(\?.*)?/);
if (!match) {
  console.error('Cannot parse DATABASE_URL:', url);
  process.exit(1);
}
const [, user, password, , database, queryStr] = match;
const socketPath = queryStr && queryStr.match(/socket=([^&]+)/)?.[1];

async function run() {
  const conn = await mysql.createConnection(
    socketPath
      ? { socketPath: decodeURIComponent(socketPath), user, password: decodeURIComponent(password), database }
      : { host: match[3], user, password: decodeURIComponent(password), database }
  );

  console.log('Connected to', database);

  const steps = [
    // ── customers ──────────────────────────────────────────────────────────────
    `ALTER TABLE customers
       MODIFY COLUMN name  VARCHAR(255) NULL,
       MODIFY COLUMN phone VARCHAR(50)  NULL`,

    // ── vehicles ───────────────────────────────────────────────────────────────
    `ALTER TABLE vehicles
       MODIFY COLUMN brand VARCHAR(255) NULL,
       MODIFY COLUMN model VARCHAR(255) NULL`,

    `ALTER TABLE vehicles ADD COLUMN customer_id VARCHAR(36) NULL`,

    // drop old NOT-NULL FK from initial schema so we can make customer_id nullable
    `ALTER TABLE vehicles DROP FOREIGN KEY vehicles_customer_id_fkey`,

    // ensure nullable — may already exist as NOT NULL from original schema
    `ALTER TABLE vehicles MODIFY COLUMN customer_id VARCHAR(36) NULL`,

    `ALTER TABLE vehicles
       ADD CONSTRAINT fk_vehicle_customer
         FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL`,

    // ── products (all additive columns) ────────────────────────────────────────
    `ALTER TABLE products ADD COLUMN supplier       VARCHAR(255)  NULL`,
    `ALTER TABLE products ADD COLUMN brand          VARCHAR(255)  NULL`,
    `ALTER TABLE products ADD COLUMN product_date   DATETIME(3)   NULL`,
    `ALTER TABLE products ADD COLUMN square_feet    DECIMAL(10,2) NULL`,
    `ALTER TABLE products ADD COLUMN model_year     INT           NULL`,
    `ALTER TABLE products ADD COLUMN warranty_months INT          NULL`,

    // ── order_items ────────────────────────────────────────────────────────────
    `ALTER TABLE order_items ADD COLUMN custom_label      VARCHAR(300) NULL`,
    `ALTER TABLE order_items ADD COLUMN technician_name   VARCHAR(300) NULL`,
    `ALTER TABLE order_items ADD COLUMN technician_id     VARCHAR(36)  NULL`,
    `ALTER TABLE order_items ADD COLUMN metadata          JSON         NULL`,
    `ALTER TABLE order_items ADD COLUMN warranty_months   INT          NULL`,
    `ALTER TABLE order_items ADD COLUMN warranty_end_date DATETIME(3)  NULL`,
  ];

  for (const sql of steps) {
    const preview = sql.trim().split('\n')[0].slice(0, 60);
    process.stdout.write(`  → ${preview}… `);
    try {
      await conn.execute(sql);
      console.log('OK');
    } catch (err) {
      // 1060 = duplicate column, 1061 = duplicate key name, 1091 = FK not found, 1826 = duplicate FK
      if (err.errno === 1060 || err.errno === 1061 || err.errno === 1091 || err.errno === 1826) {
        console.log('already exists, skip');
      } else {
        console.error('FAILED:', err.message);
        await conn.end();
        process.exit(1);
      }
    }
  }

  console.log('\nMigration complete.');
  await conn.end();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
