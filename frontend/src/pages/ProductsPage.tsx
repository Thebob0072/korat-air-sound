import { useState, useRef, useEffect } from 'react';
import { Plus, Pencil, Trash2, Loader2, ChevronDown, RefreshCw } from 'lucide-react';
import { Pagination } from '@/components/ui/pagination';
import { usePagination } from '@/hooks/usePagination';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getProducts, createProduct, updateProduct, deleteProduct } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import type { Product, CreateProductDto } from '@/types';
import { DatePicker } from '@/components/ui/date-picker';
import { ProductCategory } from '@/types';

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  AirCon: 'แอร์',
  Tint: 'ฟิล์มกรองแสง',
  Glass: 'กระจก',
  CentralLock: 'เครื่องเสียง',
  ServiceFee: 'อื่นๆ',
};

const CATEGORY_COLORS: Record<string, string> = {
  AirCon: 'bg-sky-100 text-sky-700',
  Tint: 'bg-violet-100 text-violet-700',
  Glass: 'bg-teal-100 text-teal-700',
  CentralLock: 'bg-amber-100 text-amber-700',
  ServiceFee: 'bg-[#E5E5E3] text-[#4A4845]',
};

const FILTERS = [
  { value: '', label: 'ทั้งหมด' },
  ...Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value, label })),
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ProductsPage() {
  const queryClient = useQueryClient();
  const [activeCategory, setActiveCategory] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<{ id: string; name: string } | null>(
    null,
  );

  const { data: products = [], isPending } = useQuery({
    queryKey: ['products', activeCategory],
    queryFn: () => getProducts(activeCategory ? { category: activeCategory } : {}),
  });

  const { paged, page, setPage, pageSize, setPageSize, totalPages, total } = usePagination(products);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setProductToDelete(null);
    },
  });

  const openEdit = (product: Product) => {
    setEditingProduct(product);
    setShowForm(true);
  };

  const openCreate = () => {
    setEditingProduct(null);
    setShowForm(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-gray-900">สินค้าและอะไหล่</h1>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-[#3B3A36] hover:opacity-90 active:scale-[0.98] text-white text-sm font-medium px-5 py-2.5 rounded-2xl transition-all"
        >
          <Plus className="h-4 w-4" />
          เพิ่มสินค้า
        </button>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setActiveCategory(f.value)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
              activeCategory === f.value
                ? 'bg-[#3B3A36] text-white shadow-sm'
                : 'bg-white text-[#878681] hover:text-[#2D2D2D] hover:bg-[#F0EDE8]'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isPending ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-[#878681]" />
        </div>
      ) : (
        <div className="bg-white rounded-[20px] border border-[#E5E5E3] overflow-hidden shadow-[0_2px_12px_rgb(0,0,0,0.04)]">
          <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead>
              <tr className="border-b border-[#E5E5E3]">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-[#878681] uppercase tracking-wide">SKU</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-[#878681] uppercase tracking-wide">ชื่อสินค้า</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-[#878681] uppercase tracking-wide">หมวดหมู่</th>
                <th className="text-right px-5 py-3.5 text-xs font-semibold text-[#878681] uppercase tracking-wide">ราคาทุน</th>
                <th className="text-right px-5 py-3.5 text-xs font-semibold text-[#878681] uppercase tracking-wide">ราคาขาย</th>
                <th className="text-center px-5 py-3.5 text-xs font-semibold text-[#878681] uppercase tracking-wide">คงเหลือ</th>
                <th className="px-5 py-3.5 w-20" />
              </tr>
            </thead>
            <tbody>
              {paged.map((product) => (
                <tr key={product.id} className="border-b border-[#F0EDE8] last:border-0 hover:bg-[#F7F5F2] transition-colors">
                  <td className="px-5 py-4 font-mono text-xs text-[#878681]">{product.sku}</td>
                  <td className="px-5 py-4 font-medium text-[#2D2D2D]">{product.name}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_COLORS[product.category]}`}
                    >
                      {CATEGORY_LABELS[product.category]}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right text-[#878681] font-mono">
                    {formatCurrency(product.costPrice)}
                  </td>
                  <td className="px-5 py-4 text-right font-semibold font-mono text-[#2D2D2D]">
                    {formatCurrency(product.sellingPrice)}
                  </td>
                  <td className="px-5 py-4 text-center">
                    <span className={`font-semibold ${product.stockQuantity <= 5 ? 'text-red-500' : 'text-[#2D2D2D]'}`}>
                      {product.stockQuantity}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex gap-1 justify-end">
                      <button className="p-1.5 text-[#878681] hover:text-[#2D2D2D] hover:bg-[#E5E5E3] rounded-xl transition-all" onClick={() => openEdit(product)} title="แก้ไข">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button className="p-1.5 text-[#878681] hover:text-red-500 hover:bg-red-50 rounded-xl transition-all" onClick={() => setProductToDelete({ id: product.id, name: product.name })} title="ลบ">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {paged.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center text-[#878681] py-16 text-sm">
                    ยังไม่มีสินค้าในหมวดนี้
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
          <div className="px-4 pb-4">
            <Pagination
              total={total}
              page={page}
              pageSize={pageSize}
              totalPages={totalPages}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        </div>
      )}

      {showForm && (
        <ProductFormModal
          product={editingProduct}
          onClose={() => { setShowForm(false); setEditingProduct(null); }}
        />
      )}

      {/* ── Delete confirmation ──────────────────────────────────────── */}
      <AlertDialog
        open={productToDelete !== null}
        onOpenChange={(open) => { if (!open) setProductToDelete(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบสินค้า</AlertDialogTitle>
            <AlertDialogDescription>
              ต้องการลบ &ldquo;{productToDelete?.name}&rdquo; ออกจากระบบ?
              การกระทำนี้ไม่สามารถย้อนกลับได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (productToDelete) deleteMutation.mutate(productToDelete.id); }}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              ลบสินค้า
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Product Form Modal ────────────────────────────────────────────────────────
const TINT_BRANDS = ['ลามิน่า', 'ไฮคูล', 'ธรรมดา', '3M', 'อื่นๆ'];
const TINT_STD = ['ลามิน่า', 'ไฮคูล', 'ธรรมดา', '3M'];
const SKU_PREFIX: Record<string, string> = {
  AirCon: 'AC', Tint: 'FILM', Glass: 'GL', CentralLock: 'SND', ServiceFee: 'SVC',
};
function genSKU(cat: string) {
  return `${SKU_PREFIX[cat] ?? 'PROD'}-${String(Date.now()).slice(-5)}`;
}
interface ProductFormModalProps {
  product: Product | null;
  onClose: () => void;
}

function ProductFormModal({ product, onClose }: ProductFormModalProps) {
  const queryClient = useQueryClient();
  const [showCategoryDrop, setShowCategoryDrop] = useState(false);
  const [showBrandDrop, setShowBrandDrop] = useState(false);
  const categoryDropRef = useRef<HTMLDivElement>(null);
  const brandDropRef = useRef<HTMLDivElement>(null);

  const initBrand = product?.brand
    ? (TINT_STD.includes(product.brand) ? product.brand : 'อื่นๆ') : '';
  const initBrandCustom = product?.brand && !TINT_STD.includes(product.brand)
    ? product.brand : '';

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (categoryDropRef.current && !categoryDropRef.current.contains(e.target as Node))
        setShowCategoryDrop(false);
      if (brandDropRef.current && !brandDropRef.current.contains(e.target as Node))
        setShowBrandDrop(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const [form, setForm] = useState({
    sku: product?.sku ?? genSKU(product?.category ?? ProductCategory.ServiceFee),
    name: product?.name ?? '',
    category: product?.category ?? ProductCategory.ServiceFee,
    costPrice: product ? String(product.costPrice) : '0',
    sellingPrice: product ? String(product.sellingPrice) : '0',
    stockQuantity: product ? String(product.stockQuantity) : '0',
    supplier: product?.supplier ?? '',
    brand: initBrand,
    brandCustom: initBrandCustom,
    squareFeet: product?.squareFeet ? String(product.squareFeet) : '',
    modelYear: product?.modelYear ? String(product.modelYear) : '',
  });

  const [productDate, setProductDate] = useState<Date | undefined>(
    product?.productDate ? new Date(product.productDate) : new Date()
  );

  const isTint = form.category === ProductCategory.Tint;
  const isAudio = form.category === ProductCategory.CentralLock;

  const buildTintName = (brand: string, custom: string, sqft: string) => {
    const b = brand === 'อื่นๆ' ? custom : brand;
    return `ฟิล์มกรองแสง${b ? ` ${b}` : ''}${sqft ? ` ${sqft} ตร.ฟุต` : ''}`;
  };

  const saveMutation = useMutation({
    mutationFn: (payload: CreateProductDto) =>
      product ? updateProduct(product.id, payload) : createProduct(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      onClose();
    },
  });

  const set =
    (field: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveBrand = form.brand === 'อื่นๆ' ? form.brandCustom : form.brand;
    saveMutation.mutate({
      sku: form.sku,
      name: form.name,
      category: form.category as ProductCategory,
      costPrice: parseFloat(form.costPrice),
      sellingPrice: parseFloat(form.sellingPrice),
      stockQuantity: parseInt(form.stockQuantity, 10),
      supplier: form.supplier || undefined,
      brand: effectiveBrand || undefined,
      squareFeet: form.squareFeet ? parseFloat(form.squareFeet) : undefined,
      productDate: productDate ? productDate.toISOString() : undefined,
      modelYear: form.modelYear ? parseInt(form.modelYear, 10) : undefined,
    });
  };

  const error = saveMutation.error
    ? ((saveMutation.error as { response?: { data?: { error?: string } } })?.response?.data
        ?.error ?? 'เกิดข้อผิดพลาด')
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-[28px] shadow-[0_20px_60px_rgb(0,0,0,0.15)] w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#E5E5E3]">
          <h2 className="text-base font-bold text-[#2D2D2D]">{product ? 'แก้ไขสินค้า' : 'เพิ่มสินค้าใหม่'}</h2>
          <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-full text-[#878681] hover:text-[#2D2D2D] hover:bg-[#F0EDE8] transition-all">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4 max-h-[74vh] overflow-y-auto">
          {error && <div className="bg-red-50 text-red-600 text-sm rounded-xl px-3 py-2 border border-red-100">{error}</div>}

          {/* รหัสสินค้า (auto) + หมวดหมู่ */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#878681] mb-1.5">รหัสสินค้า <span className="font-normal">(อัตโนมัติ)</span></label>
              <div className="flex items-center gap-1.5 bg-[#F0EDE8] rounded-2xl px-3 py-2">
                <input
                  type="text"
                  value={form.sku}
                  onChange={(e) => setForm(p => ({ ...p, sku: e.target.value }))}
                  placeholder="AC-001"
                  className="flex-1 min-w-0 bg-transparent text-sm font-mono font-bold text-[#3B3A36] focus:outline-none placeholder:text-[#C0BEBA]"
                />
                <button type="button" onClick={() => setForm(p => ({ ...p, sku: genSKU(p.category) }))}
                  className="text-[#C0BEBA] hover:text-[#3B3A36] transition-colors shrink-0" title="สร้างใหม่">
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#2D2D2D] mb-1.5">หมวดหมู่ *</label>
              <div className="relative" ref={categoryDropRef}>
                <button type="button" onClick={() => setShowCategoryDrop((v) => !v)}
                  className="w-full bg-[#F0EDE8] rounded-2xl px-4 py-2.5 text-sm text-[#2D2D2D] flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-[#3B3A36]/15 transition-all">
                  <span>{CATEGORY_LABELS[form.category as ProductCategory]}</span>
                  <ChevronDown className={`h-4 w-4 text-[#878681] transition-transform duration-200 ${showCategoryDrop ? 'rotate-180' : ''}`} />
                </button>
                {showCategoryDrop && (
                  <div className="absolute top-full left-0 right-0 z-50 mt-1.5 bg-[#FDFCFA] rounded-2xl shadow-[0_8px_32px_rgb(0,0,0,0.12)] border border-[#E8E4DF] overflow-hidden">
                    {Object.entries(CATEGORY_LABELS).map(([v, l]) => (
                      <button key={v} type="button"
                        onClick={() => {
                          setForm(p => ({
                            ...p, category: v as ProductCategory, sku: genSKU(v),
                            ...(v === 'Tint' ? { name: buildTintName(p.brand, p.brandCustom, p.squareFeet) } : {}),
                          }));
                          setShowCategoryDrop(false);
                        }}
                        className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between border-b border-[#EAE7E2] last:border-0 transition-colors ${form.category === v ? 'bg-[#F0EDE8] font-medium' : 'hover:bg-[#F5F2EE]'}`}>
                        {l}
                        {form.category === v && <span className="text-[#5C6B62] text-xs font-bold">✓</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Tint-specific: ยี่ห้อ + ขนาด */}
          {isTint && (
            <div className="space-y-3 p-4 bg-[#F7F5F2] rounded-2xl">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-[#2D2D2D] mb-1.5">ยี่ห้อฟิล์ม</label>
                  <div className="relative" ref={brandDropRef}>
                    <button type="button" onClick={() => setShowBrandDrop((v) => !v)}
                      className="w-full bg-white rounded-xl px-4 py-2.5 text-sm flex items-center justify-between border border-[#E8E4DF] focus:outline-none focus:ring-2 focus:ring-[#3B3A36]/15">
                      <span className={form.brand ? 'text-[#2D2D2D]' : 'text-[#878681]'}>{form.brand || 'เลือกยี่ห้อ'}</span>
                      <ChevronDown className={`h-4 w-4 text-[#878681] transition-transform duration-200 ${showBrandDrop ? 'rotate-180' : ''}`} />
                    </button>
                    {showBrandDrop && (
                      <div className="absolute top-full left-0 right-0 z-50 mt-1.5 bg-[#FDFCFA] rounded-2xl shadow-[0_8px_32px_rgb(0,0,0,0.12)] border border-[#E8E4DF] overflow-hidden">
                        {TINT_BRANDS.map((b) => (
                          <button key={b} type="button"
                            onClick={() => {
                              setForm(p => ({ ...p, brand: b, name: buildTintName(b, p.brandCustom, p.squareFeet) }));
                              setShowBrandDrop(false);
                            }}
                            className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between border-b border-[#EAE7E2] last:border-0 transition-colors ${form.brand === b ? 'bg-[#F0EDE8] font-medium' : 'hover:bg-[#F5F2EE]'}`}>
                            {b}
                            {form.brand === b && <span className="text-[#5C6B62] text-xs font-bold">✓</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#2D2D2D] mb-1.5">ขนาด (ตร.ฟุต)</label>
                  <input type="number" min="0" step="0.5"
                    className="w-full bg-white border border-[#E8E4DF] rounded-xl px-4 py-2.5 text-sm text-[#2D2D2D] focus:outline-none focus:ring-2 focus:ring-[#3B3A36]/15"
                    value={form.squareFeet} placeholder="เช่น 10"
                    onChange={(e) => {
                      const sqft = e.target.value;
                      setForm(p => ({ ...p, squareFeet: sqft, name: buildTintName(p.brand, p.brandCustom, sqft) }));
                    }} />
                </div>
              </div>
              {form.brand === 'อื่นๆ' && (
                <div>
                  <label className="block text-sm font-semibold text-[#2D2D2D] mb-1.5">ระบุยี่ห้อ</label>
                  <input className="w-full bg-white border border-[#E8E4DF] rounded-xl px-4 py-2.5 text-sm text-[#2D2D2D] focus:outline-none focus:ring-2 focus:ring-[#3B3A36]/15"
                    value={form.brandCustom} placeholder="ชื่อยี่ห้อฟิล์ม"
                    onChange={(e) => {
                      const custom = e.target.value;
                      setForm(p => ({ ...p, brandCustom: custom, name: buildTintName(p.brand, custom, p.squareFeet) }));
                    }} />
                </div>
              )}
            </div>
          )}

          {/* เครื่องเสียง-specific: รุ่นปี */}
          {isAudio && (
            <div className="p-4 bg-[#F7F5F2] rounded-2xl">
              <label className="block text-sm font-semibold text-[#2D2D2D] mb-1.5">รุ่นปี (ปี ค.ศ.)</label>
              <input type="number" min="1900" max="2100" step="1"
                className="w-full bg-white border border-[#E8E4DF] rounded-xl px-4 py-2.5 text-sm text-[#2D2D2D] focus:outline-none focus:ring-2 focus:ring-[#3B3A36]/15"
                value={form.modelYear} placeholder="เช่น 2023"
                onChange={(e) => setForm(p => ({ ...p, modelYear: e.target.value }))} />
            </div>
          )}

          {/* ชื่อสินค้า */}
          <div>
            <label className="block text-sm font-semibold text-[#2D2D2D] mb-1.5">ชื่อสินค้า *</label>
            <input className="w-full bg-[#F0EDE8] border-0 rounded-2xl px-4 py-2.5 text-sm text-[#2D2D2D] focus:outline-none focus:ring-2 focus:ring-[#3B3A36]/15"
              value={form.name} onChange={set('name')} required placeholder="น้ำยาแอร์ R134a 400g" />
          </div>

          {/* ร้านที่นำเข้า */}
          <div>
            <label className="block text-sm font-semibold text-[#2D2D2D] mb-1.5">ร้านที่นำเข้า</label>
            <input className="w-full bg-[#F0EDE8] border-0 rounded-2xl px-4 py-2.5 text-sm text-[#2D2D2D] focus:outline-none focus:ring-2 focus:ring-[#3B3A36]/15"
              value={form.supplier} onChange={set('supplier')} placeholder="เช่น อะไหนเทรดดิ้ง" />
          </div>

          {/* ราคา + สต็อก */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-semibold text-[#2D2D2D] mb-1.5">ราคาทุน (฿)</label>
              <input type="number" min="0" step="0.01"
                className="w-full bg-[#F0EDE8] border-0 rounded-2xl px-4 py-2.5 text-sm text-[#2D2D2D] focus:outline-none focus:ring-2 focus:ring-[#3B3A36]/15"
                value={form.costPrice} onChange={set('costPrice')} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#2D2D2D] mb-1.5">ราคาขาย (฿)</label>
              <input type="number" min="0" step="0.01"
                className="w-full bg-[#F0EDE8] border-0 rounded-2xl px-4 py-2.5 text-sm text-[#2D2D2D] focus:outline-none focus:ring-2 focus:ring-[#3B3A36]/15"
                value={form.sellingPrice} onChange={set('sellingPrice')} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#2D2D2D] mb-1.5">สต็อก</label>
              <input type="number" min="0"
                className="w-full bg-[#F0EDE8] border-0 rounded-2xl px-4 py-2.5 text-sm text-[#2D2D2D] focus:outline-none focus:ring-2 focus:ring-[#3B3A36]/15"
                value={form.stockQuantity} onChange={set('stockQuantity')} />
            </div>
          </div>

          {/* วันที่รับสินค้า */}
          <div>
            <label className="block text-sm font-semibold text-[#2D2D2D] mb-1.5">วันที่รับสินค้า</label>
            <DatePicker
              value={productDate}
              onChange={setProductDate}
              placeholder="เลือกวันที่รับสินค้า"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 bg-[#F0EDE8] hover:bg-[#E5E5E3] rounded-2xl px-4 py-2.5 text-sm font-medium text-[#878681] hover:text-[#2D2D2D] transition-all active:scale-[0.98]">
              ยกเลิก
            </button>
            <button type="submit" disabled={saveMutation.isPending}
              className="flex-1 bg-[#3B3A36] hover:opacity-90 text-white rounded-2xl px-4 py-2.5 text-sm font-medium disabled:opacity-50 transition-all active:scale-[0.98]">
              {saveMutation.isPending ? 'กำลังบันทึก...' : 'บันทึก'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
