import * as Dialog from '@radix-ui/react-dialog';
import { useState, useMemo } from 'react';
import { X, Volume2, Search, Plus, ArrowLeft, RefreshCw, Wrench } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usePOSCartStore } from '@/store/POSCartStore';
import { getProducts, createProduct } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { ProductCategory } from '@/types';
import type { Product } from '@/types';

interface SoundModalProps {
  open: boolean;
  onClose: () => void;
}

function genSKU() {
  return `SND-${String(Date.now()).slice(-5)}`;
}

export function SoundModal({ open, onClose }: SoundModalProps) {
  const addItem = usePOSCartStore((s) => s.addItem);
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [mode, setMode] = useState<'list' | 'create'>('list');
  const [technicianName, setTechnicianName] = useState('');
  // create-form fields
  const [newName, setNewName] = useState('');
  const [newSku, setNewSku] = useState(genSKU());
  const [newBrand, setNewBrand] = useState('');
  const [newModelYear, setNewModelYear] = useState('');
  const [newCost, setNewCost] = useState('');
  const [newSell, setNewSell] = useState('');
  const [newStock, setNewStock] = useState('1');
  const [createError, setCreateError] = useState('');

  const { data: products = [], isPending } = useQuery<Product[]>({
    queryKey: ['products', 'Sound'],
    queryFn: () => getProducts({ category: 'Sound' }),
    enabled: open,
  });

  const createMutation = useMutation({
    mutationFn: createProduct,
    onSuccess: (product) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      addItem(product, 1, technicianName || undefined);
      handleClose();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setCreateError(msg ?? 'เกิดข้อผิดพลาด กรุณาลองใหม่');
    },
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.sku ?? '').toLowerCase().includes(q) ||
        (p.brand ?? '').toLowerCase().includes(q),
    );
  }, [products, search]);

  const reset = () => {
    setSearch('');
    setMode('list');
    setTechnicianName('');
    setNewName('');
    setNewSku(genSKU());
    setNewBrand('');
    setNewModelYear('');
    setNewCost('');
    setNewSell('');
    setNewStock('1');
    setCreateError('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const goCreate = () => {
    setNewName(search.trim());
    setNewSku(genSKU());
    setCreateError('');
    setMode('create');
  };

  const handleCreate = () => {
    if (!newName.trim()) { setCreateError('กรุณาระบุชื่อสินค้า'); return; }
    const sell = parseFloat(newSell);
    if (!newSell || isNaN(sell) || sell <= 0) { setCreateError('กรุณาระบุราคาขาย'); return; }
    const year = newModelYear ? parseInt(newModelYear) : undefined;
    if (newModelYear && (isNaN(year!) || year! < 1900 || year! > 2100)) {
      setCreateError('ปีไม่ถูกต้อง'); return;
    }
    setCreateError('');
    createMutation.mutate({
      sku: newSku,
      name: newName.trim(),
      category: ProductCategory.Sound,
      brand: newBrand.trim() || undefined,
      modelYear: year,
      costPrice: parseFloat(newCost) || 0,
      sellingPrice: sell,
      stockQuantity: parseInt(newStock) || 1,
    });
  };

  return (
    <Dialog.Root open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content
          aria-describedby="sound-desc"
          className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 bg-[#FDFCFA] rounded-[28px] shadow-[0_24px_80px_rgb(0,0,0,0.18)] border border-[#E8E4DF] focus:outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-[#E8E4DF]">
            <div className="flex items-center gap-3">
              {mode === 'create' && (
                <button type="button" onClick={() => setMode('list')}
                  className="h-8 w-8 rounded-full flex items-center justify-center text-[#878681] hover:text-[#2D2D2D] hover:bg-[#F0EDE8] transition-all mr-0.5">
                  <ArrowLeft className="h-4 w-4" />
                </button>
              )}
              <div className="h-9 w-9 rounded-xl bg-[#E8E4DF] flex items-center justify-center">
                <Volume2 className="h-4 w-4 text-[#5C6B62]" />
              </div>
              <div>
                <Dialog.Title className="text-base font-bold text-[#2D2D2D] leading-none">
                  {mode === 'create' ? 'สร้างสินค้าใหม่' : 'เพิ่มสินค้าเครื่องเสียง'}
                </Dialog.Title>
                <p id="sound-desc" className="text-xs text-[#878681] mt-0.5">
                  {mode === 'create' ? 'กรอกข้อมูลสินค้าและเพิ่มในบิล' : 'เลือกสินค้าหรือสร้างใหม่'}
                </p>
              </div>
            </div>
            <Dialog.Close aria-label="ปิด" onClick={handleClose}
              className="h-8 w-8 rounded-full flex items-center justify-center text-[#878681] hover:text-[#2D2D2D] hover:bg-[#F0EDE8] transition-all">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>

          {/* ── LIST MODE ── */}
          {mode === 'list' && (
            <>
              <div className="px-6 pt-4 pb-2">
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#C0BEBA] pointer-events-none" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="กรองสินค้าเครื่องเสียง…"
                    className="w-full bg-[#F0EDE8] border-0 rounded-2xl pl-10 pr-4 py-2.5 text-sm text-[#2D2D2D] placeholder:text-[#C0BEBA] focus:outline-none focus:ring-2 focus:ring-[#3B3A36]/15 transition-all"
                    autoFocus
                    autoComplete="off"
                  />
                </div>
              </div>

              <div className="px-6 pb-2 max-h-72 overflow-y-auto space-y-1.5">
                {isPending ? (
                  <div className="py-8 text-center text-sm text-[#878681]">กำลังโหลด…</div>
                ) : filtered.length > 0 ? (
                  filtered.map((product) => {
                    const outOfStock = product.stockQuantity <= 0;
                    return (
                      <button
                        key={product.id}
                        type="button"
                        disabled={outOfStock}
                        onClick={() => { addItem(product, 1, technicianName || undefined); handleClose(); }}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-left transition-all ${
                          outOfStock
                            ? 'opacity-40 cursor-not-allowed bg-[#F0EDE8]'
                            : 'bg-[#F0EDE8] hover:bg-[#EAE7E2] active:scale-[0.98]'
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[#2D2D2D] truncate">{product.name}</p>
                          <p className="text-xs text-[#878681] font-mono mt-0.5">
                            {product.sku}
                            {product.brand && <span className="ml-2 not-italic font-sans">{product.brand}</span>}
                            {product.modelYear && <span className="ml-1">ปี{product.modelYear}</span>}
                          </p>
                        </div>
                        <div className="shrink-0 ml-3 text-right">
                          <p className="text-sm font-bold text-[#3B3A36]">{formatCurrency(Number(product.sellingPrice))}</p>
                          {outOfStock ? (
                            <p className="text-xs text-red-400">หมด</p>
                          ) : (
                            <p className="text-xs text-[#878681]">คงเหลือ {product.stockQuantity}</p>
                          )}
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="py-6 text-center">
                    <p className="text-sm text-[#878681]">
                      {search.trim()
                        ? <>ไม่พบ &ldquo;{search}&rdquo;</>
                        : 'ยังไม่มีสินค้าในหมวดเครื่องเสียง'}
                    </p>
                  </div>
                )}
              </div>

              {/* Technician + create new */}
              <div className="px-6 pb-6 pt-2 space-y-2">
                <div className="flex items-center gap-2 bg-[#F7F5F2] rounded-2xl px-3 py-2">
                  <Wrench className="h-3.5 w-3.5 text-[#C0BEBA] shrink-0" />
                  <input
                    type="text"
                    value={technicianName}
                    onChange={(e) => setTechnicianName(e.target.value)}
                    placeholder="ช่างผู้รับผิดชอบ (ไม่บังคับ)"
                    className="flex-1 bg-transparent text-sm text-[#2D2D2D] placeholder:text-[#C0BEBA] focus:outline-none"
                  />
                </div>
                <button type="button" onClick={goCreate}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold text-[#5C6B62] border border-dashed border-[#C0BEBA] hover:border-[#5C6B62] hover:bg-[#F0EDE8] transition-all">
                  <Plus className="h-4 w-4" />
                  {search.trim() ? `สร้าง "${search.trim()}" เป็นสินค้าใหม่` : 'สร้างสินค้าใหม่'}
                </button>
              </div>
            </>
          )}

          {/* ── CREATE MODE ── */}
          {mode === 'create' && (
            <>
              <div className="px-6 py-5 space-y-4 max-h-[60vh] overflow-y-auto">
                {createError && (
                  <div className="bg-red-50 text-red-600 text-sm rounded-xl px-3 py-2 border border-red-100">{createError}</div>
                )}

                {/* SKU */}
                <div>
                  <label className="block text-xs font-semibold text-[#878681] mb-1.5">รหัสสินค้า</label>
                  <div className="flex items-center gap-1.5 bg-[#F0EDE8] rounded-2xl px-3 py-2">
                    <input
                      type="text"
                      value={newSku}
                      onChange={(e) => setNewSku(e.target.value)}
                      className="flex-1 min-w-0 bg-transparent text-sm font-mono font-bold text-[#3B3A36] focus:outline-none"
                    />
                    <button type="button" onClick={() => setNewSku(genSKU())}
                      className="text-[#C0BEBA] hover:text-[#3B3A36] transition-colors shrink-0" title="สร้างใหม่">
                      <RefreshCw className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* ชื่อสินค้า */}
                <div>
                  <label htmlFor="snd-name" className="block text-sm font-semibold text-[#2D2D2D] mb-1.5">ชื่อสินค้า *</label>
                  <input id="snd-name" type="text" value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="เช่น JBL Stadium 600F"
                    className="w-full bg-[#F0EDE8] border-0 rounded-2xl px-4 py-2.5 text-sm text-[#2D2D2D] placeholder:text-[#C0BEBA] focus:outline-none focus:ring-2 focus:ring-[#3B3A36]/15 transition-all"
                    autoFocus
                    autoComplete="off" />
                </div>

                {/* ยี่ห้อ + ปีรุ่น */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="snd-brand" className="block text-sm font-semibold text-[#2D2D2D] mb-1.5">ยี่ห้อ</label>
                    <input id="snd-brand" type="text" value={newBrand}
                      onChange={(e) => setNewBrand(e.target.value)}
                      placeholder="เช่น JBL, Pioneer"
                      className="w-full bg-[#F0EDE8] border-0 rounded-2xl px-4 py-2.5 text-sm text-[#2D2D2D] placeholder:text-[#C0BEBA] focus:outline-none focus:ring-2 focus:ring-[#3B3A36]/15 transition-all" />
                  </div>
                  <div>
                    <label htmlFor="snd-year" className="block text-sm font-semibold text-[#2D2D2D] mb-1.5">ปีรุ่น</label>
                    <input id="snd-year" type="number" inputMode="numeric" min="1900" max="2100"
                      value={newModelYear}
                      onChange={(e) => setNewModelYear(e.target.value)}
                      placeholder="เช่น 2024"
                      className="w-full bg-[#F0EDE8] border-0 rounded-2xl px-4 py-2.5 text-sm text-[#2D2D2D] placeholder:text-[#C0BEBA] focus:outline-none focus:ring-2 focus:ring-[#3B3A36]/15 transition-all" />
                  </div>
                </div>

                {/* ราคาทุน + ราคาขาย */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="snd-cost" className="block text-sm font-semibold text-[#2D2D2D] mb-1.5">ราคาทุน (บาท)</label>
                    <input id="snd-cost" type="number" inputMode="decimal" min="0" value={newCost}
                      onChange={(e) => setNewCost(e.target.value)}
                      placeholder="0"
                      className="w-full bg-[#F0EDE8] border-0 rounded-2xl px-4 py-2.5 text-sm text-[#2D2D2D] placeholder:text-[#C0BEBA] focus:outline-none focus:ring-2 focus:ring-[#3B3A36]/15 transition-all" />
                  </div>
                  <div>
                    <label htmlFor="snd-sell" className="block text-sm font-semibold text-[#2D2D2D] mb-1.5">ราคาขาย (บาท) *</label>
                    <input id="snd-sell" type="number" inputMode="decimal" min="0" value={newSell}
                      onChange={(e) => setNewSell(e.target.value)}
                      placeholder="0"
                      className="w-full bg-[#F0EDE8] border-0 rounded-2xl px-4 py-2.5 text-sm text-[#2D2D2D] placeholder:text-[#C0BEBA] focus:outline-none focus:ring-2 focus:ring-[#3B3A36]/15 transition-all" />
                  </div>
                </div>

                {/* สต็อก */}
                <div>
                  <label htmlFor="snd-stock" className="block text-sm font-semibold text-[#2D2D2D] mb-1.5">จำนวนสต็อก</label>
                  <input id="snd-stock" type="number" inputMode="numeric" min="0" value={newStock}
                    onChange={(e) => setNewStock(e.target.value)}
                    className="w-full bg-[#F0EDE8] border-0 rounded-2xl px-4 py-2.5 text-sm text-[#2D2D2D] placeholder:text-[#C0BEBA] focus:outline-none focus:ring-2 focus:ring-[#3B3A36]/15 transition-all" />
                </div>
              </div>

              <div className="px-6 pb-6 flex gap-3">
                <button type="button" onClick={() => setMode('list')}
                  className="flex-1 py-3 rounded-2xl text-sm font-semibold text-[#878681] bg-[#F0EDE8] hover:bg-[#EAE7E2] transition-all">
                  ยกเลิก
                </button>
                <button type="button" onClick={handleCreate}
                  disabled={createMutation.isPending}
                  className="flex-1 py-3 rounded-2xl text-sm font-bold text-white bg-[#3B3A36] hover:bg-[#2D2D2D] transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                  {createMutation.isPending ? 'กำลังบันทึก…' : 'สร้างและเพิ่มในบิล'}
                </button>
              </div>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
