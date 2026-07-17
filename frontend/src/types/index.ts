// ─── Enums ────────────────────────────────────────────────────────────────────

export enum ProductCategory {
  AirCon = 'AirCon',           // ซ่อมแอร์
  Tint = 'Tint',               // ติดฟิล์มกรองแสง
  Glass = 'Glass',             // เปลี่ยนกระจก
  CentralLock = 'CentralLock', // เซ็นทรัลล็อก
  Sound = 'Sound',             // เครื่องเสียง
  ServiceFee = 'ServiceFee',   // ค่าบริการ
}

export type OrderStatus = 'Draft' | 'Quoted' | 'Paid' | 'Cancelled';

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

/** Decimal fields from Prisma are serialised as strings over JSON. */
export interface Product {
  id: string;
  sku: string;
  name: string;
  category: ProductCategory;
  costPrice: string | number;
  sellingPrice: string | number;
  stockQuantity: number;
  supplier?: string | null;
  brand?: string | null;
  squareFeet?: string | number | null;
  productDate?: string | null;
  modelYear?: number | null;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId?: string;
  product?: Product;
  customLabel?: string;
  technicianName?: string;
  quantity: number;
  unitPrice: string | number;
  subtotalPrice: string | number;
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
  stockQuantity: number;
  supplier?: string;
  brand?: string;
  squareFeet?: number;
  productDate?: string;
  modelYear?: number;
}

export interface AddOrderItemDto {
  productId?: string;
  customLabel?: string;
  technicianName?: string;
  quantity: number;
  unitPrice: number;
}
