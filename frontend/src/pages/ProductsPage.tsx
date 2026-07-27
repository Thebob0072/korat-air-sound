import { useState, useRef, useEffect } from 'react';
import { Plus, Pencil, Trash2, Loader2, ChevronDown, RefreshCw, X } from 'lucide-react';
import { Pagination, PageSizeSelector } from '@/components/ui/pagination';
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
        <div className="flex items-center gap-3">
          <div className="h-7 w-1.5 bg-[#3B3A36] rounded-full shrink-0" />
          <h1 className="text-xl font-bold text-[#2D2D2D]">สินค้าและอะไหล่</h1>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-[#3B3A36] hover:opacity-90 active:scale-[0.98] text-white text-sm font-medium px-5 py-2.5 rounded-2xl transition-all"
        >
          <Plus className="h-4 w-4" />
          เพิ่มสินค้า
        </button>
      </div>

      {/* Category filter + count + size selector */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        {/* Filter pills — scrollable, no wrap */}
        <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex-1 sm:min-w-0 pb-0.5">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setActiveCategory(f.value)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 shrink-0 ${
                activeCategory === f.value
                  ? 'bg-[#3B3A36] text-white shadow-sm'
                  : 'bg-white text-[#878681] hover:text-[#2D2D2D] hover:bg-[#F0EDE8]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        {/* Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {!isPending && (
            <p className="text-sm text-[#878681]">
              <span className="font-semibold text-[#2D2D2D]">{total}</span> รายการ
            </p>
          )}
          <PageSizeSelector pageSize={pageSize} onPageSizeChange={setPageSize} />
        </div>
      </div>

      {isPending ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-[#878681]" />
        </div>
      ) : (
        <div className="bg-white rounded-[20px] border border-[#E5E5E3] overflow-hidden shadow-[0_2px_12px_rgb(0,0,0,0.04)]">
          <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead className="bg-[#FAF9F7]">
              <tr className="border-b border-[#E5E5E3]">
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-[#9B9894]">SKU</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-[#9B9894]">ชื่อสินค้า</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-[#9B9894]">หมวดหมู่</th>
                <th className="text-right px-5 py-3 text-[11px] font-semibold text-[#9B9894]">ราคาทุน</th>
                <th className="text-right px-5 py-3 text-[11px] font-semibold text-[#9B9894]">ราคาขาย</th>
                <th className="text-center px-5 py-3 text-[11px] font-semibold text-[#9B9894]">คงเหลือ</th>
                <th className="px-5 py-3 w-20" />
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
                    {product.isService ? (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">บริการ</span>
                    ) : (
                      <span className={`font-semibold ${Number(product.stockQuantity) <= 5 ? 'text-red-500' : 'text-[#2D2D2D]'}`}>
                        {product.stockQuantity}
                      </span>
                    )}
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
    isService: product?.isService ?? false,
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
      isService: form.isService,
    });
  };

  const error = saveMutation.error
    ? ((saveMutation.error as { response?: { data?: { error?: string } } })?.response?.data
        ?.error ?? 'เกิดข้อผิดพลาด')
    : null;

  const cost = parseFloat(form.costPrice) || 0;
  const selling = parseFloat(form.sellingPrice) || 0;
  const margin = selling - cost;
  const marginPct = cost > 0 ? (margin / cost) * 100 : 0;
  const showMargin = cost > 0 && selling > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-[28px] shadow-[0_24px_64px_rgb(0,0,0,0.18)] w-full max-w-[480px] flex flex-col max-h-[92vh]">

        {/* ── Header ── */}
        <div className="px-6 pt-6 pb-4 shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold text-[#C0BEBA] uppercase tracking-widest mb-1">
                {product ? 'แก้ไขสินค้า' : 'เพิ่มสินค้าใหม่'}
              </p>
              <h2 className="text-lg font-bold text-[#2D2D2D] leading-snug truncate">
                {form.name || 'สินค้าใหม่'}
              </h2>
              <div className="flex items-center gap-2 mt-1.5">
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${CATEGORY_COLORS[form.category as ProductCategory]}`}>
                  {CATEGORY_LABELS[form.category as ProductCategory]}
                </span>
                <span className="text-[11px] font-mono text-[#C0BEBA]">{form.sku}</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="h-8 w-8 flex items-center justify-center rounded-full text-[#878681] hover:text-[#2D2D2D] hover:bg-[#F0EDE8] transition-all shrink-0 mt-0.5"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="h-px bg-[#F0EDE8] shrink-0" />

        {/* ── Scrollable form body ── */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5 overflow-y-auto flex-1">

          {error && (
            <div className="bg-red-50 text-red-600 text-sm rounded-xl px-3.5 py-2.5 border border-red-100">
              {error}
            </div>
          )}

          {/* Section 1: รหัสและหมวดหมู่ */}
          <div className="space-y-3">
            <p className="text-[10px] font-semibold text-[#C0BEBA] uppercase tracking-widest">รหัสและหมวดหมู่</p>
            <div className="grid grid-cols-2 gap-3">
              {/* SKU */}
              <div>
                <label className="block text-xs font-medium text-[#878681] mb-1.5">รหัสสินค้า</label>
                <div className="flex items-center gap-1.5 bg-[#F7F5F2] rounded-xl px-3 h-10">
                  <input
                    type="text"
                    value={form.sku}
                    onChange={(e) => setForm(p => ({ ...p, sku: e.target.value }))}
                    placeholder="AC-001"
                    className="flex-1 min-w-0 bg-transparent text-sm font-mono font-bold text-[#3B3A36] focus:outline-none placeholder:text-[#C0BEBA]"
                  />
                  <button
                    type="button"
                    onClick={() => setForm(p => ({ ...p, sku: genSKU(p.category) }))}
                    className="text-[#C0BEBA] hover:text-[#3B3A36] transition-colors shrink-0"
                    title="สร้างใหม่"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              {/* Category */}
              <div>
                <label className="block text-xs font-medium text-[#878681] mb-1.5">หมวดหมู่ *</label>
                <div className="relative" ref={categoryDropRef}>
                  <button
                    type="button"
                    onClick={() => setShowCategoryDrop((v) => !v)}
                    className="w-full h-10 bg-[#F7F5F2] rounded-xl px-3 text-sm text-[#2D2D2D] flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-[#3B3A36]/15 transition-all"
                  >
                    <span>{CATEGORY_LABELS[form.category as ProductCategory]}</span>
                    <ChevronDown className={`h-4 w-4 text-[#878681] transition-transform duration-200 shrink-0 ${showCategoryDrop ? 'rotate-180' : ''}`} />
                  </button>
                  {showCategoryDrop && (
                    <div className="absolute top-full left-0 right-0 z-50 mt-1.5 bg-white rounded-2xl shadow-[0_8px_32px_rgb(0,0,0,0.14)] border border-[#E8E4DF] overflow-hidden">
                      {Object.entries(CATEGORY_LABELS).map(([v, l]) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => {
                            setForm(p => ({
                              ...p, category: v as ProductCategory, sku: genSKU(v),
                              ...(v === 'Tint' ? { name: buildTintName(p.brand, p.brandCustom, p.squareFeet) } : {}),
                            }));
                            setShowCategoryDrop(false);
                          }}
                          className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between border-b border-[#F0EDE8] last:border-0 transition-colors ${form.category === v ? 'bg-[#F0EDE8] font-medium text-[#2D2D2D]' : 'text-[#2D2D2D] hover:bg-[#F7F5F2]'}`}
                        >
                          {l}
                          {form.category === v && <span className="text-[#3B3A36] text-xs font-bold">✓</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="h-px bg-[#F0EDE8]" />

          {/* Section 2: รายละเอียดสินค้า */}
          <div className="space-y-3">
            <p className="text-[10px] font-semibold text-[#C0BEBA] uppercase tracking-widest">รายละเอียดสินค้า</p>

            {/* Tint-specific fields come before name since name auto-builds */}
            {isTint && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#878681] mb-1.5">ยี่ห้อฟิล์ม</label>
                    <div className="relative" ref={brandDropRef}>
                      <button
                        type="button"
                        onClick={() => setShowBrandDrop((v) => !v)}
                        className="w-full h-10 bg-[#F7F5F2] rounded-xl px-3 text-sm flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-[#3B3A36]/15 transition-all"
                      >
                        <span className={form.brand ? 'text-[#2D2D2D]' : 'text-[#C0BEBA]'}>{form.brand || 'เลือกยี่ห้อ'}</span>
                        <ChevronDown className={`h-4 w-4 text-[#878681] transition-transform shrink-0 ${showBrandDrop ? 'rotate-180' : ''}`} />
                      </button>
                      {showBrandDrop && (
                        <div className="absolute top-full left-0 right-0 z-50 mt-1.5 bg-white rounded-2xl shadow-[0_8px_32px_rgb(0,0,0,0.14)] border border-[#E8E4DF] overflow-hidden">
                          {TINT_BRANDS.map((b) => (
                            <button
                              key={b}
                              type="button"
                              onClick={() => {
                                setForm(p => ({ ...p, brand: b, name: buildTintName(b, p.brandCustom, p.squareFeet) }));
                                setShowBrandDrop(false);
                              }}
                              className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between border-b border-[#F0EDE8] last:border-0 transition-colors ${form.brand === b ? 'bg-[#F0EDE8] font-medium text-[#2D2D2D]' : 'text-[#2D2D2D] hover:bg-[#F7F5F2]'}`}
                            >
                              {b}
                              {form.brand === b && <span className="text-[#3B3A36] text-xs font-bold">✓</span>}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#878681] mb-1.5">ขนาด (ตร.ฟุต)</label>
                    <input
                      type="number" min="0" step="0.5"
                      className="w-full h-10 bg-[#F7F5F2] rounded-xl px-4 text-sm text-[#2D2D2D] focus:outline-none focus:ring-2 focus:ring-[#3B3A36]/15 placeholder:text-[#C0BEBA]"
                      value={form.squareFeet}
                      placeholder="เช่น 10"
                      onChange={(e) => {
                        const sqft = e.target.value;
                        setForm(p => ({ ...p, squareFeet: sqft, name: buildTintName(p.brand, p.brandCustom, sqft) }));
                      }}
                    />
                  </div>
                </div>
                {form.brand === 'อื่นๆ' && (
                  <div>
                    <label className="block text-xs font-medium text-[#878681] mb-1.5">ระบุยี่ห้อ</label>
                    <input
                      className="w-full h-10 bg-[#F7F5F2] rounded-xl px-4 text-sm text-[#2D2D2D] focus:outline-none focus:ring-2 focus:ring-[#3B3A36]/15 placeholder:text-[#C0BEBA]"
                      value={form.brandCustom}
                      placeholder="ชื่อยี่ห้อฟิล์ม"
                      onChange={(e) => {
                        const custom = e.target.value;
                        setForm(p => ({ ...p, brandCustom: custom, name: buildTintName(p.brand, custom, p.squareFeet) }));
                      }}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Audio-specific: model year */}
            {isAudio && (
              <div>
                <label className="block text-xs font-medium text-[#878681] mb-1.5">รุ่นปี (ค.ศ.)</label>
                <input
                  type="number" min="1900" max="2100" step="1"
                  className="w-full h-10 bg-[#F7F5F2] rounded-xl px-4 text-sm text-[#2D2D2D] focus:outline-none focus:ring-2 focus:ring-[#3B3A36]/15 placeholder:text-[#C0BEBA]"
                  value={form.modelYear}
                  placeholder="เช่น 2023"
                  onChange={(e) => setForm(p => ({ ...p, modelYear: e.target.value }))}
                />
              </div>
            )}

            {/* Product name */}
            <div>
              <label className="block text-xs font-medium text-[#878681] mb-1.5">ชื่อสินค้า *</label>
              <input
                className="w-full h-10 bg-[#F7F5F2] rounded-xl px-4 text-sm text-[#2D2D2D] focus:outline-none focus:ring-2 focus:ring-[#3B3A36]/15 placeholder:text-[#C0BEBA]"
                value={form.name}
                onChange={set('name')}
                required
                placeholder="น้ำยาแอร์ R134a 400g"
              />
            </div>

            {/* Supplier */}
            <div>
              <label className="block text-xs font-medium text-[#878681] mb-1.5">ร้านที่นำเข้า</label>
              <input
                className="w-full h-10 bg-[#F7F5F2] rounded-xl px-4 text-sm text-[#2D2D2D] focus:outline-none focus:ring-2 focus:ring-[#3B3A36]/15 placeholder:text-[#C0BEBA]"
                value={form.supplier}
                onChange={set('supplier')}
                placeholder="เช่น อะไหนเทรดดิ้ง"
              />
            </div>
          </div>

          <div className="h-px bg-[#F0EDE8]" />

          {/* Section 3: ประเภทและราคา */}
          <div className="space-y-3">
            <p className="text-[10px] font-semibold text-[#C0BEBA] uppercase tracking-widest">ประเภทและราคา</p>

            {/* Service toggle */}
            <div className="flex items-center justify-between bg-[#F7F5F2] rounded-xl px-4 py-3 gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-[#2D2D2D]">รายการบริการ</p>
                <p className="text-xs text-[#9B9894] mt-0.5">ไม่นับสต็อก เช่น โปรแกรมล้างแอร์, ค่าแรง</p>
              </div>
              <button
                type="button"
                onClick={() => setForm(p => ({ ...p, isService: !p.isService }))}
                className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                  form.isService ? 'bg-[#3B3A36]' : 'bg-[#D8D5D0]'
                }`}
              >
                <span className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                  form.isService ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>

            {/* Price inputs */}
            <div className={`grid gap-3 ${form.isService ? 'grid-cols-2' : 'grid-cols-3'}`}>
              <div>
                <label className="block text-xs font-medium text-[#878681] mb-1.5">ราคาทุน (฿)</label>
                <input
                  type="number" min="0" step="0.01"
                  className="w-full h-10 bg-[#F7F5F2] rounded-xl px-4 text-sm text-[#2D2D2D] font-mono focus:outline-none focus:ring-2 focus:ring-[#3B3A36]/15"
                  value={form.costPrice}
                  onChange={set('costPrice')}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#878681] mb-1.5">ราคาขาย (฿)</label>
                <input
                  type="number" min="0" step="0.01"
                  className="w-full h-10 bg-[#F7F5F2] rounded-xl px-4 text-sm text-[#2D2D2D] font-mono focus:outline-none focus:ring-2 focus:ring-[#3B3A36]/15"
                  value={form.sellingPrice}
                  onChange={set('sellingPrice')}
                />
              </div>
              {!form.isService && (
                <div>
                  <label className="block text-xs font-medium text-[#878681] mb-1.5">สต็อก (ชิ้น)</label>
                  <input
                    type="number" min="0"
                    className="w-full h-10 bg-[#F7F5F2] rounded-xl px-4 text-sm text-[#2D2D2D] font-mono focus:outline-none focus:ring-2 focus:ring-[#3B3A36]/15"
                    value={form.stockQuantity}
                    onChange={set('stockQuantity')}
                  />
                </div>
              )}
            </div>

            {/* Margin indicator */}
            {showMargin && (
              <div className="flex items-center gap-2 px-1">
                <span className="text-xs text-[#9B9894]">กำไรต่อชิ้น</span>
                <span className={`text-xs font-mono font-semibold ${margin >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {margin >= 0 ? '+' : ''}{margin.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ฿
                </span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${margin >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                  {margin >= 0 ? '+' : ''}{marginPct.toFixed(1)}%
                </span>
              </div>
            )}
          </div>

          <div className="h-px bg-[#F0EDE8]" />

          {/* Section 4: ข้อมูลเพิ่มเติม */}
          <div className="space-y-3">
            <p className="text-[10px] font-semibold text-[#C0BEBA] uppercase tracking-widest">ข้อมูลเพิ่มเติม</p>
            <div>
              <label className="block text-xs font-medium text-[#878681] mb-1.5">วันที่รับสินค้า</label>
              <DatePicker
                value={productDate}
                onChange={setProductDate}
                placeholder="เลือกวันที่รับสินค้า"
              />
            </div>
          </div>

          {/* Footer actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-11 bg-[#F0EDE8] hover:bg-[#E8E4DF] rounded-2xl text-sm font-medium text-[#878681] hover:text-[#2D2D2D] transition-all active:scale-[0.98]"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="flex-1 h-11 bg-[#3B3A36] hover:opacity-90 text-white rounded-2xl text-sm font-semibold disabled:opacity-50 transition-all active:scale-[0.98]"
            >
              {saveMutation.isPending ? 'กำลังบันทึก...' : product ? 'บันทึกการแก้ไข' : 'เพิ่มสินค้า'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
