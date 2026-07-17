import * as Dialog from '@radix-ui/react-dialog';
import { useState, useRef, useEffect } from 'react';
import { X, ChevronDown, Square as GlassIcon, Wrench } from 'lucide-react';
import { usePOSCartStore } from '@/store/POSCartStore';
import { formatCurrency } from '@/lib/utils';
import { ProductCategory } from '@/types';

interface GlassModalProps {
  open: boolean;
  onClose: () => void;
}

const GLASS_POSITIONS = [
  'กระจกบานหน้า',
  'กระจกข้างซ้าย',
  'กระจกข้างขวา',
  'กระจกประตูหลังซ้าย',
  'กระจกประตูหลังขวา',
  'กระจกท้าย',
] as const;

type GlassPosition = (typeof GLASS_POSITIONS)[number];

const GLASS_PRICES: Record<GlassPosition, number> = {
  'กระจกบานหน้า': 3500,
  'กระจกข้างซ้าย': 1200,
  'กระจกข้างขวา': 1200,
  'กระจกประตูหลังซ้าย': 900,
  'กระจกประตูหลังขวา': 900,
  'กระจกท้าย': 1800,
};

export function GlassModal({ open, onClose }: GlassModalProps) {
  const addItem = usePOSCartStore((s) => s.addItem);

  const [technicianName, setTechnicianName] = useState('');
  const [position, setPosition] = useState<GlassPosition | ''>('');
  const [showPosDrop, setShowPosDrop] = useState(false);
  const [carModel, setCarModel] = useState('');
  const [carYear, setCarYear] = useState('');
  const [price, setPrice] = useState('');
  const [error, setError] = useState('');
  const posDropRef = useRef<HTMLDivElement>(null);

  // close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (posDropRef.current && !posDropRef.current.contains(e.target as Node))
        setShowPosDrop(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // auto-fill price when position changes
  useEffect(() => {
    if (position) setPrice(String(GLASS_PRICES[position]));
  }, [position]);

  const reset = () => {
    setTechnicianName('');
    setPosition('');
    setShowPosDrop(false);
    setCarModel('');
    setCarYear('');
    setPrice('');
    setError('');
  };

  const handleClose = () => { reset(); onClose(); };

  const handleAdd = () => {
    if (!position) { setError('กรุณาเลือกตำแหน่งกระจก'); return; }
    if (!carModel.trim()) { setError('กรุณาระบุรุ่นรถ'); return; }
    const priceNum = parseFloat(price);
    if (!price || isNaN(priceNum) || priceNum <= 0) { setError('กรุณาระบุราคา'); return; }
    setError('');

    const yearPart = carYear ? ` ปี${carYear}` : '';
    const label = `${position} — ${carModel.trim()}${yearPart}`;

    addItem({
      id: `GL_${Date.now()}`,
      sku: 'GL-CUSTOM',
      name: label,
      category: ProductCategory.Glass,
      costPrice: 0,
      sellingPrice: priceNum,
      stockQuantity: 9999,
    }, 1, technicianName || undefined);

    reset();
    onClose();
  };

  const priceNum = parseFloat(price) || 0;

  return (
    <Dialog.Root open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content
          aria-describedby="glass-desc"
          className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 bg-[#FDFCFA] rounded-[28px] shadow-[0_24px_80px_rgb(0,0,0,0.18)] border border-[#E8E4DF] focus:outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-[#E8E4DF]">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-[#E8E4DF] flex items-center justify-center">
                <GlassIcon className="h-4 w-4 text-[#5C6B62]" />
              </div>
              <div>
                <Dialog.Title className="text-base font-bold text-[#2D2D2D] leading-none">
                  เพิ่มงานกระจกรถยนต์
                </Dialog.Title>
                <p id="glass-desc" className="text-xs text-[#878681] mt-0.5">ราคาจะแสดงอัตโนมัติเมื่อเลือกตำแหน่ง</p>
              </div>
            </div>
            <Dialog.Close aria-label="ปิด" onClick={handleClose}
              className="h-8 w-8 rounded-full flex items-center justify-center text-[#878681] hover:text-[#2D2D2D] hover:bg-[#F0EDE8] transition-all">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>

          {/* Body */}
          <div className="px-6 py-5 space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 text-sm rounded-xl px-3 py-2 border border-red-100">{error}</div>
            )}

            {/* ตำแหน่งกระจก */}
            <div>
              <label className="block text-sm font-semibold text-[#2D2D2D] mb-1.5">ตำแหน่งกระจก *</label>
              <div className="relative" ref={posDropRef}>
                <button type="button" onClick={() => setShowPosDrop((v) => !v)}
                  className="w-full bg-[#F0EDE8] rounded-2xl px-4 py-2.5 text-sm flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-[#3B3A36]/15 transition-all">
                  <span className={position ? 'text-[#2D2D2D]' : 'text-[#C0BEBA]'}>{position || 'เลือกตำแหน่ง'}</span>
                  <ChevronDown className={`h-4 w-4 text-[#878681] shrink-0 transition-transform duration-200 ${showPosDrop ? 'rotate-180' : ''}`} />
                </button>
                {showPosDrop && (
                  <div className="absolute top-full left-0 right-0 z-[60] mt-1.5 bg-[#FDFCFA] rounded-2xl shadow-[0_8px_32px_rgb(0,0,0,0.12)] border border-[#E8E4DF] overflow-hidden">
                    {GLASS_POSITIONS.map((pos) => (
                      <button key={pos} type="button"
                        onClick={() => { setPosition(pos); setShowPosDrop(false); }}
                        className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between border-b border-[#EAE7E2] last:border-0 transition-colors ${position === pos ? 'bg-[#F0EDE8] font-medium' : 'hover:bg-[#F5F2EE]'}`}>
                        <span>{pos}</span>
                        {position === pos && <span className="text-[#5C6B62] text-xs font-bold">✓</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* รุ่นรถ + ปีรถ */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="glass-model" className="block text-sm font-semibold text-[#2D2D2D] mb-1.5">รุ่นรถ *</label>
                <input id="glass-model" type="text" value={carModel}
                  onChange={(e) => setCarModel(e.target.value)}
                  placeholder="เช่น Toyota Fortuner"
                  className="w-full bg-[#F0EDE8] border-0 rounded-2xl px-4 py-2.5 text-sm text-[#2D2D2D] placeholder:text-[#C0BEBA] focus:outline-none focus:ring-2 focus:ring-[#3B3A36]/15 transition-all"
                  autoComplete="off" />
              </div>
              <div>
                <label htmlFor="glass-year" className="block text-sm font-semibold text-[#2D2D2D] mb-1.5">ปีรถ</label>
                <input id="glass-year" type="number" inputMode="numeric" value={carYear}
                  onChange={(e) => setCarYear(e.target.value)}
                  placeholder="เช่น 2022"
                  className="w-full bg-[#F0EDE8] border-0 rounded-2xl px-4 py-2.5 text-sm text-[#2D2D2D] placeholder:text-[#C0BEBA] focus:outline-none focus:ring-2 focus:ring-[#3B3A36]/15 transition-all" />
              </div>
            </div>

            {/* ราคา */}
            <div>
              <label htmlFor="glass-price" className="block text-sm font-semibold text-[#2D2D2D] mb-1.5">
                ราคา (บาท) *
                {position && <span className="ml-2 text-xs font-normal text-[#5C6B62]">แนะนำ {formatCurrency(GLASS_PRICES[position])}</span>}
              </label>
              <input id="glass-price" type="number" inputMode="decimal" min="0" value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0"
                className="w-full bg-[#F0EDE8] border-0 rounded-2xl px-4 py-2.5 text-sm text-[#2D2D2D] placeholder:text-[#C0BEBA] focus:outline-none focus:ring-2 focus:ring-[#3B3A36]/15 transition-all" />
            </div>

            {/* Preview */}
            {position && carModel.trim() && priceNum > 0 && (
              <div className="bg-[#F0EDE8] rounded-2xl px-4 py-3 flex items-center justify-between gap-3">
                <span className="text-sm text-[#2D2D2D] truncate">
                  {position} — {carModel.trim()}{carYear ? ` ปี${carYear}` : ''}
                </span>
                <span className="text-base font-bold text-[#3B3A36] shrink-0">{formatCurrency(priceNum)}</span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 pb-6 flex flex-col gap-3">
            {/* Technician name */}
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
            <div className="flex gap-3">
            <button type="button" onClick={handleClose}
              className="flex-1 py-3 rounded-2xl text-sm font-semibold text-[#878681] bg-[#F0EDE8] hover:bg-[#EAE7E2] transition-all">
              ยกเลิก
            </button>
            <button type="button" onClick={handleAdd}
              disabled={!position || !carModel.trim() || priceNum <= 0}
              className="flex-1 py-3 rounded-2xl text-sm font-bold text-white bg-[#3B3A36] hover:bg-[#2D2D2D] transition-all disabled:opacity-40 disabled:cursor-not-allowed">
              {priceNum > 0 ? `เพิ่มในบิล ${formatCurrency(priceNum)}` : 'เพิ่มในบิล'}
            </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
