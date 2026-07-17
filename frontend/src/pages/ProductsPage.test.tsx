import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import ProductsPage from '@/pages/ProductsPage';
import { ProductCategory } from '@/types';
import type { Product } from '@/types';

// ── API mock ────────────────────────────────────────────────────────────────────

vi.mock('@/lib/api', () => ({
  getProducts: vi.fn(),
  createProduct: vi.fn(),
  updateProduct: vi.fn(),
  deleteProduct: vi.fn(),
}));

import { getProducts, createProduct, deleteProduct } from '@/lib/api';

// ── Fixtures ────────────────────────────────────────────────────────────────────

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'p1',
    sku: 'AC-001',
    name: 'น้ำยาแอร์ R134a',
    category: ProductCategory.AirCon,
    costPrice: 200,
    sellingPrice: 350,
    stockQuantity: 10,
    ...overrides,
  };
}

// ── Render helper ───────────────────────────────────────────────────────────────

function renderPage() {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <ProductsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return qc;
}

// ── Tests ───────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.resetAllMocks();
});

describe('ProductsPage', () => {
  it('shows spinner while query is pending', () => {
    vi.mocked(getProducts).mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders the product table after data resolves', async () => {
    vi.mocked(getProducts).mockResolvedValue([makeProduct()]);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('น้ำยาแอร์ R134a')).toBeInTheDocument();
    });
    expect(screen.getByText('AC-001')).toBeInTheDocument();
  });

  it('shows empty state when no products returned', async () => {
    vi.mocked(getProducts).mockResolvedValue([]);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('ยังไม่มีสินค้าในหมวดนี้')).toBeInTheDocument();
    });
  });

  it('opens create modal when เพิ่มสินค้า is clicked', async () => {
    const user = userEvent.setup();
    vi.mocked(getProducts).mockResolvedValue([]);
    renderPage();

    await waitFor(() => screen.getByRole('button', { name: /เพิ่มสินค้า/ }));
    await user.click(screen.getByRole('button', { name: /เพิ่มสินค้า/ }));

    expect(screen.getByText('เพิ่มสินค้าใหม่')).toBeInTheDocument();
  });

  it('opens edit modal with product data when pencil button clicked', async () => {
    const user = userEvent.setup();
    vi.mocked(getProducts).mockResolvedValue([makeProduct({ name: 'น้ำยาแอร์ R134a' })]);
    renderPage();

    await waitFor(() => screen.getByTitle('แก้ไข'));
    await user.click(screen.getByTitle('แก้ไข'));

    expect(screen.getByText('แก้ไขสินค้า')).toBeInTheDocument();
  });

  it('shows delete confirmation AlertDialog when trash button clicked', async () => {
    const user = userEvent.setup();
    vi.mocked(getProducts).mockResolvedValue([makeProduct({ name: 'น้ำยาแอร์ R134a' })]);
    renderPage();

    await waitFor(() => screen.getByTitle('ลบ'));
    await user.click(screen.getByTitle('ลบ'));

    expect(screen.getByText('ยืนยันการลบสินค้า')).toBeInTheDocument();
    // The dialog description contains the product name within the confirmation text
    expect(screen.getByText(/ต้องการลบ/)).toBeInTheDocument();
  });

  it('calls deleteProduct with the correct id on AlertDialog confirm', async () => {
    const user = userEvent.setup();
    vi.mocked(getProducts).mockResolvedValue([makeProduct({ id: 'p-delete-me' })]);
    vi.mocked(deleteProduct).mockResolvedValue(undefined as never);
    renderPage();

    await waitFor(() => screen.getByTitle('ลบ'));
    await user.click(screen.getByTitle('ลบ'));

    await user.click(screen.getByRole('button', { name: /ลบสินค้า/i }));

    await waitFor(() => {
      expect(deleteProduct).toHaveBeenCalledWith('p-delete-me');
    });
  });

  it('closes the AlertDialog when ยกเลิก is clicked', async () => {
    const user = userEvent.setup();
    vi.mocked(getProducts).mockResolvedValue([makeProduct()]);
    renderPage();

    await waitFor(() => screen.getByTitle('ลบ'));
    await user.click(screen.getByTitle('ลบ'));

    expect(screen.getByText('ยืนยันการลบสินค้า')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'ยกเลิก' }));

    await waitFor(() => {
      expect(screen.queryByText('ยืนยันการลบสินค้า')).not.toBeInTheDocument();
    });
    expect(deleteProduct).not.toHaveBeenCalled();
  });

  it('calls createProduct and closes modal on successful save', async () => {
    const user = userEvent.setup();
    vi.mocked(getProducts).mockResolvedValue([]);
    vi.mocked(createProduct).mockResolvedValue(makeProduct());
    renderPage();

    await waitFor(() => screen.getByRole('button', { name: /เพิ่มสินค้า/ }));
    await user.click(screen.getByRole('button', { name: /เพิ่มสินค้า/ }));

    // Fill in required fields
    await user.type(screen.getByPlaceholderText('AC-001'), 'NEW-001');
    await user.type(screen.getByPlaceholderText('น้ำยาแอร์ R134a 400g'), 'สินค้าใหม่');
    await user.click(screen.getByRole('button', { name: /บันทึก/ }));

    await waitFor(() => {
      expect(createProduct).toHaveBeenCalled();
    });

    // Modal should close after success
    await waitFor(() => {
      expect(screen.queryByText('เพิ่มสินค้าใหม่')).not.toBeInTheDocument();
    });
  });

  it('shows API error message when createProduct fails', async () => {
    const user = userEvent.setup();
    vi.mocked(getProducts).mockResolvedValue([]);
    vi.mocked(createProduct).mockRejectedValue({
      response: { data: { error: 'SKU ซ้ำ' } },
    });
    renderPage();

    await waitFor(() => screen.getByRole('button', { name: /เพิ่มสินค้า/ }));
    await user.click(screen.getByRole('button', { name: /เพิ่มสินค้า/ }));

    await user.type(screen.getByPlaceholderText('AC-001'), 'DUP-001');
    await user.type(screen.getByPlaceholderText('น้ำยาแอร์ R134a 400g'), 'ทดสอบ');
    await user.click(screen.getByRole('button', { name: /บันทึก/ }));

    await waitFor(() => {
      expect(screen.getByText('SKU ซ้ำ')).toBeInTheDocument();
    });
  });
});
