import axios from 'axios';
import type {
  Customer,
  Vehicle,
  Product,
  Order,
  OrderItem,
  CreateCustomerDto,
  CreateVehicleDto,
  CreateProductDto,
  AddOrderItemDto,
} from '@/types';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  headers: { 'Content-Type': 'application/json' },
});

// ─── Customers ────────────────────────────────────────────────────────────────

export const searchCustomers = (q: string) =>
  api.get<Customer[]>(`/customers/search?q=${encodeURIComponent(q)}`).then((r) => r.data);

export const getCustomer = (id: string) =>
  api.get<Customer>(`/customers/${id}`).then((r) => r.data);

export const createCustomer = (data: CreateCustomerDto) =>
  api.post<Customer>('/customers', data).then((r) => r.data);

// ─── Vehicles ────────────────────────────────────────────────────────────────

export const searchVehicles = (q: string) =>
  api.get<Vehicle[]>(`/vehicles/search?q=${encodeURIComponent(q)}`).then((r) => r.data);

export const getVehicle = (id: string) =>
  api.get<Vehicle>(`/vehicles/${id}`).then((r) => r.data);

export const createVehicle = (data: CreateVehicleDto) =>
  api.post<Vehicle>('/vehicles', data).then((r) => r.data);

// ─── Products ────────────────────────────────────────────────────────────────

export const getProducts = (params?: { category?: string; q?: string }) =>
  api.get<Product[]>('/products', { params }).then((r) => r.data);

export const createProduct = (data: CreateProductDto) =>
  api.post<Product>('/products', data).then((r) => r.data);

export const updateProduct = (id: string, data: Partial<CreateProductDto>) =>
  api.put<Product>(`/products/${id}`, data).then((r) => r.data);

export const deleteProduct = (id: string) => api.delete(`/products/${id}`);

// ─── Orders ──────────────────────────────────────────────────────────────────

export const getOrders = (params?: { status?: string }) =>
  api.get<Order[]>('/orders', { params }).then((r) => r.data);

export const getOrder = (id: string) =>
  api.get<Order>(`/orders/${id}`).then((r) => r.data);

export const createOrder = (vehicleId: string) =>
  api.post<Order>('/orders', { vehicleId }).then((r) => r.data);

export const updateOrderStatus = (id: string, status: string) =>
  api.patch<Order>(`/orders/${id}/status`, { status }).then((r) => r.data);

export const addOrderItem = (orderId: string, item: AddOrderItemDto) =>
  api.post<OrderItem>(`/orders/${orderId}/items`, item).then((r) => r.data);

export const removeOrderItem = (orderId: string, itemId: string) =>
  api.delete(`/orders/${orderId}/items/${itemId}`);

export const processPayment = (orderId: string) =>
  api.post<Order>(`/orders/${orderId}/pay`).then((r) => r.data);

// ─── Reports ───────────────────────────────────────────────────────────────────────────────

export interface ReportSummary {
  today:     { revenue: number; orders: number };
  thisMonth: { revenue: number; orders: number };
  thisYear:  { revenue: number; orders: number };
  allTime:   { revenue: number; orders: number };
  daily:     Array<{ date: string;  revenue: number; orders: number }>;
  monthly:   Array<{ month: string; revenue: number; orders: number }>;
  byCategory: Array<{ category: string; revenue: number; orders: number }>;
}

export const getReportSummary = (params?: { days?: number; months?: number }) =>
  api.get<ReportSummary>('/reports/summary', { params }).then((r) => r.data);

// ─── Customer list ────────────────────────────────────────────────────────────────────

export interface CustomerSummary {
  id: string;
  name: string;
  phone: string;
  createdAt: string;
  totalRevenue: number;
  totalOrders: number;
  vehicleCount: number;
  lastVisit: string | null;
  vehicles: Array<{
    id: string;
    licensePlate: string;
    brand: string;
    model: string;
    orders: Array<{
      id: string;
      orderNumber: string;
      totalAmount: string;
      createdAt: string;
      status: string;
    }>;
  }>;
}

export interface CustomerListResponse {
  customers: CustomerSummary[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const getCustomerList = (params?: { q?: string; page?: number; pageSize?: number }) =>
  api.get<CustomerListResponse>('/customers', { params }).then((r) => r.data);
