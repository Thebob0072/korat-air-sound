# Korat Air & Sound — ระบบ POS ร้านประดับยนต์

ระบบจัดการร้านประดับยนต์ครบวงจร สำหรับร้าน **Korat Air & Sound** รองรับการออกบิล จัดการออเดอร์ ลูกค้า สต็อกสินค้า และสรุปยอดขาย

---

## 🌐 Production URLs

| บริการ | URL |
|--------|-----|
| **Frontend (Custom Domain)** | https://audithebob.art |
| **Frontend (Cloud Run)** | https://korat-frontend-yovupdn6ma-as.a.run.app |
| **Backend API** | https://korat-backend-yovupdn6ma-as.a.run.app/api |
| **Swagger Docs** | https://korat-backend-yovupdn6ma-as.a.run.app/api-docs |

---

## 🧱 Tech Stack

### Frontend
- **React 18** + TypeScript + Vite 5
- **Tailwind CSS v3** — color palette: `#3B3A36` (charcoal), `#ECEAE6` (sand), `#F0EDE8` (warm white)
- **Fonts**: Sarabun (Thai) + Inter (Latin) + IBM Plex Mono (numbers/mono)
- **TanStack Query v5** — server state, caching
- **Zustand 4.5** — cart store with localStorage persistence
- **React Router v6** — routing
- **Radix UI** — accessible dialog primitives
- **html2canvas + jsPDF** — PDF export (ใบเสร็จ/ใบเสนอราคา)
- **Lucide React** — icons

### Backend
- **Node.js + Express** + TypeScript
- **Prisma ORM 5.22** with MySQL provider
- **Zod** — request validation
- **Swagger UI / JSDoc** — API documentation at `/api-docs`
- **Vitest** — unit tests (`npm test`)
- Port: `3001`

### Database
- **Google Cloud SQL MySQL 8.4.10**
- Host: `34.158.34.228:3306`
- DB: `korat_air_sound`

### Infrastructure
- **Google Cloud Run** (asia-southeast1) — backend + frontend containers
- **Google Artifact Registry** — Docker images (`korat-repo`)
- **GCP Project**: `guidetour-349021`
- **Custom domain**: `audithebob.art` → Cloud Run frontend

---

## ✨ Features

### POS Dashboard (`/`)
- ค้นหาทะเบียนรถลูกค้า พร้อม autocomplete
- เพิ่มรายการตามหมวดหมู่:

| หมวดหมู่ | วิธีทำงาน |
|---|---|
| **ระบบแอร์** (AirCon) | เลือกจาก catalog → สร้างใหม่ inline (ราคาทุน + ราคาขาย + stock) |
| **ฟิล์มกรองแสง** (Tint) | เลือกประเภทรถ × ยี่ห้อฟิล์ม → ราคา auto-fill จาก price table |
| **กระจกรถยนต์** (Glass) | เลือกตำแหน่ง × รุ่น/ปีรถ → ราคา auto-fill แก้ไขได้ |
| **เครื่องเสียง** (Sound) | เลือกจาก catalog / สร้างใหม่ พร้อม ยี่ห้อ + ปีรุ่น |
| **ค่าบริการ** (ServiceFee) | รายการพิเศษ/ค่าแรง ไม่หัก stock |
- ระบุช่างผู้รับผิดชอบต่อรายการ
- ส่วนลดบิล (discount) และรายการค่าบริการเพิ่มเติม
- Checkout → ชำระเงิน → พิมพ์ใบเสร็จ PDF

### Orders Management (`/orders`)
- รายการออเดอร์พร้อม pagination + filter สถานะ
- ดูรายละเอียดออเดอร์ (`/orders/:id`)
- เพิ่ม/ลบรายการในออเดอร์ Draft
- State machine: `Draft → Quoted → Paid` หรือ `→ Cancelled`
- ลบออเดอร์ได้เฉพาะสถานะ Draft
- พิมพ์ใบเสนอราคา / ใบเสร็จ (PDF)

