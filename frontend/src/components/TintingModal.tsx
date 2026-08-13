import * as Dialog from '@radix-ui/react-dialog';
import { useState, useRef, useEffect } from 'react';
import { X, Eye, ChevronDown, Wrench, Ruler, LayoutGrid } from 'lucide-react';
import { usePOSCartStore } from '@/store/POSCartStore';
import { formatCurrency } from '@/lib/utils';
import { ProductCategory } from '@/types';

// ── Types ─────────────────────────────────────────────────────────────────────

interface TintingModalProps {
  open: boolean;
  onClose: () => void;
  vehicleBrand?: string | null;
  vehicleModel?: string | null;
}

const CAR_TYPES = [
  'รถตอนเดียว',
  'รถแค็บ',
  'รถ 4 ประตู',
  'รถเก๋งเล็ก',
  'รถเก๋งกลาง',
  'รถเก๋งใหญ่',
  'SUV / PPV',
  'รถแวน',
  'รถตู้',
  'MPV',
] as const;

// brand keys ตรงกับ PRICE_TABLE และ TINT_BRANDS
const TINT_BRANDS = ['บีซี', 'ไฮคูล', '3M', 'ลามิน่า', 'อื่นๆ'] as const;

// sell = ราคาพิเศษ (ปัจจุบัน), ref = ราคาปกติ (สำหรับแสดงเป็น reference)
type PriceEntry = { sell: number; ref: number; cost: number };
const PRICE_TABLE: Record<string, Partial<Record<string, PriceEntry>>> = {
  'รถตอนเดียว': {
    'บีซี':    { sell: 1900, ref: 2900, cost: 1100 },
    'ไฮคูล':  { sell: 3000, ref: 4000, cost: 1700 },
    '3M':     { sell: 3500, ref: 4500, cost: 2000 },
    'ลามิน่า':{ sell: 3500, ref: 4500, cost: 2000 },
  },
  'รถแค็บ': {
    'บีซี':    { sell: 2500, ref: 3500, cost: 1400 },
    'ไฮคูล':  { sell: 4000, ref: 5000, cost: 2200 },
    '3M':     { sell: 4500, ref: 5500, cost: 2500 },
    'ลามิน่า':{ sell: 4500, ref: 5500, cost: 2500 },
  },
  'รถ 4 ประตู': {
    'บีซี':    { sell: 3000, ref: 4000, cost: 1700 },
    'ไฮคูล':  { sell: 4500, ref: 5500, cost: 2500 },
    '3M':     { sell: 4800, ref: 5800, cost: 2700 },
    'ลามิน่า':{ sell: 4800, ref: 5800, cost: 2700 },
  },
  'รถเก๋งเล็ก': {
    'บีซี':    { sell: 3300, ref: 4500, cost: 1800 },
    'ไฮคูล':  { sell: 4800, ref: 5800, cost: 2700 },
    '3M':     { sell: 5000, ref: 6000, cost: 2800 },
    'ลามิน่า':{ sell: 5000, ref: 6000, cost: 2800 },
  },
  'รถเก๋งกลาง': {
    'บีซี':    { sell: 3500, ref: 4800, cost: 2000 },
    'ไฮคูล':  { sell: 5000, ref: 6000, cost: 2800 },
    '3M':     { sell: 5500, ref: 6500, cost: 3100 },
    'ลามิน่า':{ sell: 5500, ref: 6500, cost: 3100 },
  },
  'รถเก๋งใหญ่': {
    'บีซี':    { sell: 3800, ref: 5300, cost: 2100 },
    'ไฮคูล':  { sell: 5500, ref: 6500, cost: 3100 },
    '3M':     { sell: 6500, ref: 7500, cost: 3700 },
    'ลามิน่า':{ sell: 6500, ref: 7500, cost: 3700 },
  },
  'SUV / PPV': {
    'บีซี':    { sell: 4500, ref: 6000, cost: 2500 },
    'ไฮคูล':  { sell: 6500, ref: 7500, cost: 3700 },
    '3M':     { sell: 7500, ref: 8500, cost: 4200 },
    'ลามิน่า':{ sell: 7500, ref: 8500, cost: 4200 },
  },
  'รถแวน': {
    'บีซี':    { sell: 4500, ref: 6000, cost: 2500 },
    'ไฮคูล':  { sell: 6500, ref: 7500, cost: 3700 },
    '3M':     { sell: 7500, ref: 8500, cost: 4200 },
    'ลามิน่า':{ sell: 7500, ref: 8500, cost: 4200 },
  },
  'รถตู้': {
    'บีซี':    { sell: 5500, ref: 7000, cost: 3100 },
    '3M':     { sell: 9500, ref: 10500, cost: 5300 },
    'ลามิน่า':{ sell: 9500, ref: 10500, cost: 5300 },
  },
  'MPV': {
    'บีซี':    { sell: 5500, ref: 7000, cost: 3100 },
    '3M':     { sell: 9500, ref: 10500, cost: 5300 },
    'ลามิน่า':{ sell: 9500, ref: 10500, cost: 5300 },
  },
};

