# Korat Air & Sound — ระบบ POS ร้านประดับยนต์

ระบบจัดการร้านประดับยนต์ครบวงจร สำหรับร้าน **Korat Air & Sound** รองรับการออกบิล สต็อกสินค้า และการจัดการออเดอร์แบบ real-time

---

## 🌐 Production URLs

| บริการ | URL |
|--------|-----|
| **Frontend** | https://korat-frontend-171089417301.asia-southeast1.run.app |
| **Backend API** | https://korat-backend-171089417301.asia-southeast1.run.app/api |

---

## 🧱 Tech Stack

### Frontend
- **React 18** + TypeScript + Vite 5
- **Tailwind CSS v3** — palette: `#3B3A36`, `#ECEAE6`, `#F0EDE8`
- **TanStack Query** — server state management
- **Zustand** — cart store
- **React Router v6** — routing
- **Radix UI** — accessible dialog primitives
- **html2canvas + jsPDF** — PDF export
- **Lucide React** — icons

### Backend
- **Node.js + Express** + TypeScript
- **Prisma ORM 5.22** with MySQL provider
- **Zod** — request validation
- Port: `3001`

### Database
- **Google Cloud SQL MySQL 8.4.10**
- Host: `34.158.34.228:3306`
- DB: `korat_air_sound`

### Infrastructure
- **Google Cloud Run** (asia-southeast1) — backend + frontend
- **Google Artifact Registry** — Docker images (`korat-repo`)
- **GCP Project**: `guidetour-349021`

---

## ✨ Features

### POS Dashboard
- ค้นหาทะเบียนรถลูกค้า (autocomplete)
- เพิ่มสินค้าตามหมวดหมู่:
  - **ระบบแอร์** — เลือกจาก catalog + สร้างใหม่ inline
  - **ฟิล์มกรองแสง** — เลือกยี่ห้อ/ประเภทรถ/ราคา
  - **กระจกรถยนต์** — เลือกตำแหน่ง/รุ่นรถ
  - **กุญแจรีโมท** — สินค้าจาก catalog
  - **เครื่องเสียง** — เลือก/สร้างใหม่พร้อม ยี่ห้อ + ปีรุ่น
  - **อื่นๆ** — รายการพิเศษ/ค่าบริการ
- **ช่างผู้รับผิดชอบ** — ระบุชื่อช่างต่อรายการ
- ส่วนลดบิล, checkout, ดูบิลก่อนชำระ

### Orders Management
- รายการออเดอร์พร้อม pagination + filter สถานะ
- ดูรายละเอียดออเดอร์
- เพิ่ม/ลบรายการในออเดอร์
- เปลี่ยนสถานะ: Draft → Quoted → Paid → Cancelled
- พิมพ์ใบเสนอราคา / ใบเสร็จ (PDF)

### Products Management
- จัดการสินค้าตามหมวดหมู่
- ราคาทุน + ราคาขาย + สต็อก
- รองรับ: ยี่ห้อ (`brand`), ปีรุ่น (`modelYear`), ซัพพลายเออร์

### Customers Management
- ทะเบียนลูกค้า + รถ
- ค้นหาตามชื่อ / เบอร์โทร / ทะเบียนรถ

### Reports / Dashboard
- ยอดขายรายวัน/เดือน
- สถิติออเดอร์

---

## 🗃️ Database Schema (หลักๆ)

```prisma
enum ProductCategory {
  AirCon | Tint | Glass | CentralLock | Sound | ServiceFee
}

model Product {
  id            String
  sku           String @unique
  name          String
  category      ProductCategory
  brand         String?
  modelYear     Int?
  supplier      String?
  costPrice     Decimal
  sellingPrice  Decimal
  stockQuantity Int
}

model OrderItem {
  id             String
  orderId        String
  productId      String?
  customLabel    String?   // สำหรับสินค้าที่ไม่อยู่ใน catalog
  technicianName String?   // ชื่อช่างผู้รับผิดชอบ
  quantity       Int
  unitPrice      Decimal
  subtotalPrice  Decimal
}
```

---

## 🚀 Local Development

### Prerequisites
- Node.js 20+
- Docker + Docker Compose

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

**frontend/.env.production**
```
VITE_API_URL=https://korat-backend-171089417301.asia-southeast1.run.app/api
```

### 3. Run with Docker Compose

```bash
docker compose up
```

### 4. Run Manually

```bash
# Backend
cd backend && npx prisma generate && npm run dev

# Frontend
cd frontend && npm run dev
```

### 5. Database

```bash
cd backend
npx prisma db push        # sync schema (dev)
npx prisma migrate deploy # apply migrations (prod)
npx ts-node prisma/seed.ts # seed data
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
.
├── docker-compose.yml
├── README.md
├── backend/
│   ├── Dockerfile
│   ├── prisma/
│   │   ├── schema.prisma       # Database schema
│   │   ├── seed.ts             # Seed data
│   │   └── migrations/
│   └── src/
│       ├── index.ts            # Express server + CORS
│       ├── routes/             # customers, orders, products, vehicles, hardware
│       └── services/           # orderService
└── frontend/
    ├── Dockerfile
    ├── nginx.conf
    └── src/
        ├── components/
        │   ├── AirConModal.tsx          # หมวดแอร์
        │   ├── TintingModal.tsx         # หมวดฟิล์ม
        │   ├── GlassModal.tsx           # หมวดกระจก
        │   ├── SoundModal.tsx           # หมวดเครื่องเสียง (ยี่ห้อ + ปีรุ่น)
        │   ├── OtherItemModal.tsx       # อื่นๆ/ค่าบริการ
        │   ├── CheckoutModal.tsx        # ชำระเงิน
        │   └── VehicleRegistrationModal.tsx
        ├── pages/
        │   ├── POSDashboard.tsx         # หน้าขาย (POS)
        │   ├── OrdersPage.tsx
        │   ├── OrderDetailPage.tsx
        │   ├── ProductsPage.tsx
        │   └── Dashboard.tsx
        ├── store/
        │   └── POSCartStore.ts          # Zustand cart store
        └── types/index.ts
```

---

## 🔒 CORS Policy

Backend รองรับ:
- `http://localhost:5173`
- `http://localhost:4173`
- `https://korat-frontend-171089417301.asia-southeast1.run.app`
- `CORS_ORIGIN` env variable (optional override)

---

## 📝 License

Private — ร้าน Korat Air & Sound
