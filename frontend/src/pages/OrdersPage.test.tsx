import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import OrdersPage from '@/pages/OrdersPage';
import type { Order } from '@/types';

// ── API mock ────────────────────────────────────────────────────────────────────

vi.mock('@/lib/api', () => ({
  getOrders: vi.fn(),
}));

import { getOrders } from '@/lib/api';

// ── Fixtures ────────────────────────────────────────────────────────────────────

function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 'o1',
    orderNumber: 'ORD-20260716-001',
    vehicleId: 'v1',
    vehicle: {
      id: 'v1',
      licensePlate: 'กข 1234 นครราชสีมา',
      brand: 'Toyota',
      model: 'Fortuner',
      customerId: 'c1',
      customer: {
        id: 'c1',
        name: 'สมชาย ใจดี',
        phone: '0812345678',
        createdAt: new Date().toISOString(),
      },
    },
    status: 'Draft',
    totalAmount: 1500,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    orderItems: [],
    ...overrides,
  };
}

// ── Render helper ───────────────────────────────────────────────────────────────

function renderPage() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <OrdersPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return qc;
}

// ── Tests ───────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.resetAllMocks();
});

describe('OrdersPage', () => {
  it('shows spinner while query is pending', () => {
    vi.mocked(getOrders).mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders the order table after data resolves', async () => {
    vi.mocked(getOrders).mockResolvedValue([makeOrder()]);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('ORD-20260716-001')).toBeInTheDocument();
    });
    expect(screen.getByText('กข 1234 นครราชสีมา')).toBeInTheDocument();
    expect(screen.getByText('สมชาย ใจดี')).toBeInTheDocument();
  });

  it('shows empty-state row when no orders returned', async () => {
    vi.mocked(getOrders).mockResolvedValue([]);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('ไม่มีออเดอร์ในหมวดนี้')).toBeInTheDocument();
    });
  });

  it('shows error message when query fails', async () => {
    vi.mocked(getOrders).mockRejectedValue(new Error('network'));
    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/โหลดข้อมูลไม่สำเร็จ/)).toBeInTheDocument();
    });
  });

  it('calls getOrders with status filter on filter-tab click', async () => {
    const user = userEvent.setup();
    vi.mocked(getOrders).mockResolvedValue([]);
    renderPage();

    await waitFor(() => expect(getOrders).toHaveBeenCalledTimes(1));

    await user.click(screen.getByRole('button', { name: 'ชำระแล้ว' }));

    await waitFor(() => {
      expect(getOrders).toHaveBeenLastCalledWith({ status: 'Paid' });
    });
  });

  it('calls getOrders without filter when ทั้งหมด is clicked', async () => {
    const user = userEvent.setup();
    vi.mocked(getOrders).mockResolvedValue([]);
    renderPage();

    // Switch to a filtered tab first
    await user.click(screen.getByRole('button', { name: 'แบบร่าง' }));
    await waitFor(() => expect(getOrders).toHaveBeenLastCalledWith({ status: 'Draft' }));

    // Then reset to ทั้งหมด
    await user.click(screen.getByRole('button', { name: 'ทั้งหมด' }));
    await waitFor(() => {
      expect(getOrders).toHaveBeenLastCalledWith({});
    });
  });

  it('renders Paid badge for a paid order', async () => {
    vi.mocked(getOrders).mockResolvedValue([makeOrder({ status: 'Paid' })]);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('ชำระแล้ว')).toBeInTheDocument();
    });
  });
});
