import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'sonner';
import type { Order } from '@/types';

/**
 * Configurable via VITE_PRINT_SERVER_URL environment variable.
 *
 * Development (same machine) : leave unset — Vite proxy forwards /api to localhost:3001.
 * Production (iPad → server) : set VITE_PRINT_SERVER_URL=http://192.168.1.x:3001
 */
const PRINT_SERVER_BASE = import.meta.env.VITE_PRINT_SERVER_URL ?? '';

interface PrintReceiptPayload {
  order_number: string;
  customer_name: string;
  license_plate: string;
  items: Array<{ name: string; qty: number; price: number }>;
  total: number;
}

function buildPayload(order: Order): PrintReceiptPayload {
  return {
    order_number: order.orderNumber,
    customer_name: order.vehicle?.customer?.name ?? 'ไม่ระบุ',
    license_plate: order.vehicle?.licensePlate ?? '',
    items: (order.orderItems ?? []).map((item) => ({
      name: item.product?.name ?? '',
      qty: item.quantity,
      price: Number(item.unitPrice),
    })),
    total: Number(order.totalAmount),
  };
}

export function usePrinter() {
  const mutation = useMutation({
    mutationFn: (order: Order) =>
      axios
        .post<{ success: boolean }>(
          `${PRINT_SERVER_BASE}/api/hardware/print`,
          buildPayload(order),
        )
        .then((r) => r.data),
    onSuccess: () => {
      toast.success('ส่งงานพิมพ์สำเร็จ');
    },
    onError: (err: unknown) => {
      const detail =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        (err instanceof Error ? err.message : 'ไม่สามารถเชื่อมต่อเครื่องพิมพ์');
      toast.error(detail);
    },
  });

  return {
    print: (order: Order) => mutation.mutate(order),
    isPending: mutation.isPending,
    isError: mutation.isError,
  };
}
