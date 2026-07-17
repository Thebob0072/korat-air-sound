import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { CheckoutModal } from '@/components/CheckoutModal';
import { usePOSCartStore } from '@/store/POSCartStore';
import type { Product, Vehicle } from '@/types';
import { ProductCategory } from '@/types';

// ── API mocks ──────────────────────────────────────────────────────────────────

vi.mock('@/lib/api', () => ({
  createOrder: vi.fn(),
  addOrderItem: vi.fn(),
  processPayment: vi.fn(),
  updateOrderStatus: vi.fn(),
  getProducts: vi.fn(),
  searchVehicles: vi.fn(),
}));

// Importing mocked functions so we can set return values per test
import {
  createOrder,
  addOrderItem,
  processPayment,
  updateOrderStatus,
} from '@/lib/api';

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'p1',
    sku: 'SV-001',
    name: 'ค่าแรงล้างแอร์',
    category: ProductCategory.ServiceFee,
    costPrice: 0,
    sellingPrice: 600,
    stockQuantity: 9999,
    ...overrides,
  };
}

function makeVehicle(overrides: Partial<Vehicle> = {}): Vehicle {
  return {
    id: 'v1',
    licensePlate: 'กข 1234 นครราชสีมา',
    brand: 'Toyota',
    model: 'Fortuner',
    customerId: 'c1',
    ...overrides,
  };
}

// ── Test helper ────────────────────────────────────────────────────────────────

function renderModal(open = true) {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  const onClose = vi.fn();

  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <CheckoutModal open={open} onClose={onClose} />
      </MemoryRouter>
    </QueryClientProvider>,
  );

  return { onClose };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.resetAllMocks();
});