### Products Management (`/products`)
- จัดการสินค้าตามหมวดหมู่
- ฟิลด์: ชื่อ, SKU, หมวดหมู่, ยี่ห้อ, ราคาทุน, ราคาขาย, stock, supplier

### Customers Management (`/customers`)
- ทะเบียนลูกค้า + รถ (1 ลูกค้า หลายคัน)
- ค้นหาตามชื่อ / เบอร์โทร / ทะเบียนรถ
- สถิติต่อลูกค้า: จำนวนรถ, ออเดอร์, ยอดรวม

### Reports / Sales Summary (`/reports`)
- ยอดขาย: วันนี้ / เดือนนี้ / ปีนี้ / ทั้งหมด
- กราฟยอดขายย้อนหลัง (รายวัน/รายเดือน/12เดือน/24เดือน/3ปี)
- ยอดขายแยกหมวดหมู่ พร้อม progress bar

---

## 🗃️ Database Schema

```prisma
model Customer {
  id        String    @id @default(uuid())
  name      String
  phone     String    @unique
  vehicles  Vehicle[]
}

model Vehicle {
  id           String   @id @default(uuid())
  licensePlate String   @unique
  brand        String
  model        String
  customerId   String
  orders       Order[]
}

model Product {
  id            String          @id @default(uuid())
  sku           String          @unique
  name          String
  category      ProductCategory   // AirCon | Tint | Glass | Sound | ServiceFee
  costPrice     Decimal           // ราคาทุน
  sellingPrice  Decimal           // ราคาขาย
  stockQuantity Int @default(0)
  supplier      String?
  brand         String?
  squareFeet    Decimal?          // สำหรับสินค้าที่วัดเป็นตร.ฟุต (ฟิล์ม)
  modelYear     Int?
}

model Order {
  id          String      @id @default(uuid())
  orderNumber String      @unique    // KAS-YYYYMMDD-XXXX
  vehicleId   String
  status      OrderStatus @default(Draft)  // Draft | Quoted | Paid | Cancelled
  totalAmount Decimal
}

model OrderItem {
  id              String
  orderId         String
  productId       String?   // null = custom-label item (ฟิล์ม/กระจก/ค่าบริการ)
  customLabel     String?   // ชื่อรายการที่ไม่อยู่ใน catalog
  technicianName  String?   // ช่างผู้รับผิดชอบ
  quantity        Int
  unitPrice       Decimal
  subtotalPrice   Decimal
}
```

> **หมายเหตุสำคัญ**: รายการที่ไม่มี `productId` (ฟิล์ม, กระจก, ค่าบริการพิเศษ) จะไม่หัก stock ในระบบ

---

## 🚀 Local Development

### Prerequisites
- Node.js 20+
- IP ของเครื่องต้อง whitelist ใน Cloud SQL Authorized Networks

### 1. Clone & Install

```bash
git clone <repo-url>
cd korat-air-sound

cd backend && npm install
cd ../frontend && npm install
```

### 2. Environment Setup

**backend/.env**
```
DATABASE_URL="mysql://root:P%40ssw0rd@34.158.34.228:3306/korat_air_sound"
PORT=3001
NODE_ENV=development
```

**frontend (development ใช้ localhost, ไม่ต้องสร้าง .env)**
```
# frontend/.env.production (สำหรับ build production)
VITE_API_URL=https://korat-backend-yovupdn6ma-as.a.run.app/api
```

### 3. Run Manually

```bash
# Terminal 1 — Backend
cd backend && npx prisma generate && npm run dev

# Terminal 2 — Frontend
cd frontend && npm run dev
# → http://localhost:5173
```

### 4. Tests

```bash
cd backend && npm test
```

### 5. Database (Prisma)

```bash
cd backend
npx prisma generate          # สร้าง Prisma client
npx prisma db push           # sync schema → dev (ไม่มี migration)
npx prisma migrate deploy    # apply migrations → production
npx ts-node prisma/seed.ts   # seed ข้อมูลตัวอย่าง
npx prisma studio            # GUI browser สำหรับ DB
```

