import * as Dialog from '@radix-ui/react-dialog';
import { useState } from 'react';
import { X, Wrench } from 'lucide-react';
import { usePOSCartStore } from '@/store/POSCartStore';
import { formatCurrency } from '@/lib/utils';
import { ProductCategory } from '@/types';

interface OtherItemModalProps {
  open: boolean;
  onClose: () => void;
}

export function OtherItemModal({ open, onClose }: OtherItemModalProps) {
  const addItem = usePOSCartStore((s) => s.addItem);

  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [technicianName, setTechnicianName] = useState('');
  const [error, setError] = useState('');

  const reset = () => {
    setName('');
    setPrice('');
    setTechnicianName('');
    setError('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleAdd = () => {
    if (!name.trim()) {
      setError('กรุณาระบุชื่อรายการ');
      return;
    }
    const priceNum = parseFloat(price);
    if (!price || isNaN(priceNum) || priceNum <= 0) {
      setError('กรุณาระบุราคาให้ถูกต้อง');
      return;
    }
    setError('');

    addItem({
      id: `SVC_${Date.now()}`,
      sku: 'SVC-CUSTOM',
      name: name.trim(),
      category: ProductCategory.ServiceFee,
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
          aria-describedby="other-desc"
          className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 bg-[#FDFCFA] rounded-[28px] shadow-[0_24px_80px_rgb(0,0,0,0.18)] border border-[#E8E4DF] focus:outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-[#E8E4DF]">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-[#E8E4DF] flex items-center justify-center">
                <Wrench className="h-4 w-4 text-[#5C6B62]" />
              </div>
              <div>
                <Dialog.Title className="text-base font-bold text-[#2D2D2D] leading-none">
                  เพิ่มรายการอื่นๆ
                </Dialog.Title>
                <p id="other-desc" className="text-xs text-[#878681] mt-0.5">ระบุชื่อรายการและราคา</p>
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
          <div className="px-6 py-5 space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 text-sm rounded-xl px-3 py-2 border border-red-100">
                {error}
              </div>
            )}

            {/* ชื่อรายการ */}
            <div>
              <label htmlFor="other-name" className="block text-sm font-semibold text-[#2D2D2D] mb-1.5">
                ชื่อรายการ *
              </label>
              <input
                id="other-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && document.getElementById('other-price')?.focus()}
                placeholder="เช่น ค่าแรง, ค่าน้ำยา, อื่นๆ…"
                className="w-full bg-[#F0EDE8] border-0 rounded-2xl px-4 py-2.5 text-sm text-[#2D2D2D] placeholder:text-[#C0BEBA] focus:outline-none focus:ring-2 focus:ring-[#3B3A36]/15 transition-all"
                autoFocus
                autoComplete="off"
              />
            </div>

            {/* ราคา */}
            <div>
              <label htmlFor="other-price" className="block text-sm font-semibold text-[#2D2D2D] mb-1.5">
                ราคา (บาท) *
              </label>
              <input
                id="other-price"
                type="number"
                inputMode="decimal"
                min="0"
                step="1"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                placeholder="0"
                className="w-full bg-[#F0EDE8] border-0 rounded-2xl px-4 py-2.5 text-sm text-[#2D2D2D] placeholder:text-[#C0BEBA] focus:outline-none focus:ring-2 focus:ring-[#3B3A36]/15 transition-all"
              />
            </div>

            {/* Preview */}
            {name.trim() && priceNum > 0 && (
              <div className="bg-[#F0EDE8] rounded-2xl px-4 py-3 flex items-center justify-between">
                <span className="text-sm text-[#2D2D2D] truncate max-w-[65%]">{name.trim()}</span>
                <span className="text-base font-bold text-[#3B3A36]">{formatCurrency(priceNum)}</span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 pb-6 flex gap-3">
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
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 py-3 rounded-2xl text-sm font-semibold text-[#878681] bg-[#F0EDE8] hover:bg-[#EAE7E2] transition-all"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleAdd}
              disabled={!name.trim() || priceNum <= 0}
              className="flex-1 py-3 rounded-2xl text-sm font-bold text-white bg-[#3B3A36] hover:bg-[#2D2D2D] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {priceNum > 0 ? `เพิ่มในบิล ${formatCurrency(priceNum)}` : 'เพิ่มในบิล'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