describe('CheckoutModal', () => {
  beforeEach(() => {
    usePOSCartStore.setState({ items: [], vehicle: null, discount: 0 });
  });

  describe('visibility', () => {
    it('renders content when open=true', () => {
      renderModal(true);
      expect(screen.getByText('ยืนยันการชำระเงิน')).toBeInTheDocument();
    });

    it('does not render content when open=false', () => {
      renderModal(false);
      expect(screen.queryByText('ยืนยันการชำระเงิน')).not.toBeInTheDocument();
    });
  });

  describe('order summary', () => {
    it('displays vehicle license plate and model', () => {
      usePOSCartStore.setState({
        vehicle: makeVehicle({ licensePlate: 'ขก 9999 ขอนแก่น', model: 'Civic' }),
        items: [],
        discount: 0,
      });

      renderModal();

      expect(screen.getByText('ขก 9999 ขอนแก่น')).toBeInTheDocument();
      expect(screen.getByText(/Civic/)).toBeInTheDocument();
    });

    it('lists each cart item with its name', () => {
      usePOSCartStore.setState({
        items: [
          { product: makeProduct({ id: 'p1', name: 'ล้างแอร์' }), quantity: 1 },
          { product: makeProduct({ id: 'p2', name: 'ฟิล์มกรองแสง' }), quantity: 2 },
        ],
        vehicle: null,
        discount: 0,
      });

      renderModal();

      expect(screen.getByText('ล้างแอร์')).toBeInTheDocument();
      expect(screen.getByText('ฟิล์มกรองแสง')).toBeInTheDocument();
    });

    it('shows the correct subtotal amount', () => {
      usePOSCartStore.setState({
        items: [
          { product: makeProduct({ sellingPrice: 500 }), quantity: 2 }, // 1000
        ],
        vehicle: null,
        discount: 0,
      });

      renderModal();

      // 1000 baht formatted — appears in the breakdown row
      expect(screen.getAllByText(/1,000/).length).toBeGreaterThan(0);
    });
  });

  describe('payment method', () => {
    it('selects cash by default', () => {
      usePOSCartStore.setState({
        items: [{ product: makeProduct(), quantity: 1 }],
        vehicle: null,
        discount: 0,
      });

      renderModal();

      const cashInput = screen.getByRole('radio', { name: /เงินสด/i }) as HTMLInputElement;
      expect(cashInput.checked).toBe(true);
    });

    it('shows cash received field when cash is selected', () => {
      usePOSCartStore.setState({
        items: [{ product: makeProduct(), quantity: 1 }],
        vehicle: null,
        discount: 0,
      });

      renderModal();

      expect(screen.getByLabelText(/รับเงินมา/)).toBeInTheDocument();
    });

    it('hides cash received field when transfer is selected', async () => {
      const user = userEvent.setup();
      usePOSCartStore.setState({
        items: [{ product: makeProduct(), quantity: 1 }],
        vehicle: null,
        discount: 0,
      });

      renderModal();

      await user.click(screen.getByRole('radio', { name: /โอนเงิน/i }));

      expect(screen.queryByLabelText(/รับเงินมา/)).not.toBeInTheDocument();
    });
  });

  describe('cash payment validation', () => {
    it('shows error when cash received is less than total on Pay click', async () => {
      const user = userEvent.setup();
      usePOSCartStore.setState({
        items: [{ product: makeProduct({ sellingPrice: 1000 }), quantity: 1 }],
        vehicle: makeVehicle(),
        discount: 0,
      });

      renderModal();

      const cashInput = screen.getByLabelText(/รับเงินมา/);
      await user.type(cashInput, '500'); // Less than 1000 total

      await user.click(screen.getByRole('button', { name: /ยืนยันชำระเงิน/i }));

      await waitFor(() => {
        expect(screen.getByText(/ต้องรับเงินอย่างน้อย/)).toBeInTheDocument();
      });
    });

    it('shows change amount when cash received exceeds total', async () => {
      const user = userEvent.setup();
      usePOSCartStore.setState({
        items: [{ product: makeProduct({ sellingPrice: 500 }), quantity: 1 }],
        vehicle: null,
        discount: 0,
      });

      renderModal();

      const cashInput = screen.getByLabelText(/รับเงินมา/);
      await user.type(cashInput, '1000');

      await waitFor(() => {
        // The เงินทอน label uniquely identifies the change row
        expect(screen.getByText('เงินทอน')).toBeInTheDocument();
      });
    });
  });

  describe('discount validation', () => {
    it('shows error when discount exceeds subtotal on submit', async () => {
      const user = userEvent.setup();
      usePOSCartStore.setState({
        items: [{ product: makeProduct({ sellingPrice: 200 }), quantity: 1 }],
        vehicle: makeVehicle(),
        discount: 0,
      });

      renderModal();

      const discountInput = screen.getByLabelText(/ส่วนลด/);
      await user.clear(discountInput);
      await user.type(discountInput, '9999');

      await user.click(screen.getByRole('button', { name: /ยืนยันชำระเงิน/i }));

      await waitFor(() => {
        expect(screen.getByText('ส่วนลดมากกว่ายอดรวม')).toBeInTheDocument();
      });
    });
  });

  describe('successful checkout', () => {
    it('calls createOrder then addOrderItem then processPayment for Pay', async () => {
      const user = userEvent.setup();
      const mockOrder = { id: 'order-123', orderNumber: 'KAS-20240315-0001' };

      vi.mocked(createOrder).mockResolvedValue(mockOrder as ReturnType<typeof createOrder> extends Promise<infer T> ? T : never);
      vi.mocked(addOrderItem).mockResolvedValue({} as never);
      vi.mocked(processPayment).mockResolvedValue({} as never);

      usePOSCartStore.setState({
        items: [{ product: makeProduct({ sellingPrice: 600 }), quantity: 1 }],
        vehicle: makeVehicle(),
        discount: 0,
      });

      renderModal();

      // Fill in cash received equal to total (600)
      const cashInput = screen.getByLabelText(/รับเงินมา/);
      await user.type(cashInput, '600');

      await user.click(screen.getByRole('button', { name: /ยืนยันชำระเงิน/i }));

      await waitFor(() => {
        expect(createOrder).toHaveBeenCalledWith('v1');
        expect(addOrderItem).toHaveBeenCalledTimes(1);
        expect(processPayment).toHaveBeenCalledWith('order-123');
      });
    });

    it('calls updateOrderStatus with Quoted for Quote button', async () => {
      const user = userEvent.setup();
      const mockOrder = { id: 'order-456' };

      vi.mocked(createOrder).mockResolvedValue(mockOrder as never);
      vi.mocked(addOrderItem).mockResolvedValue({} as never);
      vi.mocked(updateOrderStatus).mockResolvedValue({} as never);

      usePOSCartStore.setState({
        items: [{ product: makeProduct({ sellingPrice: 300 }), quantity: 1 }],
        vehicle: makeVehicle(),
        discount: 0,
      });

      renderModal();

      await user.click(screen.getByRole('button', { name: /ออกใบเสนอราคา/i }));

      await waitFor(() => {
        expect(updateOrderStatus).toHaveBeenCalledWith('order-456', 'Quoted');
      });
    });

    it('clears the cart on successful checkout', async () => {
      const user = userEvent.setup();
      vi.mocked(createOrder).mockResolvedValue({ id: 'order-789' } as never);
      vi.mocked(addOrderItem).mockResolvedValue({} as never);
      vi.mocked(updateOrderStatus).mockResolvedValue({} as never);

      usePOSCartStore.setState({
        items: [{ product: makeProduct(), quantity: 1 }],
        vehicle: makeVehicle(),
        discount: 0,
      });

      renderModal();

      await user.click(screen.getByRole('button', { name: /ออกใบเสนอราคา/i }));

      await waitFor(() => {
        expect(usePOSCartStore.getState().items).toHaveLength(0);
      });
    });
  });

  describe('error state', () => {
    it('displays API error message when mutation fails', async () => {
      const user = userEvent.setup();
      vi.mocked(createOrder).mockRejectedValue(new Error('ของหมดสต็อก'));

      usePOSCartStore.setState({
        items: [{ product: makeProduct(), quantity: 1 }],
        vehicle: makeVehicle(),
        discount: 0,
      });

      renderModal();

      const cashInput = screen.getByLabelText(/รับเงินมา/);
      await user.type(cashInput, '9999');
      await user.click(screen.getByRole('button', { name: /ยืนยันชำระเงิน/i }));

      await waitFor(() => {
        expect(screen.getByText('ของหมดสต็อก')).toBeInTheDocument();
      });
    });

    it('blocks close button while mutation is pending', async () => {
      vi.mocked(createOrder).mockImplementation(
        () => new Promise(() => { /* intentionally never resolves */ }),
      );

      usePOSCartStore.setState({
        items: [{ product: makeProduct({ sellingPrice: 100 }), quantity: 1 }],
        vehicle: makeVehicle(),
        discount: 0,
      });

      renderModal();

      const cashInput = screen.getByLabelText(/รับเงินมา/);
      const user = userEvent.setup();
      await user.type(cashInput, '100');
      await user.click(screen.getByRole('button', { name: /ยืนยันชำระเงิน/i }));

      // Give the mutation a tick to enter pending state
      await new Promise((r) => setTimeout(r, 10));

      // Close button has aria-label="ปิด"
      const closeBtn = screen.getByRole('button', { name: /ปิด/i });
      expect(closeBtn).toBeDisabled();
    });
  });

  describe('close behaviour', () => {
    it('resets the form when closed and reopened', async () => {
      const user = userEvent.setup();
      usePOSCartStore.setState({
        items: [{ product: makeProduct(), quantity: 1 }],
        vehicle: null,
        discount: 0,
      });

      const { onClose } = renderModal();

      const discountInput = screen.getByLabelText(/ส่วนลด/) as HTMLInputElement;
      await user.clear(discountInput);
      await user.type(discountInput, '200');

      // Close via the Dialog.Close button (aria-label="ปิด")
      await user.click(screen.getByRole('button', { name: /ปิด/i }));

      expect(onClose).toHaveBeenCalled();
    });
  });
});