### ⚠️ Cloud SQL IP Whitelist

ถ้า backend connect DB ไม่ได้จาก local ให้ whitelist IP:
```bash
gcloud sql instances patch korat-air-sound \
  --authorized-networks="YOUR_IP/32"
```

---

## 📦 Deployment (Google Cloud Run)

### Backend

```bash
cd backend
docker build --platform linux/amd64 \
  -t asia-southeast1-docker.pkg.dev/guidetour-349021/korat-repo/backend:latest .
docker push asia-southeast1-docker.pkg.dev/guidetour-349021/korat-repo/backend:latest

gcloud run deploy korat-backend \
  --image asia-southeast1-docker.pkg.dev/guidetour-349021/korat-repo/backend:latest \
  --region asia-southeast1 --platform managed --allow-unauthenticated \
  --port 3001 \
  --set-env-vars "DATABASE_URL=mysql://root:P%40ssw0rd@34.158.34.228:3306/korat_air_sound,NODE_ENV=production" \
  --quiet
```

### Frontend

```bash
cd frontend
npm run build

docker build --platform linux/amd64 \
  -t asia-southeast1-docker.pkg.dev/guidetour-349021/korat-repo/frontend:latest .
docker push asia-southeast1-docker.pkg.dev/guidetour-349021/korat-repo/frontend:latest

gcloud run deploy korat-frontend \
  --image asia-southeast1-docker.pkg.dev/guidetour-349021/korat-repo/frontend:latest \
  --region asia-southeast1 --platform managed --allow-unauthenticated \
  --port 8080 --quiet
```

---

## 📁 Project Structure

```
korat-air-sound/
├── README.md
├── docker-compose.yml
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── vitest.config.ts
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── seed.ts
│   │   └── migrations/
│   └── src/
│       ├── index.ts              # Express server, CORS, Swagger
│       ├── lib/
│       │   └── swagger.ts
│       ├── middleware/
│       │   └── errorHandler.ts
│       ├── routes/
│       │   ├── index.ts
│       │   ├── customers.ts
│       │   ├── orders.ts         # state machine guard, DELETE endpoint
│       │   ├── products.ts
│       │   └── vehicles.ts
│       ├── services/
│       │   └── orderService.ts   # processPayment, stock deduction
│       └── __tests__/
│           └── orderService.test.ts
└── frontend/
    ├── Dockerfile
    ├── nginx.conf
    ├── index.html
    └── src/
        ├── index.css             # Sarabun + IBM Plex Mono fonts
        ├── components/
        │   ├── Navbar.tsx        # LiveClock, brand header
        │   ├── AirConModal.tsx   # catalog + create-inline
        │   ├── TintingModal.tsx  # price table: car-type × brand
        │   ├── GlassModal.tsx    # position + car model/year
        │   ├── SoundModal.tsx    # catalog + brand/year
        │   ├── OtherItemModal.tsx
        │   ├── CheckoutModal.tsx
        │   └── VehicleRegistrationModal.tsx
        ├── pages/
        │   ├── POSDashboard.tsx  # category buttons with colors
        │   ├── OrdersPage.tsx
        │   ├── OrderDetailPage.tsx
        │   ├── ProductsPage.tsx
        │   ├── CustomersPage.tsx
        │   └── ReportsPage.tsx
        ├── store/
        │   └── POSCartStore.ts   # Zustand + localStorage
        ├── lib/
        │   ├── api.ts
        │   └── utils.ts
        └── types/index.ts
```

---

## 🔒 CORS Policy

Backend รองรับ origin:
- `http://localhost:5173` (Vite dev)
- `http://localhost:4173` (Vite preview)
- `https://korat-frontend-yovupdn6ma-as.a.run.app`
- `https://korat-frontend-171089417301.asia-southeast1.run.app`
- `https://audithebob.art`
- `CORS_ORIGIN` env variable (override)

---

## 📝 License

Private — ร้าน Korat Air & Sound
