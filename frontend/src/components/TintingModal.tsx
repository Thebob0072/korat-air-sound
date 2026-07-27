import * as Dialog from '@radix-ui/react-dialog';
import { useState, useRef, useEffect } from 'react';
import { X, Eye, ChevronDown, Wrench, Ruler } from 'lucide-react';
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

type PriceEntry = { sell: number; cost: number };
const PRICE_TABLE: Record<string, Partial<Record<string, PriceEntry>>> = {
  'กระบะ 1 ตอน':       { 'ธรรมดา': { sell: 1200, cost: 700  }, 'ลามิน่า': { sell: 1800, cost: 950  }, 'ไฮคูล': { sell: 2200, cost: 1200 }, '3M': { sell: 3500, cost: 1600 } },
  'แค็ป':               { 'ธรรมดา': { sell: 1800, cost: 1000 }, 'ลามิน่า': { sell: 2400, cost: 1300 }, 'ไฮคูล': { sell: 3000, cost: 1600 }, '3M': { sell: 4500, cost: 2000 } },
  '4 ประตู':            { 'ธรรมดา': { sell: 2000, cost: 1100 }, 'ลามิน่า': { sell: 2800, cost: 1500 }, 'ไฮคูล': { sell: 3500, cost: 1800 }, '3M': { sell: 5000, cost: 2300 } },
  'เก๋งกลาง 1200cc':   { 'ธรรมดา': { sell: 2000, cost: 1100 }, 'ลามิน่า': { sell: 2800, cost: 1500 }, 'ไฮคูล': { sell: 3500, cost: 1800 }, '3M': { sell: 5000, cost: 2300 } },
  'เก๋งใหญ่ 1600cc++': { 'ธรรมดา': { sell: 2500, cost: 1400 }, 'ลามิน่า': { sell: 3200, cost: 1700 }, 'ไฮคูล': { sell: 4000, cost: 2100 }, '3M': { sell: 6000, cost: 2800 } },
  'SUV':                { 'ธรรมดา': { sell: 3000, cost: 1700 }, 'ลามิน่า': { sell: 4000, cost: 2100 }, 'ไฮคูล': { sell: 5000, cost: 2600 }, '3M': { sell: 7500, cost: 3500 } },
  'รถแวน':              { 'ธรรมดา': { sell: 2800, cost: 1600 }, 'ลามิน่า': { sell: 3800, cost: 2000 }, 'ไฮคูล': { sell: 4800, cost: 2500 }, '3M': { sell: 7000, cost: 3200 } },
  'รถตู้':              { 'ธรรมดา': { sell: 3200, cost: 1900 }, 'ลามิน่า': { sell: 4500, cost: 2400 }, 'ไฮคูล': { sell: 5500, cost: 2900 }, '3M': { sell: 8000, cost: 3700 } },
  'รถไฟฟ้า เก๋ง':      { 'ธรรมดา': { sell: 2500, cost: 1400 }, 'ลามิน่า': { sell: 3500, cost: 1900 }, 'ไฮคูล': { sell: 4500, cost: 2300 }, '3M': { sell: 6500, cost: 3000 } },
  'รถไฟฟ้า แวน':       { 'ธรรมดา': { sell: 3000, cost: 1700 }, 'ลามิน่า': { sell: 4200, cost: 2200 }, 'ไฮคูล': { sell: 5200, cost: 2700 }, '3M': { sell: 7500, cost: 3500 } },
  'รถไฟฟ้า ตู้':       { 'ธรรมดา': { sell: 3500, cost: 2000 }, 'ลามิน่า': { sell: 5000, cost: 2700 }, 'ไฮคูล': { sell: 6000, cost: 3200 }, '3M': { sell: 9000, cost: 4200 } },
  'รถยุโรป เก๋ง':      { 'ธรรมดา': { sell: 2800, cost: 1600 }, 'ลามิน่า': { sell: 4000, cost: 2100 }, 'ไฮคูล': { sell: 5000, cost: 2600 }, '3M': { sell: 7500, cost: 3500 } },
  'รถยุโรป SUV':       { 'ธรรมดา': { sell: 3500, cost: 2000 }, 'ลามิน่า': { sell: 5000, cost: 2700 }, 'ไฮคูล': { sell: 6000, cost: 3200 }, '3M': { sell: 9000, cost: 4200 } },
};

