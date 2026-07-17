import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱  Seeding demo customer only (inventory starts empty)...');

  // ── Demo Customer + Vehicles ──────────────────────────────────────────
  const demo = await prisma.customer.upsert({
    where: { phone: '0812345678' },
    create: {
      name: 'สมชาย ใจดี',
      phone: '0812345678',
      vehicles: {
        create: [
          { licensePlate: 'กข 1234 นครราชสีมา', brand: 'Toyota', model: 'Fortuner' },
          { licensePlate: 'ขก 5678 นครราชสีมา', brand: 'Honda', model: 'Civic' },
        ],
      },
    },
    update: {},
    include: { vehicles: true },
  });

  console.log(`✅  Demo customer: ${demo.name} (${demo.phone}) — ${demo.vehicles.length} คัน`);
  console.log('✅  Products: 0 รายการ (เพิ่มสินค้าของคุณเองผ่านหน้า /products)');
  console.log('');
  console.log('🚀  เปิด http://localhost:5173 แล้วลองค้นหา:');
  console.log('    📋 ทะเบียน:  กข 1234');
  console.log('    📱 เบอร์โทร: 0812345678');
}

main()
  .catch((e) => {
    console.error('❌ Seed ล้มเหลว:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

