import * as Dialog from '@radix-ui/react-dialog';
import { useState, useRef, useEffect } from 'react';
import { X, Eye, ChevronDown, Wrench } from 'lucide-react';
import { usePOSCartStore } from '@/store/POSCartStore';
import { formatCurrency } from '@/lib/utils';
import { ProductCategory } from '@/types';

// ── Types ─────────────────────────────────────────────────────────────────────

interface TintingModalProps {
  open: boolean;
  onClose: () => void;
}

const CAR_TYPES = [
  'กระบะ 1 ตอน',
  'แค็ป',
  '4 ประตู',
  'เก๋งกลาง 1200cc',
  'เก๋งใหญ่ 1600cc++',
  'SUV',
  'รถแวน',
  'รถตู้',
  'รถไฟฟ้า เก๋ง',
  'รถไฟฟ้า แวน',
  'รถไฟฟ้า ตู้',
  'รถยุโรป เก๋ง',
  'รถยุโรป SUV',
] as const;

const TINT_BRANDS = ['ธรรมดา', 'ลามิน่า', 'ไฮคูล', '3M', 'อื่นๆ'] as const;

// ราคาแนะนำ ประเภทรถ × ยี่ห้อฟิล์ม (แก้ไขได้)
const PRICE_TABLE: Record<string, Partial<Record<string, number>>> = {
  'กระบะ 1 ตอน':       { 'ธรรมดา': 1200, 'ลามิน่า': 1800, 'ไฮคูล': 2200, '3M': 3500 },
  'แค็ป':               { 'ธรรมดา': 1800, 'ลามิน่า': 2400, 'ไฮคูล': 3000, '3M': 4500 },
  '4 ประตู':            { 'ธรรมดา': 2000, 'ลามิน่า': 2800, 'ไฮคูล': 3500, '3M': 5000 },
  'เก๋งกลาง 1200cc':   { 'ธรรมดา': 2000, 'ลามิน่า': 2800, 'ไฮคูล': 3500, '3M': 5000 },
  'เก๋งใหญ่ 1600cc++': { 'ธรรมดา': 2500, 'ลามิน่า': 3200, 'ไฮคูล': 4000, '3M': 6000 },
  'SUV':                { 'ธรรมดา': 3000, 'ลามิน่า': 4000, 'ไฮคูล': 5000, '3M': 7500 },
  'รถแวน':              { 'ธรรมดา': 2800, 'ลามิน่า': 3800, 'ไฮคูล': 4800, '3M': 7000 },
  'รถตู้':              { 'ธรรมดา': 3200, 'ลามิน่า': 4500, 'ไฮคูล': 5500, '3M': 8000 },
  'รถไฟฟ้า เก๋ง':      { 'ธรรมดา': 2500, 'ลามิน่า': 3500, 'ไฮคูล': 4500, '3M': 6500 },
  'รถไฟฟ้า แวน':       { 'ธรรมดา': 3000, 'ลามิน่า': 4200, 'ไฮคูล': 5200, '3M': 7500 },
  'รถไฟฟ้า ตู้':       { 'ธรรมดา': 3500, 'ลามิน่า': 5000, 'ไฮคูล': 6000, '3M': 9000 },
  'รถยุโรป เก๋ง':      { 'ธรรมดา': 2800, 'ลามิน่า': 4000, 'ไฮคูล': 5000, '3M': 7500 },
  'รถยุโรป SUV':       { 'ธรรมดา': 3500, 'ลามิน่า': 5000, 'ไฮคูล': 6000, '3M': 9000 },
};

// ── Component ─────────────────────────────────────────────────────────────────

