// ─── Enums ────────────────────────────────────────────────────────────────────

export enum ProductCategory {
  AirCon = 'AirCon',           // ซ่อมแอร์
  Tint = 'Tint',               // ติดฟิล์มกรองแสง
  Glass = 'Glass',             // เปลี่ยนกระจก
  CentralLock = 'CentralLock', // เซ็นทรัลล็อก
  Sound = 'Sound',             // เครื่องเสียง
  ServiceFee = 'ServiceFee',   // ค่าบริการ
}

export type OrderStatus =
  | 'Draft'
  | 'Quoted'
  | 'InProgress'      // กำลังซ่อม/ติดตั้ง
  | 'WaitingForParts' // รออะไหล่/รอกระจก
  | 'Ready'           // เสร็จแล้ว รอลูกค้ามารับ
  | 'Paid'
  | 'Cancelled';

// ─── Item Metadata (Discriminated Unions) ─────────────────────────────────────
// เก็บสเปกทางเทคนิคหน้างานต่อ OrderItem — โยนลง MySQL เป็น JSON column

export interface TintMeta {
  type: 'TINT';
  /** ตำแหน่งติดฟิล์ม */
  position: 'FRONT' | 'REAR' | 'AROUND' | 'DOOR_FL' | 'DOOR_FR' | 'DOOR_RL' | 'DOOR_RR' | 'SUNROOF' | 'CUSTOM';
  /** ความเข้ม เช่น "40", "60", "80" — เป็น string เผื่อสเปกพิเศษ */
  darkness: string;
  /** ซีรีส์ฟิล์ม เช่น Ceramic, Crystalline, Carbon */
  series?: string;
  /** ลอกฟิล์มเก่าออกก่อนหรือเปล่า — มีผลกับค่าแรงและเวลาทำงาน */
  isOldFilmRemoved: boolean;
}

export interface AirConMeta {
  type: 'AIRCON';
  /** ประเภทชิ้นส่วน/งานที่ทำ */
  component: 'COMPRESSOR' | 'EVAPORATOR' | 'CONDENSER' | 'HOSE' | 'FREON' | 'FILTER' | 'OTHER';
  /** ประเภทน้ำยา — R1234yf ต้นทุนสูงกว่า R134a มาก */
  refrigerantType?: 'R134a' | 'R1234yf' | 'R12';
  /** แบรนด์อะไหล่ เช่น Denso, Sanden, Valeo */
  brand?: string;
  /** อาการที่ลูกค้าแจ้ง เช่น "แอร์รั่วตู้หน้า", "คอมคลัตช์ไหม้" */
  symptomNote?: string;
}

export interface GlassMeta {
  type: 'GLASS';
  /** ตำแหน่งกระจก */
  position: 'WINDSHIELD' | 'REAR' | 'DOOR_FL' | 'DOOR_FR' | 'DOOR_RL' | 'DOOR_RR' | 'QUARTER';
  /** มีเซ็นเซอร์น้ำฝน — กระจกราคาต่างกัน ห้ามลืมถาม */
  hasSensor: boolean;
  /** ไล่ฝ้าหลัง */
  hasHeater: boolean;
  /** แบรนด์กระจก เช่น TSG, XYG, OEM */
  glassBrand?: string;
}

export interface SoundMeta {
  type: 'SOUND';
  /** ประเภทอุปกรณ์ */
  component: 'HEAD_UNIT' | 'SPEAKER' | 'AMP' | 'SUBWOOFER' | 'DSP' | 'WIRING' | 'DAMPING';
  /** ตำแหน่งติดตั้ง — optional เพราะบางชิ้น (HEAD_UNIT) ไม่มีตำแหน่งให้เลือก */
  placement?: 'FRONT_DOOR' | 'REAR_DOOR' | 'TRUNK' | 'CONSOLE' | 'UNDER_SEAT';
}

/** Union type สำหรับ metadata ทุกหมวดงาน — discriminated ด้วย `type` field */
export type OrderItemMeta = TintMeta | AirConMeta | GlassMeta | SoundMeta;

// ─── Entities ─────────────────────────────────────────────────────────────────

export interface Customer {
  id: string;
  name: string;
  phone: string;
  createdAt: string;
  vehicles?: Vehicle[];
}

export interface Vehicle {
  id: string;
  licensePlate: string;
  brand: string;
  model: string;
  customerId: string;
  customer?: Customer;
  orders?: Order[];
}

export interface Technician {
  id: string;
  name: string;
  nickname?: string | null;
  isActive: boolean;
}

/** Decimal fields from Prisma are serialised as strings over JSON. */
export interface Product {
  id: string;
  sku: string;
  name: string;
  category: ProductCategory;
  costPrice: string | number;
  sellingPrice: string | number;
  /** Decimal in DB — รองรับทศนิยม เช่น ตัดฟิล์มเป็นตารางฟุต */
  stockQuantity: string | number;
  supplier?: string | null;
  brand?: string | null;
  squareFeet?: string | number | null;
  productDate?: string | null;
  modelYear?: number | null;
  isService?: boolean;
  /** ระยะเวลารับประกัน (เดือน) ที่ผูกกับสินค้านี้โดย default */
  warrantyMonths?: number | null;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId?: string | null;
  product?: Product;
  customLabel?: string | null;
  technicianName?: string | null;
  technicianId?: string | null;
  technician?: Technician | null;
  /** Decimal — รองรับทศนิยม เช่น 15.5 ตารางฟุต */
  quantity: string | number;
  unitPrice: string | number;
  subtotalPrice: string | number;
  /** สเปกทางเทคนิคเฉพาะหมวดงาน */
  metadata?: OrderItemMeta | null;
  /** จำนวนเดือนรับประกันของรายการนี้ */
  warrantyMonths?: number | null;
  /** วันสิ้นสุดประกัน (คำนวณจาก createdAt + warrantyMonths) */
  warrantyEndDate?: string | null;
}

export interface Order {
  id: string;
  orderNumber: string;
  vehicleId: string;
  vehicle?: Vehicle;
  status: OrderStatus;
  totalAmount: string | number;
  createdAt: string;
  updatedAt: string;
  orderItems?: OrderItem[];
}

// ─── DTO types used in forms ──────────────────────────────────────────────────

export interface CreateCustomerDto {
  name: string;
  phone: string;
}

export interface CreateVehicleDto {
  licensePlate: string;
  brand: string;
  model: string;
  customerId: string;
}

export interface CreateProductDto {
  sku: string;
  name: string;
  category: ProductCategory;
  costPrice: number;
  sellingPrice: number;
  /** รองรับทศนิยม */
  stockQuantity: number;
  supplier?: string;
  brand?: string;
  squareFeet?: number;
  productDate?: string;
  modelYear?: number;
  isService?: boolean;
  warrantyMonths?: number;
}

export interface AddOrderItemDto {
  productId?: string;
  customLabel?: string;
  technicianName?: string;
  technicianId?: string;
  quantity: number;
  unitPrice: number;
  metadata?: OrderItemMeta;
  warrantyMonths?: number;
}
