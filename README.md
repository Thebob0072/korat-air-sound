# Korat Air & Sound — ระบบ POS ร้านประดับยนต์

ระบบจัดการร้านประดับยนต์ครบวงจร รองรับการออกบิล จัดการออเดอร์ ลูกค้า สต็อกสินค้า และสรุปยอดขาย

---

## Production URLs

| บริการ | URL |
|--------|-----|
| **เว็บไซต์** | https://audithebob.art |
| **Backend API** | https://korat-backend-171089417301.asia-southeast1.run.app/api |
| **Swagger Docs** | https://korat-backend-171089417301.asia-southeast1.run.app/api-docs |

---

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite 5, Tailwind CSS v3, TanStack Query v5, Zustand, React Router v6, Radix UI
- **Backend**: Node.js, Express, TypeScript, Prisma ORM, MySQL, Zod, Swagger
- **Database**: Google Cloud SQL MySQL 8 — IP `34.158.34.228`, DB `korat_air_sound`
- **Infra**: Google Cloud Run (asia-southeast1), Artifact Registry, GCP Project `guidetour-349021`

---

## Local Development

**ต้องการ**: Node.js 20+, IP เครื่องต้อง whitelist ใน Cloud SQL

```bash
git clone <repo>
cd korat-air-sound

# Backend
cd backend
npm install
# สร้าง backend/.env
echo 'DATABASE_URL="mysql://root:P%40ssw0rd@34.158.34.228:3306/korat_air_sound"' > .env
echo 'PORT=3001' >> .env
npx prisma generate
npm run dev          # → http://localhost:3001

# Frontend (terminal ใหม่)
cd ../frontend
npm install
npm run dev          # → http://localhost:5173
```

ถ้า backend connect DB ไม่ได้ ต้อง whitelist IP ใน Cloud SQL:
```bash
gcloud sql instances patch korat-air-sound \
  --authorized-networks="$(curl -s ifconfig.me)/32" \
  --project=guidetour-349021
```

---

## Deploy to Production

**ต้องการ**: Docker Desktop, gcloud CLI, auth ด้วย `gcloud auth login`

### ขั้นตอนทั้งหมด (ทำทีเดียว)

```bash
# 1. Build frontend
cd frontend
npm run build

# 2. Docker auth กับ Artifact Registry
gcloud auth print-access-token \
  | docker login -u oauth2accesstoken --password-stdin \
    asia-southeast1-docker.pkg.dev

# 3. Build + push images (ต้อง --platform linux/amd64 เสมอ)
docker buildx build \
  --platform linux/amd64 --push \
  -t asia-southeast1-docker.pkg.dev/guidetour-349021/korat-repo/korat-frontend:latest \
  ./frontend

docker buildx build \
  --platform linux/amd64 --push \
  -t asia-southeast1-docker.pkg.dev/guidetour-349021/korat-repo/korat-backend:latest \
  ./backend

# 4. Deploy ทั้งคู่
gcloud run deploy korat-frontend \
  --image asia-southeast1-docker.pkg.dev/guidetour-349021/korat-repo/korat-frontend:latest \
  --region asia-southeast1 --platform managed --allow-unauthenticated --quiet

gcloud run deploy korat-backend \
  --image asia-southeast1-docker.pkg.dev/guidetour-349021/korat-repo/korat-backend:latest \
  --region asia-southeast1 --platform managed --allow-unauthenticated --quiet
```

หลัง deploy แล้ว `audithebob.art` จะ serve เวอร์ชันใหม่ทันที (domain mapping เชื่อมอยู่แล้ว)

### หมายเหตุสำคัญ

- **`--platform linux/amd64` บังคับ** — Mac (Apple Silicon) build multi-arch โดย default ซึ่ง Cloud Run ไม่รับ
- frontend Dockerfile แค่ `COPY dist` ดังนั้นต้อง `npm run build` ก่อน docker build เสมอ
- ถ้า push ไม่ได้ให้ re-login docker ด้วย gcloud token (ข้อ 2)

---

## Bluetooth Thermal Printer (58mm)

ฟีเจอร์พิมพ์ใบเสร็จผ่าน Bluetooth ใช้ **Web Bluetooth API** + **ESC/POS** โดยตรงจากเบราว์เซอร์

### เครื่องพิมพ์ที่รองรับ

เครื่องพิมพ์ความร้อน 58mm ที่ใช้ Bluetooth LE (BLE) ทั่วไปในไทย เช่น:
- **Xprinter XP-P300** / XP-P3
- **GOOJPRT PT-210** / PT-280
- **EPSON TM-P20** (BLE รุ่น)
- เครื่องจีนทั่วไปที่ขายใน Lazada/Shopee (ทดสอบก่อนซื้อ)

### วิธีใช้งาน

1. เปิดหน้า Order detail ที่ต้องการพิมพ์
2. กดปุ่ม **"เชื่อมต่อเครื่องพิมพ์"** (ไอคอน Bluetooth)
3. เบราว์เซอร์จะแสดง dialog เลือกอุปกรณ์ — เลือกเครื่องพิมพ์ของคุณ
4. เมื่อเชื่อมต่อแล้ว ปุ่มจะเปลี่ยนเป็น **"พิมพ์"** พร้อมชื่ออุปกรณ์
5. กด **"พิมพ์"** — ใบเสร็จจะออกทันที

### ข้อกำหนด

- ต้องใช้ **Chrome หรือ Edge** (Firefox ไม่รองรับ Web Bluetooth)
- ต้องเข้าผ่าน **HTTPS** (audithebob.art) หรือ localhost เท่านั้น
- จับคู่ Bluetooth ที่ระบบปฏิบัติการก่อน (Settings → Bluetooth → Pair) แล้วค่อยกดเชื่อมต่อในเว็บ

### ถ้าเชื่อมต่อแล้วพิมพ์ไม่ออก

เครื่องพิมพ์บางรุ่นใช้ BLE service UUID ที่ต่างกัน hook ลอง 4 profiles อัตโนมัติ ถ้ายังไม่ได้ให้:
1. เปิด Chrome DevTools → Console ดู error ว่า service UUID ไหนหาไม่เจอ
2. ถ้าเครื่องพิมพ์เป็นรุ่นใหม่อาจต้องการ pairing PIN — กรอกที่ระบบปฏิบัติการก่อน

---

## Database Schema (สรุป)

```prisma
Customer  — id, name?, phone?
Vehicle   — id, licensePlate, brand?, model?, customerId?
Product   — id, sku, name, category, costPrice, sellingPrice, stockQuantity
Order     — id, orderNumber (KAS-YYYYMMDD-XXXX), vehicleId, status, totalAmount
OrderItem — orderId, productId?, customLabel?, quantity, unitPrice, technicianName?
```

สถานะออเดอร์: `Draft → Quoted → Paid` หรือ `→ Cancelled`

รายการที่ไม่มี `productId` (ฟิล์ม, กระจก, ค่าบริการพิเศษ) ไม่หัก stock

---

## Project Structure

```
korat-air-sound/
├── backend/
│   ├── Dockerfile
│   ├── prisma/schema.prisma
│   └── src/
│       ├── index.ts
│       ├── routes/        (customers, orders, products, vehicles)
│       └── services/orderService.ts
└── frontend/
    ├── Dockerfile         (nginx:alpine + COPY dist)
    ├── nginx.conf
    └── src/
        ├── components/    (modals, PDFDocument, CheckoutModal)
        ├── hooks/         (usePDFExport, useBluetoothPrinter)
        ├── pages/         (POSDashboard, OrderDetailPage, ...)
        ├── store/         (POSCartStore — Zustand)
        └── lib/api.ts
```