export function TintingModal({ open, onClose }: TintingModalProps) {
  const addItem = usePOSCartStore((s) => s.addItem);

  const [technicianName, setTechnicianName] = useState('');
  const [carType, setCarType] = useState('');
  const [showCarDrop, setShowCarDrop] = useState(false);
  const [brand, setBrand] = useState('');
  const [showBrandDrop, setShowBrandDrop] = useState(false);
  const [model, setModel] = useState('');
  const [price, setPrice] = useState('');
  const [error, setError] = useState('');
  const carDropRef = useRef<HTMLDivElement>(null);
  const brandDropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (carDropRef.current && !carDropRef.current.contains(e.target as Node))
        setShowCarDrop(false);
      if (brandDropRef.current && !brandDropRef.current.contains(e.target as Node))
        setShowBrandDrop(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Auto-fill price when car type + brand are selected
  useEffect(() => {
    if (carType && brand && brand !== 'อื่นๆ') {
      const suggested = PRICE_TABLE[carType]?.[brand];
      if (suggested) setPrice(String(suggested));
    }
  }, [carType, brand]);

  const reset = () => {
    setTechnicianName('');
    setCarType('');
    setShowCarDrop(false);
    setBrand('');
    setShowBrandDrop(false);
    setModel('');
    setPrice('');
    setError('');
  };

  const handleClose = () => { reset(); onClose(); };

  const handleAdd = () => {
    if (!carType) { setError('กรุณาเลือกประเภทรถ'); return; }
    if (!brand) { setError('กรุณาเลือกยี่ห้อฟิล์ม'); return; }
    if (!model.trim()) { setError('กรุณาระบุรุ่นรถ'); return; }
    const priceNum = parseFloat(price);
    if (!price || isNaN(priceNum) || priceNum <= 0) { setError('กรุณาระบุราคาให้ถูกต้อง'); return; }
    setError('');

    const brandLabel = brand !== 'อื่นๆ' ? ` ${brand}` : '';
    const label = `ฟิล์มกรองแสง${brandLabel} — ${model.trim()} (${carType})`;

    addItem({
      id: `TINT_${Date.now()}`,
      sku: 'TINT-CUSTOM',
      name: label,
      category: ProductCategory.Tint,
      costPrice: 0,
      sellingPrice: priceNum,
      stockQuantity: 9999,
    }, 1, technicianName || undefined);

    reset();
    onClose();
  };

  const priceNum = parseFloat(price) || 0;
  const suggestedPrice = carType && brand && brand !== 'อื่นๆ' ? PRICE_TABLE[carType]?.[brand] : undefined;

  return (
    <Dialog.Root open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content
          aria-describedby="tint-desc"
          className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 bg-[#FDFCFA] rounded-[28px] shadow-[0_24px_80px_rgb(0,0,0,0.18)] border border-[#E8E4DF] focus:outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-[#E8E4DF]">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-[#E8E4DF] flex items-center justify-center">
                <Eye className="h-4 w-4 text-[#5C6B62]" />
              </div>
              <div>
                <Dialog.Title className="text-base font-bold text-[#2D2D2D] leading-none">
                  เพิ่มงานฟิล์มกรองแสง
                </Dialog.Title>
                <p id="tint-desc" className="text-xs text-[#878681] mt-0.5">ราคาจะแสดงอัตโนมัติเมื่อเลือกประเภทรถและยี่ห้อ</p>
              </div>
            </div>
            <Dialog.Close
              aria-label="ปิด"
              onClick={handleClose}
              className="h-8 w-8 rounded-full flex items-center justify-center text-[#878681] hover:text-[#2D2D2D] hover:bg-[#F0EDE8] transition-all"
            >
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>

          {/* Body */}
          <div className="px-6 py-5 space-y-4 max-h-[68vh] overflow-y-auto">
            {error && (
              <div className="bg-red-50 text-red-600 text-sm rounded-xl px-3 py-2 border border-red-100">{error}</div>
            )}

            {/* ประเภทรถ + ยี่ห้อฟิล์ม */}
            <div className="grid grid-cols-2 gap-3">
              {/* ประเภทรถ */}
              <div>
                <label className="block text-sm font-semibold text-[#2D2D2D] mb-1.5">ประเภทรถ *</label>
                <div className="relative" ref={carDropRef}>
                  <button
                    type="button"
                    onClick={() => setShowCarDrop((v) => !v)}
                    className="w-full bg-[#F0EDE8] rounded-2xl px-3 py-2.5 text-sm flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-[#3B3A36]/15 transition-all"
                  >
                    <span className={`truncate ${carType ? 'text-[#2D2D2D]' : 'text-[#C0BEBA]'}`}>{carType || 'เลือก'}</span>
                    <ChevronDown className={`h-4 w-4 text-[#878681] shrink-0 ml-1 transition-transform duration-200 ${showCarDrop ? 'rotate-180' : ''}`} />
                  </button>
                  {showCarDrop && (
                    <div className="absolute top-full left-0 right-0 z-[60] mt-1.5 bg-[#FDFCFA] rounded-2xl shadow-[0_8px_32px_rgb(0,0,0,0.12)] border border-[#E8E4DF] overflow-hidden max-h-52 overflow-y-auto">
                      {CAR_TYPES.map((t) => (
                        <button key={t} type="button"
                          onClick={() => { setCarType(t); setShowCarDrop(false); }}
                          className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between border-b border-[#EAE7E2] last:border-0 transition-colors ${carType === t ? 'bg-[#F0EDE8] font-medium' : 'hover:bg-[#F5F2EE]'}`}>
                          <span className="truncate">{t}</span>
                          {carType === t && <span className="text-[#5C6B62] text-xs font-bold ml-2 shrink-0">✓</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* ยี่ห้อฟิล์ม */}
              <div>
                <label className="block text-sm font-semibold text-[#2D2D2D] mb-1.5">ยี่ห้อฟิล์ม *</label>
                <div className="relative" ref={brandDropRef}>
                  <button
                    type="button"
                    onClick={() => setShowBrandDrop((v) => !v)}
                    className="w-full bg-[#F0EDE8] rounded-2xl px-3 py-2.5 text-sm flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-[#3B3A36]/15 transition-all"
                  >
                    <span className={brand ? 'text-[#2D2D2D]' : 'text-[#C0BEBA]'}>{brand || 'เลือก'}</span>
                    <ChevronDown className={`h-4 w-4 text-[#878681] shrink-0 ml-1 transition-transform duration-200 ${showBrandDrop ? 'rotate-180' : ''}`} />
                  </button>
                  {showBrandDrop && (
                    <div className="absolute top-full left-0 right-0 z-[60] mt-1.5 bg-[#FDFCFA] rounded-2xl shadow-[0_8px_32px_rgb(0,0,0,0.12)] border border-[#E8E4DF] overflow-hidden">
                      {TINT_BRANDS.map((b) => (
                        <button key={b} type="button"
                          onClick={() => { setBrand(b); setShowBrandDrop(false); }}
                          className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between border-b border-[#EAE7E2] last:border-0 transition-colors ${brand === b ? 'bg-[#F0EDE8] font-medium' : 'hover:bg-[#F5F2EE]'}`}>
                          {b}
                          {brand === b && <span className="text-[#5C6B62] text-xs font-bold">✓</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* รุ่นรถ */}
            <div>
              <label htmlFor="tint-model" className="block text-sm font-semibold text-[#2D2D2D] mb-1.5">รุ่นรถ *</label>
              <input
                id="tint-model"
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="เช่น Toyota Fortuner, Honda Civic…"
                className="w-full bg-[#F0EDE8] border-0 rounded-2xl px-4 py-2.5 text-sm text-[#2D2D2D] placeholder:text-[#C0BEBA] focus:outline-none focus:ring-2 focus:ring-[#3B3A36]/15 transition-all"
                autoComplete="off"
              />
            </div>

            {/* ราคา */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="tint-price" className="text-sm font-semibold text-[#2D2D2D]">ราคา (บาท) *</label>
                {suggestedPrice && (
                  <span className="text-xs text-[#5C6B62] font-medium bg-[#5C6B62]/10 px-2 py-0.5 rounded-full">
                    ราคาแนะนำ {formatCurrency(suggestedPrice)}
                  </span>
                )}
              </div>
              <input
                id="tint-price"
                type="number"
                min="0"
                step="100"
                inputMode="numeric"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0"
                className="w-full bg-[#F0EDE8] border-0 rounded-2xl px-4 py-2.5 text-sm font-mono text-[#2D2D2D] placeholder:text-[#C0BEBA] focus:outline-none focus:ring-2 focus:ring-[#3B3A36]/15 transition-all"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 pb-6 space-y-3">
            {/* Preview */}
            {carType && brand && model.trim() && priceNum > 0 && (
              <div className="bg-[#F0EDE8] rounded-2xl px-4 py-3 flex items-center justify-between border border-[#E5E0DA]">
                <div>
                  <p className="text-xs text-[#878681] mb-0.5">รายการที่จะเพิ่ม</p>
                  <p className="text-sm font-semibold text-[#2D2D2D]">
                    ฟิล์มกรองแสง{brand !== 'อื่นๆ' ? ` ${brand}` : ''} — {model.trim()} ({carType})
                  </p>
                </div>
                <p className="font-mono font-bold text-[#3B3A36] text-base">{formatCurrency(priceNum)}</p>
              </div>
            )}

            {/* Technician name */}
            <div className="flex items-center gap-2 bg-[#F7F5F2] rounded-2xl px-3 py-2 mb-2">
              <Wrench className="h-3.5 w-3.5 text-[#C0BEBA] shrink-0" />
              <input
                type="text"
                value={technicianName}
                onChange={(e) => setTechnicianName(e.target.value)}
                placeholder="ช่างผู้รับผิดชอบ (ไม่บังคับ)"
                className="flex-1 bg-transparent text-sm text-[#2D2D2D] placeholder:text-[#C0BEBA] focus:outline-none"
              />
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={handleClose}
                className="flex-1 bg-[#F0EDE8] hover:bg-[#E5E5E3] rounded-2xl px-4 py-2.5 text-sm font-medium text-[#878681] hover:text-[#2D2D2D] transition-all active:scale-[0.98]">
                ยกเลิก
              </button>
              <button type="button" onClick={handleAdd}
                className="flex-1 bg-[#3B3A36] hover:opacity-90 text-white rounded-2xl px-4 py-2.5 text-sm font-medium transition-all active:scale-[0.98]">
                เพิ่มในบิล
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>

  );
}
