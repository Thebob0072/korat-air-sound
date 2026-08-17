import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Building2, Plus, Phone, MapPin, ChevronRight, X, Check, Pencil, Trash2, Car } from 'lucide-react';
import { useBusiness } from '@/context/BusinessContext';
import type { Business, PosCategory } from '@/lib/business';
import { CATEGORY_PRESETS } from '@/lib/business';

// ── Create / Edit form ────────────────────────────────────────────────────────

interface FormData {
  name: string; tagline: string; address: string; phone: string;
  printWidth: 58 | 80; receiptFooter: string;
  posCategories: PosCategory[];
}
const EMPTY: FormData = {
  name: '', tagline: '', address: '', phone: '',
  printWidth: 58, receiptFooter: 'ขอบคุณที่ใช้บริการ',
  posCategories: CATEGORY_PRESETS.auto.categories,
};

function BusinessForm({
  initial = EMPTY,
  onSave,
  onCancel,
  title,
}: {
  initial?: FormData;
  onSave: (data: FormData) => void;
  onCancel: () => void;
  title: string;
}) {
  const [form, setForm] = useState<FormData>(initial);
  const set = (k: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));
  const valid = form.name.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-[24px] w-full max-w-md shadow-[0_20px_60px_rgb(0,0,0,0.2)] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#F0EDE8]">
          <h2 className="text-base font-bold text-[#2D2D2D]">{title}</h2>
          <button onClick={onCancel} className="h-8 w-8 rounded-full flex items-center justify-center text-[#878681] hover:bg-[#F0EDE8] transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {[
            { key: 'name' as const,    label: 'ชื่อธุรกิจ *',     placeholder: 'Korat Air & Sound',  type: 'text' },
            { key: 'tagline' as const, label: 'คำอธิบาย',          placeholder: 'ร้านแอร์รถยนต์ ฟิล์มกรองแสง', type: 'text' },
            { key: 'phone' as const,   label: 'เบอร์โทรศัพท์',    placeholder: '093-321-8634',       type: 'tel' },
          ].map(({ key, label, placeholder, type }) => (
            <div key={key}>
              <label className="block text-xs font-semibold text-[#878681] uppercase tracking-wide mb-1.5">{label}</label>
              <input
                type={type}
                value={form[key]}
                onChange={set(key)}
                placeholder={placeholder}
                className="w-full h-11 px-4 text-sm bg-[#F7F5F2] border-0 rounded-2xl focus:ring-2 focus:ring-[#3B3A36]/15 focus:outline-none transition-all"
              />
            </div>
          ))}
          <div>
            <label className="block text-xs font-semibold text-[#878681] uppercase tracking-wide mb-1.5">ที่อยู่</label>
            <textarea
              value={form.address}
              onChange={set('address')}
              placeholder="711-715 ถ.ท้าวสุระ อ.เมือง จ.นครราชสีมา 30000"
              rows={2}
              className="w-full px-4 py-3 text-sm bg-[#F7F5F2] border-0 rounded-2xl focus:ring-2 focus:ring-[#3B3A36]/15 focus:outline-none transition-all resize-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#878681] uppercase tracking-wide mb-1.5">ขนาดกระดาษปริ้น</label>
            <div className="flex gap-2">
              {([58, 80] as const).map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, printWidth: w }))}
                  className={`flex-1 h-11 rounded-2xl text-sm font-semibold transition-all ${
                    form.printWidth === w ? 'bg-[#3B3A36] text-white' : 'bg-[#F7F5F2] text-[#878681] hover:bg-[#ECEAE6]'
                  }`}
                >
                  {w} mm
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#878681] uppercase tracking-wide mb-1.5">ข้อความท้ายใบเสร็จ</label>
            <input
              type="text"
              value={form.receiptFooter}
              onChange={set('receiptFooter')}
              placeholder="ขอบคุณที่ใช้บริการ"
              className="w-full h-11 px-4 text-sm bg-[#F7F5F2] border-0 rounded-2xl focus:ring-2 focus:ring-[#3B3A36]/15 focus:outline-none transition-all"
            />
          </div>

          {/* POS Category config */}
          <div>
            <label className="block text-xs font-semibold text-[#878681] uppercase tracking-wide mb-2">หมวดหมู่หน้า POS</label>
            {/* Preset buttons */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {Object.entries(CATEGORY_PRESETS).map(([key, preset]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, posCategories: preset.categories.map(c => ({ ...c })) }))}
                  className="px-3 h-7 rounded-lg text-xs font-medium bg-[#F0EDE8] text-[#4A4845] hover:bg-[#E5E2DE] transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>
            {/* Toggle + rename each category */}
            <div className="space-y-2">
              {form.posCategories.map((cat, idx) => (
                <div key={cat.value} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setForm((f) => {
                      const cats = f.posCategories.map((c, i) => i === idx ? { ...c, enabled: !c.enabled } : c);
                      return { ...f, posCategories: cats };
                    })}
                    className={`w-10 h-6 rounded-full transition-colors shrink-0 ${cat.enabled ? 'bg-[#3B3A36]' : 'bg-[#D5D2CE]'}`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full mx-1 transition-transform ${cat.enabled ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                  <input
                    type="text"
                    value={cat.label}
                    onChange={(e) => setForm((f) => {
                      const cats = f.posCategories.map((c, i) => i === idx ? { ...c, label: e.target.value } : c);
                      return { ...f, posCategories: cats };
                    })}
                    className={`flex-1 h-9 px-3 text-sm rounded-xl border-0 focus:ring-2 focus:ring-[#3B3A36]/15 focus:outline-none transition-all ${
                      cat.enabled ? 'bg-[#F7F5F2] text-[#111110]' : 'bg-[#F0EDE8] text-[#9A9794] line-through'
                    }`}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="px-6 pb-6 flex gap-2">
          <button onClick={onCancel} className="flex-1 h-12 bg-[#F0EDE8] hover:bg-[#E5E5E3] text-[#878681] text-sm font-semibold rounded-2xl transition-all">
            ยกเลิก
          </button>
          <button
            onClick={() => valid && onSave(form)}
            disabled={!valid}
            className="flex-1 h-12 bg-[#3B3A36] hover:opacity-90 disabled:opacity-30 text-white text-sm font-semibold rounded-2xl transition-all flex items-center justify-center gap-2"
          >
            <Check className="h-4 w-4" />
            บันทึก
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Business card ─────────────────────────────────────────────────────────────

function BusinessCard({
  biz, isSelected, onSelect, onEdit, onDelete, canDelete,
}: {
  biz: Business; isSelected: boolean; onSelect: () => void;
  onEdit: () => void; onDelete: () => void; canDelete: boolean;
}) {
  const isKorat = biz.id === 'korat-air-sound';
  return (
    <div
      className={`relative bg-white rounded-[20px] border-2 transition-all cursor-pointer group ${
        isSelected ? 'border-[#3B3A36] shadow-[0_4px_20px_rgb(0,0,0,0.12)]' : 'border-[#E5E5E3] hover:border-[#C0BEBA] shadow-[0_2px_8px_rgb(0,0,0,0.04)]'
      }`}
      onClick={onSelect}
    >
      {isSelected && (
        <div className="absolute top-3 right-3 h-6 w-6 bg-[#3B3A36] rounded-full flex items-center justify-center">
          <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
        </div>
      )}

      <div className="p-5">
        {/* Icon + name */}
        <div className="flex items-start gap-3.5 mb-3">
          <div className={`h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 ${
            isKorat ? 'bg-[#3B3A36]' : 'bg-[#F0EDE8]'
          }`}>
            {isKorat
              ? <Car className="h-6 w-6 text-white" />
              : <Building2 className="h-6 w-6 text-[#878681]" />
            }
          </div>
          <div className="min-w-0 flex-1 pr-6">
            <p className="font-bold text-[#2D2D2D] leading-tight">{biz.name}</p>
            {biz.tagline && <p className="text-xs text-[#878681] mt-0.5 leading-snug">{biz.tagline}</p>}
          </div>
        </div>

        {/* Details */}
        <div className="space-y-1.5 mt-3 pt-3 border-t border-[#F0EDE8]">
          {biz.phone && (
            <div className="flex items-center gap-2 text-xs text-[#878681]">
              <Phone className="h-3 w-3 shrink-0" />
              <span className="font-mono">{biz.phone}</span>
            </div>
          )}
          {biz.address && (
            <div className="flex items-start gap-2 text-xs text-[#878681]">
              <MapPin className="h-3 w-3 shrink-0 mt-0.5" />
              <span className="leading-snug">{biz.address}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between mt-3 pt-2">
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={onEdit}
              className="h-7 w-7 rounded-xl flex items-center justify-center text-[#878681] hover:bg-[#F0EDE8] hover:text-[#2D2D2D] transition-colors"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            {canDelete && (
              <button
                onClick={onDelete}
                className="h-7 w-7 rounded-xl flex items-center justify-center text-[#878681] hover:bg-red-50 hover:text-red-500 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <div className={`flex items-center gap-1 text-xs font-semibold transition-colors ${isSelected ? 'text-[#3B3A36]' : 'text-[#C0BEBA]'}`}>
            {isSelected ? 'กำลังใช้งาน' : 'เลือก'}
            <ChevronRight className="h-3 w-3" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

type Modal = { type: 'create' } | { type: 'edit'; biz: Business } | null;

export default function BusinessSelectPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { businesses, selected, selectBusiness, createBusiness, editBusiness, removeBusiness } = useBusiness();
  const [modal, setModal] = useState<Modal>(null);

  const from = (location.state as { from?: string } | null)?.from ?? '/';

  const handleSelect = (id: string) => {
    selectBusiness(id);
  };

  const handleEnter = () => {
    if (selected) navigate(from, { replace: true });
  };

  const handleCreate = (data: FormData) => {
    const biz = createBusiness(data);
    selectBusiness(biz.id);
    setModal(null);
  };

  const handleEdit = (biz: Business, data: FormData) => {
    editBusiness(biz.id, data);
    setModal(null);
  };

  const handleDelete = (id: string) => {
    if (!confirm('ลบธุรกิจนี้ออกจากอุปกรณ์นี้?')) return;
    removeBusiness(id);
    if (selected?.id === id) selectBusiness('korat-air-sound');
  };

  return (
    <div className="min-h-screen bg-[#ECEAE6] flex flex-col items-center justify-center p-4 sm:p-8">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="h-16 w-16 bg-[#3B3A36] rounded-[22px] flex items-center justify-center mx-auto mb-4 shadow-[0_8px_24px_rgb(0,0,0,0.18)]">
          <Car className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-3xl font-black text-[#2D2D2D] tracking-tight">เลือกธุรกิจ</h1>
        <p className="text-[#878681] mt-2 text-sm">เลือกธุรกิจที่ต้องการเข้าใช้งาน</p>
      </div>

      {/* Business grid */}
      <div className="w-full max-w-2xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          {businesses.map((biz) => (
            <BusinessCard
              key={biz.id}
              biz={biz}
              isSelected={selected?.id === biz.id}
              onSelect={() => handleSelect(biz.id)}
              onEdit={() => setModal({ type: 'edit', biz })}
              onDelete={() => handleDelete(biz.id)}
              canDelete={biz.id !== 'korat-air-sound'}
            />
          ))}

          {/* Add new */}
          <button
            onClick={() => setModal({ type: 'create' })}
            className="h-full min-h-[120px] rounded-[20px] border-2 border-dashed border-[#C0BEBA] hover:border-[#878681] hover:bg-white/60 transition-all flex flex-col items-center justify-center gap-2 text-[#878681] hover:text-[#2D2D2D] group"
          >
            <div className="h-10 w-10 rounded-xl bg-[#F0EDE8] group-hover:bg-[#E5E5E3] flex items-center justify-center transition-colors">
              <Plus className="h-5 w-5" />
            </div>
            <span className="text-sm font-semibold">สร้างธุรกิจใหม่</span>
          </button>
        </div>

        {/* Enter button */}
        <button
          onClick={handleEnter}
          disabled={!selected}
          className="w-full h-14 bg-[#3B3A36] hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed text-white text-base font-bold rounded-2xl transition-all shadow-[0_4px_16px_rgb(0,0,0,0.15)] flex items-center justify-center gap-2"
        >
          ยืนยันธุรกิจ
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Modals */}
      {modal?.type === 'create' && (
        <BusinessForm
          title="สร้างธุรกิจใหม่"
          onSave={handleCreate}
          onCancel={() => setModal(null)}
        />
      )}
      {modal?.type === 'edit' && (
        <BusinessForm
          title="แก้ไขข้อมูลธุรกิจ"
          initial={{
            name: modal.biz.name,
            tagline: modal.biz.tagline,
            address: modal.biz.address,
            phone: modal.biz.phone,
            printWidth: modal.biz.printWidth ?? 58,
            receiptFooter: modal.biz.receiptFooter ?? 'ขอบคุณที่ใช้บริการ',
            posCategories: modal.biz.posCategories ?? CATEGORY_PRESETS.auto.categories,
          }}
          onSave={(data) => handleEdit(modal.biz, data)}
          onCancel={() => setModal(null)}
        />
      )}
    </div>
  );
}