/** Convert inch² → ft² */
const inchesToSqFt = (w: number, h: number) => (w * h) / 144;

// ── Component ─────────────────────────────────────────────────────────────────

export function TintingModal({ open, onClose }: TintingModalProps) {
  const addItem = usePOSCartStore((s) => s.addItem);

  const [mode, setMode] = useState<'package' | 'cut'>('package');

  // ── Package mode state ──────────────────────────────────────────────────────
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

  // ── Cut-to-measure mode state ────────────────────────────────────────────────
  const [cutWidth, setCutWidth] = useState('');
  const [cutLength, setCutLength] = useState('');
  const [cutBrand, setCutBrand] = useState('');
  const [showCutBrandDrop, setShowCutBrandDrop] = useState(false);
  const [cutPricePerSqFt, setCutPricePerSqFt] = useState('');
  const [cutLabel, setCutLabel] = useState('');
  const [cutTechnician, setCutTechnician] = useState('');
  const [cutError, setCutError] = useState('');
  const cutBrandDropRef = useRef<HTMLDivElement>(null);

  // Computed values for cut mode
  const cutW = parseFloat(cutWidth) || 0;
  const cutL = parseFloat(cutLength) || 0;
  const sqFt = cutW > 0 && cutL > 0 ? inchesToSqFt(cutW, cutL) : 0;
  const ratePerSqFt = parseFloat(cutPricePerSqFt) || 0;
  const cutTotal = sqFt * ratePerSqFt;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (carDropRef.current && !carDropRef.current.contains(e.target as Node)) setShowCarDrop(false);
      if (brandDropRef.current && !brandDropRef.current.contains(e.target as Node)) setShowBrandDrop(false);
      if (cutBrandDropRef.current && !cutBrandDropRef.current.contains(e.target as Node)) setShowCutBrandDrop(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Auto-fill package price when car type + brand are selected
  useEffect(() => {
    if (carType && brand && brand !== 'อื่นๆ') {
      const entry = PRICE_TABLE[carType]?.[brand];
      if (entry) setPrice(String(entry.sell));
    }
  }, [carType, brand]);

  const reset = () => {
    setTechnicianName(''); setCarType(''); setShowCarDrop(false);
    setBrand(''); setShowBrandDrop(false); setModel(''); setPrice(''); setError('');
    setCutWidth(''); setCutLength(''); setCutBrand(''); setShowCutBrandDrop(false);
    setCutPricePerSqFt(''); setCutLabel(''); setCutTechnician(''); setCutError('');
  };

  const handleClose = () => { reset(); onClose(); };

  // ── Package submit ──────────────────────────────────────────────────────────

  const handleAddPackage = () => {
    if (!carType) { setError('กรุณาเลือกประเภทรถ'); return; }
    if (!brand) { setError('กรุณาเลือกยี่ห้อฟิล์ม'); return; }
    if (!model.trim()) { setError('กรุณาระบุรุ่นรถ'); return; }
    const priceNum = parseFloat(price);
    if (!price || isNaN(priceNum) || priceNum <= 0) { setError('กรุณาระบุราคาให้ถูกต้อง'); return; }
    setError('');

    const brandLabel = brand !== 'อื่นๆ' ? ` ${brand}` : '';
    const label = `ฟิล์มกรองแสง${brandLabel} — ${model.trim()} (${carType})`;
    const entry = carType && brand && brand !== 'อื่นๆ' ? PRICE_TABLE[carType]?.[brand] : undefined;

    addItem({
      id: `TINT_${Date.now()}`,
      sku: 'TINT-CUSTOM',
      name: label,
      category: ProductCategory.Tint,
      costPrice: entry?.cost ?? 0,
      sellingPrice: priceNum,
      stockQuantity: 9999,
    }, 1, technicianName || undefined);

    reset();
    onClose();
  };

  // ── Cut-to-measure submit ───────────────────────────────────────────────────

  const handleAddCut = () => {
    if (cutW <= 0) { setCutError('กรุณาระบุความกว้าง'); return; }
    if (cutL <= 0) { setCutError('กรุณาระบุความยาว'); return; }
    if (ratePerSqFt <= 0) { setCutError('กรุณาระบุราคา/ตร.ฟ.'); return; }
    setCutError('');

    const brandPart = cutBrand ? ` ${cutBrand}` : '';
    const notePart = cutLabel.trim() ? ` — ${cutLabel.trim()}` : '';
    const name = `ฟิล์มวัดตัด${brandPart}${notePart} (${cutW}"×${cutL}" = ${sqFt.toFixed(2)} ตร.ฟ.)`;

    addItem({
      id: `TINT_CUT_${Date.now()}`,
      sku: 'TINT-CUT',
      name,
      category: ProductCategory.Tint,
      costPrice: 0,
      sellingPrice: ratePerSqFt, // price per sq ft — total = sellingPrice × quantity(sqft)
      stockQuantity: 9999,
    }, sqFt, cutTechnician || undefined);

    reset();
    onClose();
  };

  const priceNum = parseFloat(price) || 0;
  const priceEntry = carType && brand && brand !== 'อื่นๆ' ? PRICE_TABLE[carType]?.[brand] : undefined;

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
                <p id="tint-desc" className="text-xs text-[#878681] mt-0.5">เลือกโหมดการคิดราคา</p>
              </div>
            </div>
            <Dialog.Close aria-label="ปิด" onClick={handleClose}
              className="h-8 w-8 rounded-full flex items-center justify-center text-[#878681] hover:text-[#2D2D2D] hover:bg-[#F0EDE8] transition-all">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>

          {/* Mode toggle */}
          <div className="px-6 pt-4 pb-0">
            <div className="flex bg-[#F0EDE8] rounded-2xl p-1">
              <button type="button" onClick={() => { setMode('package'); setError(''); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  mode === 'package'
                    ? 'bg-white text-[#2D2D2D] shadow-sm'
                    : 'text-[#878681] hover:text-[#2D2D2D]'
                }`}>
                <Eye className="h-3.5 w-3.5" />
                แพ็กเกจทั้งคัน
              </button>
              <button type="button" onClick={() => { setMode('cut'); setCutError(''); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  mode === 'cut'
                    ? 'bg-white text-[#2D2D2D] shadow-sm'
                    : 'text-[#878681] hover:text-[#2D2D2D]'
                }`}>
                <Ruler className="h-3.5 w-3.5" />
                วัดตัด (นิ้ว → ตร.ฟ.)
              </button>
            </div>
          </div>

          {/* ─── PACKAGE MODE ────────────────────────────────────────────────── */}
          {mode === 'package' && (
            <>
              <div className="px-6 py-5 space-y-4 max-h-[60vh] overflow-y-auto">
                {error && (
                  <div className="bg-red-50 text-red-600 text-sm rounded-xl px-3 py-2 border border-red-100">{error}</div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  {/* ประเภทรถ */}
                  <div>
                    <label className="block text-sm font-semibold text-[#2D2D2D] mb-1.5">ประเภทรถ *</label>
                    <div className="relative" ref={carDropRef}>
                      <button type="button" onClick={() => setShowCarDrop((v) => !v)}
                        className="w-full bg-[#F0EDE8] rounded-2xl px-3 py-2.5 text-sm flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-[#3B3A36]/15 transition-all">
                        <span className={`truncate ${carType ? 'text-[#2D2D2D]' : 'text-[#C0BEBA]'}`}>{carType || 'เลือก'}</span>
                        <ChevronDown className={`h-4 w-4 text-[#878681] shrink-0 ml-1 transition-transform duration-200 ${showCarDrop ? 'rotate-180' : ''}`} />
                      </button>
                      {showCarDrop && (
                        <div className="absolute top-full left-0 right-0 z-[60] mt-1.5 bg-[#FDFCFA] rounded-2xl shadow-[0_8px_32px_rgb(0,0,0,0.12)] border border-[#E8E4DF] overflow-hidden max-h-52 overflow-y-auto">
                          {CAR_TYPES.map((t) => (
                            <button key={t} type="button" onClick={() => { setCarType(t); setShowCarDrop(false); }}
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
                      <button type="button" onClick={() => setShowBrandDrop((v) => !v)}
                        className="w-full bg-[#F0EDE8] rounded-2xl px-3 py-2.5 text-sm flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-[#3B3A36]/15 transition-all">
                        <span className={brand ? 'text-[#2D2D2D]' : 'text-[#C0BEBA]'}>{brand || 'เลือก'}</span>
                        <ChevronDown className={`h-4 w-4 text-[#878681] shrink-0 ml-1 transition-transform duration-200 ${showBrandDrop ? 'rotate-180' : ''}`} />
                      </button>
                      {showBrandDrop && (
                        <div className="absolute top-full left-0 right-0 z-[60] mt-1.5 bg-[#FDFCFA] rounded-2xl shadow-[0_8px_32px_rgb(0,0,0,0.12)] border border-[#E8E4DF] overflow-hidden">
                          {TINT_BRANDS.map((b) => (
                            <button key={b} type="button" onClick={() => { setBrand(b); setShowBrandDrop(false); }}
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
                  <input id="tint-model" type="text" value={model} onChange={(e) => setModel(e.target.value)}
                    placeholder="เช่น Toyota Fortuner, Honda Civic…"
                    className="w-full bg-[#F0EDE8] border-0 rounded-2xl px-4 py-2.5 text-sm text-[#2D2D2D] placeholder:text-[#C0BEBA] focus:outline-none focus:ring-2 focus:ring-[#3B3A36]/15 transition-all"
                    autoComplete="off" />
                </div>

                {/* ราคา */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="tint-price" className="text-sm font-semibold text-[#2D2D2D]">ราคา (บาท) *</label>
                    <div className="flex items-center gap-1.5">
                      {priceEntry?.sell && (
                        <span className="text-xs text-[#5C6B62] font-medium bg-[#5C6B62]/10 px-2 py-0.5 rounded-full">
                          แนะนำ {formatCurrency(priceEntry.sell)}
                        </span>
                      )}
                      {priceEntry?.cost && (
                        <span className="text-xs text-[#878681] bg-[#F0EDE8] px-2 py-0.5 rounded-full">
                          ทุน ~{formatCurrency(priceEntry.cost)}
                        </span>
                      )}
                    </div>
                  </div>
                  <input id="tint-price" type="number" min="0" step="100" inputMode="numeric"
                    value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0"
                    className="w-full bg-[#F0EDE8] border-0 rounded-2xl px-4 py-2.5 text-sm font-mono text-[#2D2D2D] placeholder:text-[#C0BEBA] focus:outline-none focus:ring-2 focus:ring-[#3B3A36]/15 transition-all" />
                </div>
              </div>

              <div className="px-6 pb-6 space-y-3">
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
                <div className="flex items-center gap-2 bg-[#F7F5F2] rounded-2xl px-3 py-2">
                  <Wrench className="h-3.5 w-3.5 text-[#C0BEBA] shrink-0" />
                  <input type="text" value={technicianName} onChange={(e) => setTechnicianName(e.target.value)}
                    placeholder="ช่างผู้รับผิดชอบ (ไม่บังคับ)"
                    className="flex-1 bg-transparent text-sm text-[#2D2D2D] placeholder:text-[#C0BEBA] focus:outline-none" />
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={handleClose}
                    className="flex-1 bg-[#F0EDE8] hover:bg-[#E5E5E3] rounded-2xl px-4 py-2.5 text-sm font-medium text-[#878681] hover:text-[#2D2D2D] transition-all active:scale-[0.98]">
                    ยกเลิก
                  </button>
                  <button type="button" onClick={handleAddPackage}
                    className="flex-1 bg-[#3B3A36] hover:opacity-90 text-white rounded-2xl px-4 py-2.5 text-sm font-medium transition-all active:scale-[0.98]">
                    เพิ่มในบิล
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ─── CUT-TO-MEASURE MODE ─────────────────────────────────────────── */}
          {mode === 'cut' && (
            <>
              <div className="px-6 py-5 space-y-4 max-h-[60vh] overflow-y-auto">
                {cutError && (
                  <div className="bg-red-50 text-red-600 text-sm rounded-xl px-3 py-2 border border-red-100">{cutError}</div>
                )}

                {/* Dimension inputs */}
                <div>
                  <p className="text-sm font-semibold text-[#2D2D2D] mb-2">ขนาดฟิล์ม (นิ้ว) *</p>
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                    <div>
                      <label className="block text-xs text-[#878681] mb-1">กว้าง</label>
                      <div className="relative">
                        <input type="number" min="0" step="0.5" inputMode="decimal"
                          value={cutWidth} onChange={(e) => setCutWidth(e.target.value)}
                          placeholder="60"
                          className="w-full bg-[#F0EDE8] border-0 rounded-2xl px-3 py-2.5 pr-10 text-sm font-mono text-right text-[#2D2D2D] placeholder:text-[#C0BEBA] focus:outline-none focus:ring-2 focus:ring-[#3B3A36]/15 transition-all" />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#878681] pointer-events-none">นิ้ว</span>
                      </div>
                    </div>
                    <span className="text-[#C0BEBA] font-bold mt-4">×</span>
                    <div>
                      <label className="block text-xs text-[#878681] mb-1">ยาว</label>
                      <div className="relative">
                        <input type="number" min="0" step="0.5" inputMode="decimal"
                          value={cutLength} onChange={(e) => setCutLength(e.target.value)}
                          placeholder="40"
                          className="w-full bg-[#F0EDE8] border-0 rounded-2xl px-3 py-2.5 pr-10 text-sm font-mono text-right text-[#2D2D2D] placeholder:text-[#C0BEBA] focus:outline-none focus:ring-2 focus:ring-[#3B3A36]/15 transition-all" />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#878681] pointer-events-none">นิ้ว</span>
                      </div>
                    </div>
                  </div>

                  {/* Calculated sq ft — shown as soon as both fields have values */}
                  {sqFt > 0 && (
                    <div className="mt-2.5 bg-[#3B3A36] text-white rounded-2xl px-4 py-2.5 flex items-center justify-between">
                      <div className="text-xs text-white/60">
                        {cutW}" × {cutL}" ÷ 144
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-black text-xl tabular-nums">{sqFt.toFixed(2)}</span>
                        <span className="text-white/70 text-xs ml-1">ตร.ฟ.</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Brand (optional) */}
                <div>
                  <label className="block text-sm font-semibold text-[#2D2D2D] mb-1.5">ยี่ห้อฟิล์ม</label>
                  <div className="relative" ref={cutBrandDropRef}>
                    <button type="button" onClick={() => setShowCutBrandDrop((v) => !v)}
                      className="w-full bg-[#F0EDE8] rounded-2xl px-3 py-2.5 text-sm flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-[#3B3A36]/15 transition-all">
                      <span className={cutBrand ? 'text-[#2D2D2D]' : 'text-[#C0BEBA]'}>{cutBrand || 'เลือก (ไม่บังคับ)'}</span>
                      <ChevronDown className={`h-4 w-4 text-[#878681] shrink-0 ml-1 transition-transform duration-200 ${showCutBrandDrop ? 'rotate-180' : ''}`} />
                    </button>
                    {showCutBrandDrop && (
                      <div className="absolute top-full left-0 right-0 z-[60] mt-1.5 bg-[#FDFCFA] rounded-2xl shadow-[0_8px_32px_rgb(0,0,0,0.12)] border border-[#E8E4DF] overflow-hidden">
                        <button type="button" onClick={() => { setCutBrand(''); setShowCutBrandDrop(false); }}
                          className="w-full text-left px-4 py-2.5 text-sm text-[#878681] border-b border-[#EAE7E2] hover:bg-[#F5F2EE]">
                          ไม่ระบุ
                        </button>
                        {TINT_BRANDS.filter((b) => b !== 'อื่นๆ').map((b) => (
                          <button key={b} type="button" onClick={() => { setCutBrand(b); setShowCutBrandDrop(false); }}
                            className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between border-b border-[#EAE7E2] last:border-0 transition-colors ${cutBrand === b ? 'bg-[#F0EDE8] font-medium' : 'hover:bg-[#F5F2EE]'}`}>
                            {b}
                            {cutBrand === b && <span className="text-[#5C6B62] text-xs font-bold">✓</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Price per sq ft */}
                <div>
                  <label htmlFor="cut-rate" className="block text-sm font-semibold text-[#2D2D2D] mb-1.5">
                    ราคา/ตร.ฟ. (บาท) *
                  </label>
                  <div className="relative">
                    <input id="cut-rate" type="number" min="0" step="1" inputMode="numeric"
                      value={cutPricePerSqFt} onChange={(e) => setCutPricePerSqFt(e.target.value)}
                      placeholder="0"
                      className="w-full bg-[#F0EDE8] border-0 rounded-2xl px-4 py-2.5 pr-16 text-sm font-mono text-[#2D2D2D] placeholder:text-[#C0BEBA] focus:outline-none focus:ring-2 focus:ring-[#3B3A36]/15 transition-all" />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-[#878681] pointer-events-none">บาท/ตร.ฟ.</span>
                  </div>
                </div>

                {/* Note (optional) */}
                <div>
                  <label htmlFor="cut-label" className="block text-sm font-semibold text-[#2D2D2D] mb-1.5">
                    หมายเหตุ <span className="font-normal text-[#878681]">(เช่น กระจกหน้า, ประตูซ้าย)</span>
                  </label>
                  <input id="cut-label" type="text" value={cutLabel} onChange={(e) => setCutLabel(e.target.value)}
                    placeholder="กระจกหน้า"
                    className="w-full bg-[#F0EDE8] border-0 rounded-2xl px-4 py-2.5 text-sm text-[#2D2D2D] placeholder:text-[#C0BEBA] focus:outline-none focus:ring-2 focus:ring-[#3B3A36]/15 transition-all" />
                </div>
              </div>

              <div className="px-6 pb-6 space-y-3">
                {/* Summary card */}
                {sqFt > 0 && ratePerSqFt > 0 && (
                  <div className="bg-[#F0EDE8] rounded-2xl px-4 py-3 border border-[#E5E0DA]">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-[#878681]">
                          {sqFt.toFixed(2)} ตร.ฟ. × {formatCurrency(ratePerSqFt)}/ตร.ฟ.
                        </p>
                        <p className="text-sm font-semibold text-[#2D2D2D] mt-0.5">
                          ฟิล์มวัดตัด{cutBrand ? ` ${cutBrand}` : ''}{cutLabel.trim() ? ` — ${cutLabel.trim()}` : ''}
                        </p>
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <p className="text-[10px] text-[#878681]">รวม</p>
                        <p className="font-mono font-black text-lg text-[#3B3A36] tabular-nums">{formatCurrency(cutTotal)}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 bg-[#F7F5F2] rounded-2xl px-3 py-2">
                  <Wrench className="h-3.5 w-3.5 text-[#C0BEBA] shrink-0" />
                  <input type="text" value={cutTechnician} onChange={(e) => setCutTechnician(e.target.value)}
                    placeholder="ช่างผู้รับผิดชอบ (ไม่บังคับ)"
                    className="flex-1 bg-transparent text-sm text-[#2D2D2D] placeholder:text-[#C0BEBA] focus:outline-none" />
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={handleClose}
                    className="flex-1 bg-[#F0EDE8] hover:bg-[#E5E5E3] rounded-2xl px-4 py-2.5 text-sm font-medium text-[#878681] hover:text-[#2D2D2D] transition-all active:scale-[0.98]">
                    ยกเลิก
                  </button>
                  <button type="button" onClick={handleAddCut}
                    className="flex-1 bg-[#3B3A36] hover:opacity-90 text-white rounded-2xl px-4 py-2.5 text-sm font-medium transition-all active:scale-[0.98]">
                    เพิ่มในบิล
                  </button>
                </div>
              </div>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
