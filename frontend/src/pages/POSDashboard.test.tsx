import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import POSDashboard from '@/pages/POSDashboard';
import { usePOSCartStore } from '@/store/POSCartStore';
import type { Product, Vehicle } from '@/types';
import { ProductCategory } from '@/types';

// ── API mocks ──────────────────────────────────────────────────────────────────

vi.mock('@/lib/api', () => ({
  getProducts: vi.fn(),
  searchVehicles: vi.fn(),
  createProduct: vi.fn(),
  createOrder: vi.fn(),
  addOrderItem: vi.fn(),
  processPayment: vi.fn(),
  updateOrderStatus: vi.fn(),
  getOrders: vi.fn(),
  getOrder: vi.fn(),
}));

import { getProducts, searchVehicles } from '@/lib/api';

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'p1',
    sku: 'AC-001',
    name: 'น้ำยาแอร์ R134a',
    category: ProductCategory.AirCon,
    costPrice: 80,
    sellingPrice: 250,
    stockQuantity: 20,
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

function renderDashboard() {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <POSDashboard />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('POSDashboard', () => {
  beforeEach(() => {
    usePOSCartStore.setState({ items: [], vehicle: null, discount: 0 });
    vi.mocked(getProducts).mockResolvedValue([]);
    vi.mocked(searchVehicles).mockResolvedValue([]);
  });

  describe('search input', () => {
    it('auto-focuses the search input on mount', async () => {
      renderDashboard();

      const input = screen.getByPlaceholderText(/พิมพ์เลขทะเบียนรถ/);

      // useEffect fires after paint — wait for autofocus
      await waitFor(() => {
        expect(document.activeElement).toBe(input);
      });
    });

    it('calls searchVehicles with the typed query on Enter keypress', async () => {
      const user = userEvent.setup();
      vi.mocked(searchVehicles).mockResolvedValue([]);

      renderDashboard();

      const input = screen.getByPlaceholderText(/พิมพ์เลขทะเบียนรถ/);
      await user.type(input, 'กข 1234{enter}');

      expect(searchVehicles).toHaveBeenCalledWith('กข 1234');
    });

    it('shows the vehicle banner after a successful single-result search', async () => {
      const user = userEvent.setup();
      vi.mocked(searchVehicles).mockResolvedValue([makeVehicle()]);

      renderDashboard();

      const input = screen.getByPlaceholderText(/พิมพ์เลขทะเบียนรถ/);
      await user.type(input, 'กข{enter}');

      await waitFor(() => {
        // The plate appears in the left search banner AND the right bill panel
        expect(screen.getAllByText('กข 1234 นครราชสีมา').length).toBeGreaterThanOrEqual(1);
      });
    });

    it('shows an error when the search fails', async () => {
      const user = userEvent.setup();
      vi.mocked(searchVehicles).mockRejectedValue(new Error('Network error'));

      renderDashboard();

      const input = screen.getByPlaceholderText(/พิมพ์เลขทะเบียนรถ/);
      await user.type(input, 'ขก{enter}');

      await waitFor(() => {
        expect(screen.getByText(/เกิดข้อผิดพลาดในการค้นหา/)).toBeInTheDocument();
      });
    });
  });

  describe('category selection', () => {
    it('shows products for the selected category after clicking a category button', async () => {
      const user = userEvent.setup();
      vi.mocked(getProducts).mockResolvedValue([
        makeProduct({ id: 'p1', name: 'เครื่องเสียง Pioneer', category: ProductCategory.CentralLock }),
        makeProduct({ id: 'p2', name: 'ฟิล์มเลือดปลาม้า', category: ProductCategory.Tint }),
      ]);

      renderDashboard();

      // Wait for products query to complete
      await waitFor(() => expect(getProducts).toHaveBeenCalled());

      await user.click(screen.getByText('เครื่องเสียง'));

      await waitFor(() => {
        expect(screen.getByText('เครื่องเสียง Pioneer')).toBeInTheDocument();
        expect(screen.queryByText('ฟิล์มเลือดปลาม้า')).not.toBeInTheDocument();
      });
    });

    it('hides products when the active category is deselected', async () => {
      const user = userEvent.setup();
      vi.mocked(getProducts).mockResolvedValue([
        makeProduct({ name: 'เครื่องเสียง Pioneer', category: ProductCategory.CentralLock }),
      ]);

      renderDashboard();

      await user.click(screen.getByText('เครื่องเสียง')); // activate
      await user.click(screen.getByText('เครื่องเสียง')); // deactivate

      await waitFor(() => {
        expect(screen.queryByText('เครื่องเสียง Pioneer')).not.toBeInTheDocument();
      });
    });
  });

  describe('product card interaction', () => {
    it('adds a product to the Zustand cart store when clicked', async () => {
      const user = userEvent.setup();
      const product = makeProduct({ id: 'p-ac1', name: 'น้ำยาแอร์ R134a', sellingPrice: 250 });
      vi.mocked(getProducts).mockResolvedValue([product]);

      renderDashboard();

      await waitFor(() => expect(getProducts).toHaveBeenCalled());

      await user.click(screen.getByText('ระบบแอร์'));

      await waitFor(() => {
        expect(screen.getByText('น้ำยาแอร์ R134a')).toBeInTheDocument();
      });

      await user.click(screen.getByText('น้ำยาแอร์ R134a'));

      const { items } = usePOSCartStore.getState();
      expect(items).toHaveLength(1);
      expect(items[0].product.id).toBe('p-ac1');
      expect(items[0].quantity).toBe(1);
    });

    it('does not add an out-of-stock product', async () => {
      const user = userEvent.setup();
      const product = makeProduct({ id: 'p-oos', name: 'สินค้าหมด', stockQuantity: 0 });
      vi.mocked(getProducts).mockResolvedValue([product]);

      renderDashboard();

      await waitFor(() => expect(getProducts).toHaveBeenCalled());
      await user.click(screen.getByText('ระบบแอร์'));
      await waitFor(() => screen.getByText('สินค้าหมด'));

      await user.click(screen.getByText('สินค้าหมด'));

      expect(usePOSCartStore.getState().items).toHaveLength(0);
    });
  });

  describe('bill panel', () => {
    it('shows a vehicle banner when a vehicle is set in the store', () => {
      usePOSCartStore.setState({
        vehicle: makeVehicle({ licensePlate: 'กก 5555' }),
        items: [],
        discount: 0,
      });

      renderDashboard();

      // The license plate appears in the bill panel; getAllByText to handle multiple matches
      expect(screen.getAllByText('กก 5555').length).toBeGreaterThanOrEqual(1);
    });

    it('shows the correct item count and total in the bill footer', () => {
      usePOSCartStore.setState({
        vehicle: null,
        items: [{ product: makeProduct({ sellingPrice: 1000 }), quantity: 3 }],
        discount: 0,
      });

      renderDashboard();

      // 3 items * 1000 = 3000 — use getAllByText since it appears in item row AND footer
      expect(screen.getAllByText(/3,000/).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/3 ชิ้น/)).toBeInTheDocument();
    });

    it('disables Pay and Quote buttons when cart is empty', () => {
      usePOSCartStore.setState({ items: [], vehicle: null, discount: 0 });

      renderDashboard();

      expect(screen.getByText('ชำระเงิน').closest('button')).toBeDisabled();
      expect(screen.getByText('ออกใบเสนอราคา').closest('button')).toBeDisabled();
    });

    it('opens the CheckoutModal when Pay is clicked with items + vehicle', async () => {
      const user = userEvent.setup();
      usePOSCartStore.setState({
        vehicle: makeVehicle(),
        items: [{ product: makeProduct({ sellingPrice: 500 }), quantity: 1 }],
        discount: 0,
      });

      renderDashboard();

      await user.click(screen.getByText('ชำระเงิน'));

      await waitFor(() => {
        expect(screen.getByText('ยืนยันการชำระเงิน')).toBeInTheDocument();
      });
    });
  });

  describe('clear bill', () => {
    it('shows clear-bill button when cart has items', () => {
      usePOSCartStore.setState({
        vehicle: null,
        items: [{ product: makeProduct(), quantity: 1 }],
        discount: 0,
      });

      renderDashboard();

      expect(screen.getByText('ล้างบิล')).toBeInTheDocument();
    });

    it('shows confirmation dialog when clear-bill is clicked', async () => {
      const user = userEvent.setup();
      usePOSCartStore.setState({
        vehicle: null,
        items: [{ product: makeProduct(), quantity: 1 }],
        discount: 0,
      });

      renderDashboard();

      await user.click(screen.getByText('ล้างบิล'));

      await waitFor(() => {
        expect(screen.getByText('ล้างบิลทั้งหมด?')).toBeInTheDocument();
      });
    });

    it('clears the cart store when confirmed', async () => {
      const user = userEvent.setup();
      usePOSCartStore.setState({
        vehicle: null,
        items: [{ product: makeProduct(), quantity: 1 }],
        discount: 0,
      });

      renderDashboard();

      await user.click(screen.getByText('ล้างบิล'));
      await waitFor(() => screen.getByText('ล้างบิลทั้งหมด?'));

      // Find the confirm button in the AlertDialog
      const confirmBtn = screen.getAllByText('ล้างบิล').at(-1)!;
      await user.click(confirmBtn);

      await waitFor(() => {
        expect(usePOSCartStore.getState().items).toHaveLength(0);
      });
    });
  });
});