/** Convert inch² → ft² */
const inchesToSqFt = (w: number, h: number) => (w * h) / 144;

// ── Component ─────────────────────────────────────────────────────────────────

// ── Panel mode types ─────────────────────────────────────────────────────────

type PanelKey = 'front' | 'rear' | 'side';
const PANELS: { key: PanelKey; label: string; hint: string }[] = [
  { key: 'front', label: 'บานหน้า', hint: 'กระจกหน้า' },
  { key: 'rear',  label: 'บานหลัง', hint: 'กระจกหลัง' },
  { key: 'side',  label: 'บานข้าง', hint: 'กระจกข้างทุกบาน' },
];

export function TintingModal({ open, onClose, vehicleBrand, vehicleModel }: TintingModalProps) {
  const vehicleDisplay = [vehicleBrand, vehicleModel].filter(Boolean).join(' ');
  const addItem = usePOSCartStore((s) => s.addItem);

  const [mode, setMode] = useState<'package' | 'cut' | 'panel'>('package');

  // ── Package mode state ──────────────────────────────────────────────────────
  const [technicianName, setTechnicianName] = useState('');
  const [carType, setCarType] = useState('');
  const [showCarDrop, setShowCarDrop] = useState(false);
  const [brand, setBrand] = useState('');
  const [showBrandDrop, setShowBrandDrop] = useState(false);
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

  // ── Panel mode state ─────────────────────────────────────────────────────────
  type PanelState = { enabled: boolean; price: string; brand: string };
  const initPanel = (): Record<PanelKey, PanelState> => ({
    front: { enabled: false, price: '', brand: '' },
    rear:  { enabled: false, price: '', brand: '' },
    side:  { enabled: false, price: '', brand: '' },
  });
  const [panels, setPanels] = useState<Record<PanelKey, PanelState>>(initPanel);
  const [panelTech, setPanelTech] = useState('');
  const [panelError, setPanelError] = useState('');
  const setPanel = (key: PanelKey, patch: Partial<PanelState>) =>
    setPanels((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));

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
    setBrand(''); setShowBrandDrop(false); setPrice(''); setError('');
    setCutWidth(''); setCutLength(''); setCutBrand(''); setShowCutBrandDrop(false);
    setCutPricePerSqFt(''); setCutLabel(''); setCutTechnician(''); setCutError('');
    setPanels(initPanel());
    setPanelTech(''); setPanelError('');
  };

  // ── Panel submit ─────────────────────────────────────────────────────────────

  const handleAddPanels = () => {
    const selected = PANELS.filter((p) => panels[p.key].enabled && parseFloat(panels[p.key].price) > 0);
    if (selected.length === 0) {
      setPanelError('กรุณาเลือกอย่างน้อย 1 บานพร้อมระบุราคา');
      return;
    }
    setPanelError('');
    const ts = Date.now();
    selected.forEach(({ key, label }) => {
      const { price: rawPrice, brand: rawBrand } = panels[key];
      const priceNum = parseFloat(rawPrice);
      const brandPart = rawBrand ? ` ${rawBrand}` : '';
      const vehiclePart = vehicleDisplay ? ` — ${vehicleDisplay}` : '';
      addItem({
        id: `TINT_PANEL_${key}_${ts}`,
        sku: 'TINT-PANEL',
        name: `ฟิล์มกรองแสง${brandPart} ${label}${vehiclePart}`,
        category: ProductCategory.Tint,
        costPrice: 0,
        sellingPrice: priceNum,
        stockQuantity: 9999,
      }, 1, panelTech || undefined);
    });
    reset();
    onClose();
  };

  const handleClose = () => { reset(); onClose(); };

  // ── Package submit ──────────────────────────────────────────────────────────

  const handleAddPackage = () => {
    if (!carType) { setError('กรุณาเลือกประเภทรถ'); return; }
    if (!brand) { setError('กรุณาเลือกยี่ห้อฟิล์ม'); return; }
    const priceNum = parseFloat(price);
    if (!price || isNaN(priceNum) || priceNum <= 0) { setError('กรุณาระบุราคาให้ถูกต้อง'); return; }
    setError('');

    const brandLabel = brand !== 'อื่นๆ' ? ` ${brand}` : '';
    const vehiclePart = vehicleDisplay ? ` — ${vehicleDisplay}` : '';
    const label = `ฟิล์มกรองแสง${brandLabel}${vehiclePart} (${carType})`;
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
            <div className="flex bg-[#F0EDE8] rounded-2xl p-1 gap-0.5">
              <button type="button" onClick={() => { setMode('package'); setError(''); }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
                  mode === 'package' ? 'bg-white text-[#2D2D2D] shadow-sm' : 'text-[#878681] hover:text-[#2D2D2D]'
                }`}>
                <Eye className="h-3 w-3" />แพ็กเกจทั้งคัน
              </button>
              <button type="button" onClick={() => { setMode('panel'); setPanelError(''); }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
                  mode === 'panel' ? 'bg-white text-[#2D2D2D] shadow-sm' : 'text-[#878681] hover:text-[#2D2D2D]'
                }`}>
                <LayoutGrid className="h-3 w-3" />แยกบาน
              </button>
              <button type="button" onClick={() => { setMode('cut'); setCutError(''); }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
                  mode === 'cut' ? 'bg-white text-[#2D2D2D] shadow-sm' : 'text-[#878681] hover:text-[#2D2D2D]'
                }`}>
                <Ruler className="h-3 w-3" />วัดตัด
              </button>
            </div>
          </div>

          {/* ─── PANEL MODE ──────────────────────────────────────────────────── */}
          {mode === 'panel' && (
            <>
              <div className="px-6 py-5 space-y-3 max-h-[60vh] overflow-y-auto">
                {panelError && (
                  <div className="bg-red-50 text-red-600 text-sm rounded-xl px-3 py-2 border border-red-100">{panelError}</div>
                )}
                {vehicleDisplay && (
                  <div className="flex items-center gap-2.5 bg-[#F0EDE8] rounded-2xl px-4 py-2 border border-[#E5E0DA]">
                    <span className="text-xs text-[#878681] shrink-0">รุ่นรถ</span>
                    <span className="text-sm font-semibold text-[#2D2D2D] truncate">{vehicleDisplay}</span>
                    <span className="text-[10px] text-[#C0BEBA] shrink-0 ml-auto">ดึงจากบิล</span>
                  </div>
                )}

                {PANELS.map(({ key, label, hint }) => {
                  const panel = panels[key];
                  return (
                    <div key={key} className={`border-2 rounded-2xl transition-all ${panel.enabled ? 'border-[#3B3A36] bg-[#FDFCFA]' : 'border-[#E8E4DF] bg-[#F7F5F2]'}`}>
                      <button
                        type="button"
                        onClick={() => setPanel(key, { enabled: !panel.enabled })}
                        className="w-full flex items-center gap-3 px-4 py-3"
                      >
                        <div className={`h-5 w-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${panel.enabled ? 'bg-[#3B3A36] border-[#3B3A36]' : 'border-[#C0BEBA]'}`}>
                          {panel.enabled && <span className="text-white text-xs font-bold">✓</span>}
                        </div>
                        <div className="text-left">
                          <p className={`text-sm font-semibold ${panel.enabled ? 'text-[#2D2D2D]' : 'text-[#878681]'}`}>{label}</p>
                          <p className="text-xs text-[#C0BEBA]">{hint}</p>
                        </div>
                        {panel.enabled && panel.price && (
                          <span className="ml-auto text-sm font-mono font-bold text-[#3B3A36]">
                            {formatCurrency(parseFloat(panel.price) || 0)}
                          </span>
                        )}
                      </button>
                      {panel.enabled && (
                        <div className="px-4 pb-4 grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs text-[#878681] mb-1">ยี่ห้อ</label>
                            <select
                              value={panel.brand}
                              onChange={(e) => setPanel(key, { brand: e.target.value })}
                              className="w-full bg-[#F0EDE8] border-0 rounded-xl px-3 py-2 text-sm text-[#2D2D2D] focus:outline-none focus:ring-2 focus:ring-[#3B3A36]/15 transition-all"
                            >
                              <option value="">ไม่ระบุ</option>
                              {TINT_BRANDS.filter((b) => b !== 'อื่นๆ').map((b) => (
                                <option key={b} value={b}>{b}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-[#878681] mb-1">ราคา (บาท) *</label>
                            <input
                              type="number"
                              min="0"
                              step="100"
                              inputMode="numeric"
                              value={panel.price}
                              onChange={(e) => setPanel(key, { price: e.target.value })}
                              placeholder="0"
                              className="w-full bg-[#F0EDE8] border-0 rounded-xl px-3 py-2 text-sm font-mono text-[#2D2D2D] placeholder:text-[#C0BEBA] focus:outline-none focus:ring-2 focus:ring-[#3B3A36]/15 transition-all"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {PANELS.some((p) => panels[p.key].enabled && parseFloat(panels[p.key].price) > 0) && (
                  <div className="bg-[#3B3A36] text-white rounded-2xl px-4 py-3 flex items-center justify-between">
                    <span className="text-sm">รวมทุกบาน</span>
                    <span className="font-mono font-black text-lg tabular-nums">
                      {formatCurrency(PANELS.reduce((sum, p) => sum + (panels[p.key].enabled ? parseFloat(panels[p.key].price) || 0 : 0), 0))}
                    </span>
                  </div>
                )}
              </div>

              <div className="px-6 pb-6 space-y-3">
                <div className="flex items-center gap-2 bg-[#F7F5F2] rounded-2xl px-3 py-2">
                  <Wrench className="h-3.5 w-3.5 text-[#C0BEBA] shrink-0" />
                  <input type="text" value={panelTech} onChange={(e) => setPanelTech(e.target.value)}
                    placeholder="ช่างผู้รับผิดชอบ (ไม่บังคับ)"
                    className="flex-1 bg-transparent text-sm text-[#2D2D2D] placeholder:text-[#C0BEBA] focus:outline-none" />
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={handleClose}
                    className="flex-1 bg-[#F0EDE8] hover:bg-[#E5E5E3] rounded-2xl px-4 py-2.5 text-sm font-medium text-[#878681] hover:text-[#2D2D2D] transition-all active:scale-[0.98]">
                    ยกเลิก
                  </button>
                  <button type="button" onClick={handleAddPanels}
                    className="flex-1 bg-[#3B3A36] hover:opacity-90 text-white rounded-2xl px-4 py-2.5 text-sm font-medium transition-all active:scale-[0.98]">
                    เพิ่มในบิล
                  </button>
                </div>
              </div>
            </>
          )}

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

                {/* รุ่นรถ (แสดงจากรถที่เลือก) */}
                {vehicleDisplay && (
                  <div className="flex items-center gap-2.5 bg-[#F0EDE8] rounded-2xl px-4 py-2.5 border border-[#E5E0DA]">
                    <span className="text-xs text-[#878681] shrink-0">รุ่นรถ</span>
                    <span className="text-sm font-semibold text-[#2D2D2D] truncate">{vehicleDisplay}</span>
                    <span className="text-[10px] text-[#C0BEBA] shrink-0 ml-auto">ดึงจากบิล</span>
                  </div>
                )}

                {/* ราคา */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="tint-price" className="text-sm font-semibold text-[#2D2D2D]">ราคา (บาท) *</label>
                    <div className="flex items-center gap-1.5">
                      {priceEntry?.ref && (
                        <span className="text-xs text-[#9ca3af] line-through px-1">
                          {formatCurrency(priceEntry.ref)}
                        </span>
                      )}
                      {priceEntry?.sell && (
                        <span className="text-xs text-[#5C6B62] font-medium bg-[#5C6B62]/10 px-2 py-0.5 rounded-full">
                          พิเศษ {formatCurrency(priceEntry.sell)}
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
                {carType && brand && priceNum > 0 && (
                  <div className="bg-[#F0EDE8] rounded-2xl px-4 py-3 flex items-center justify-between border border-[#E5E0DA]">
                    <div>
                      <p className="text-xs text-[#878681] mb-0.5">รายการที่จะเพิ่ม</p>
                      <p className="text-sm font-semibold text-[#2D2D2D]">
                        ฟิล์มกรองแสง{brand !== 'อื่นๆ' ? ` ${brand}` : ''}{vehicleDisplay ? ` — ${vehicleDisplay}` : ''} ({carType})
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
