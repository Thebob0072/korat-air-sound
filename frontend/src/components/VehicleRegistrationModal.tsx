import * as Dialog from '@radix-ui/react-dialog';
import { useState, useRef, useEffect } from 'react';
import { X, Car, ChevronDown, Check } from 'lucide-react';
// Check is used in customer checkboxes below
import { createCustomer, createVehicle } from '@/lib/api';
import { CarBrandSelect } from '@/components/CarBrandSelect';
import type { Vehicle } from '@/types';

// ── Thai provinces ─────────────────────────────────────────────────────────────

const PROVINCES = [
  'กรุงเทพมหานคร','กระบี่','กาญจนบุรี','กาฬสินธุ์','กำแพงเพชร',
  'ขอนแก่น','จันทบุรี','ฉะเชิงเทรา','ชลบุรี','ชัยนาท','ชัยภูมิ',
  'ชุมพร','เชียงราย','เชียงใหม่','ตรัง','ตราด','ตาก','นครนายก',
  'นครปฐม','นครพนม','นครราชสีมา','นครศรีธรรมราช','นครสวรรค์',
  'นนทบุรี','นราธิวาส','น่าน','บึงกาฬ','บุรีรัมย์','ปทุมธานี',
  'ประจวบคีรีขันธ์','ปราจีนบุรี','ปัตตานี','พระนครศรีอยุธยา',
  'พะเยา','พังงา','พัทลุง','พิจิตร','พิษณุโลก','เพชรบุรี','เพชรบูรณ์',
  'แพร่','ภูเก็ต','มหาสารคาม','มุกดาหาร','แม่ฮ่องสอน','ยโสธร',
  'ยะลา','ร้อยเอ็ด','ระนอง','ระยอง','ราชบุรี','ลพบุรี','ลำปาง',
  'ลำพูน','เลย','ศรีสะเกษ','สกลนคร','สงขลา','สตูล','สมุทรปราการ',
  'สมุทรสงคราม','สมุทรสาคร','สระแก้ว','สระบุรี','สิงห์บุรี','สุโขทัย',
  'สุพรรณบุรี','สุราษฎร์ธานี','สุรินทร์','หนองคาย','หนองบัวลำภู',
  'อ่างทอง','อำนาจเจริญ','อุดรธานี','อุตรดิตถ์','อุทัยธานี','อุบลราชธานี',
];

interface Props {
  initialQuery: string;
  onSuccess: (vehicle: Vehicle) => void;
  onClose: () => void;
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function VehicleRegistrationModal({ initialQuery, onSuccess, onClose }: Props) {
  // Plate
  const [plate, setPlate] = useState(() =>
    /^\d/.test(initialQuery) ? '' : initialQuery.replace(/\s*(กรุงเทพ|นครราชสีมา|[฀-๿\s]+)$/, '').trim() || initialQuery,
  );
  const [province, setProvince] = useState('นครราชสีมา');
  const [showProvinceDrop, setShowProvinceDrop] = useState(false);
  const [provinceSearch, setProvinceSearch] = useState('');

  // Vehicle info
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');

  // Customer checkboxes (all independent)
  const [hasPhone, setHasPhone] = useState(() => /^\d/.test(initialQuery));
  const [hasFirstName, setHasFirstName] = useState(false);
  const [hasLastName, setHasLastName] = useState(false);
  const [phone, setPhone] = useState(() => /^\d/.test(initialQuery) ? initialQuery : '');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const provinceDropRef = useRef<HTMLDivElement>(null);
  const provinceSearchRef = useRef<HTMLInputElement>(null);

  const filteredProvinces = PROVINCES.filter((p) =>
    p.includes(provinceSearch),
  );

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (provinceDropRef.current && !provinceDropRef.current.contains(e.target as Node)) {
        setShowProvinceDrop(false);
        setProvinceSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (showProvinceDrop) setTimeout(() => provinceSearchRef.current?.focus(), 50);
  }, [showProvinceDrop]);

  const handleSubmit = async () => {
    if (!plate.trim()) { setError('กรุณากรอกเลขทะเบียน'); return; }
    if (!brand.trim()) { setError('กรุณากรอกยี่ห้อรถ'); return; }
    if (!model.trim()) { setError('กรุณากรอกรุ่นรถ'); return; }
    if (hasPhone && !phone.trim()) { setError('กรุณากรอกเบอร์โทร'); return; }
    if (hasFirstName && !firstName.trim()) { setError('กรุณากรอกชื่อ'); return; }
    if (hasLastName && !lastName.trim()) { setError('กรุณากรอกนามสกุล'); return; }
    setError('');
    setLoading(true);
    try {
      let customerId: string | undefined;
      const nameParts = [hasFirstName ? firstName.trim() : '', hasLastName ? lastName.trim() : ''].filter(Boolean).join(' ');
      const hasAnyCustomer = (hasPhone && phone.trim()) || nameParts;
      if (hasAnyCustomer) {
        const customerData: { name?: string; phone?: string } = {};
        if (hasPhone && phone.trim()) customerData.phone = phone.trim();
        if (nameParts) customerData.name = nameParts;
        const customer = await createCustomer(customerData);
        customerId = customer.id;
      }
      const licensePlate = `${plate.trim()} ${province}`;
      const vehicle = await createVehicle({
        licensePlate,
        brand: brand.trim(),
        model: model.trim(),
        ...(customerId && { customerId }),
      });
      onSuccess(vehicle);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'เกิดข้อผิดพลาด กรุณาลองใหม่';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content
          aria-describedby="vreg-desc"
          className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 bg-[#FDFCFA] rounded-[28px] shadow-[0_24px_80px_rgb(0,0,0,0.18)] border border-[#E8E4DF] focus:outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-[#E8E4DF]">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-[#E8E4DF] flex items-center justify-center">
                <Car className="h-4 w-4 text-[#5C6B62]" />
              </div>
              <div>
                <Dialog.Title className="text-base font-bold text-[#2D2D2D] leading-none">
                  เพิ่มรถใหม่
                </Dialog.Title>
                <p id="vreg-desc" className="text-xs text-[#878681] mt-0.5">กรอกทะเบียนและจังหวัด</p>
              </div>
            </div>
            <Dialog.Close onClick={onClose}
              className="h-8 w-8 rounded-full flex items-center justify-center text-[#878681] hover:text-[#2D2D2D] hover:bg-[#F0EDE8] transition-all"
              aria-label="ปิด">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>

          <div className="px-6 py-5 space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 text-sm rounded-2xl px-4 py-2.5 border border-red-100">
                {error}
              </div>
            )}

            {/* Plate + Province */}
            <div>
              <label className="block text-xs font-semibold text-[#878681] uppercase tracking-wider mb-2">
                ทะเบียนรถ *
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={plate}
                  onChange={(e) => setPlate(e.target.value)}
                  placeholder="กข 1234"
                  autoFocus
                  className="flex-1 min-w-0 bg-[#F0EDE8] border-0 rounded-2xl px-4 py-3 text-sm font-mono font-bold text-[#2D2D2D] placeholder:text-[#C0BEBA] placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-[#3B3A36]/15 transition-all"
                />
                {/* Province dropdown */}
                <div className="relative shrink-0 w-[140px]" ref={provinceDropRef}>
                  <button
                    type="button"
                    onClick={() => setShowProvinceDrop((v) => !v)}
                    className="w-full h-full bg-[#F0EDE8] rounded-2xl px-3 py-3 text-sm text-[#2D2D2D] flex items-center justify-between gap-1 focus:outline-none focus:ring-2 focus:ring-[#3B3A36]/15 transition-all"
                  >
                    <span className="truncate text-xs">{province}</span>
                    <ChevronDown className={`h-3.5 w-3.5 text-[#878681] shrink-0 transition-transform ${showProvinceDrop ? 'rotate-180' : ''}`} />
                  </button>
                  {showProvinceDrop && (
                    <div className="absolute top-full right-0 z-[60] mt-1.5 w-52 bg-[#FDFCFA] rounded-2xl shadow-[0_8px_32px_rgb(0,0,0,0.14)] border border-[#E8E4DF] overflow-hidden">
                      <div className="p-2 border-b border-[#EAE7E2]">
                        <input
                          ref={provinceSearchRef}
                          type="text"
                          value={provinceSearch}
                          onChange={(e) => setProvinceSearch(e.target.value)}
                          placeholder="ค้นหาจังหวัด…"
                          className="w-full bg-[#F0EDE8] rounded-xl px-3 py-1.5 text-sm text-[#2D2D2D] placeholder:text-[#C0BEBA] focus:outline-none"
                        />
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        {filteredProvinces.map((p) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => { setProvince(p); setShowProvinceDrop(false); setProvinceSearch(''); }}
                            className={`w-full text-left px-4 py-2 text-sm border-b border-[#F0EDE8] last:border-0 transition-colors ${
                              province === p ? 'bg-[#F0EDE8] font-semibold text-[#3B3A36]' : 'hover:bg-[#F7F5F2] text-[#2D2D2D]'
                            }`}
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Brand + Model (required) */}
            <div className="grid grid-cols-2 gap-2">
              {/* Brand combobox */}
              <div>
                <label className="block text-xs font-semibold text-[#878681] mb-1.5">ยี่ห้อ *</label>
                <CarBrandSelect value={brand} onChange={setBrand} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#878681] mb-1.5">รุ่น *</label>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="Fortuner"
                  className="w-full bg-[#F0EDE8] border-0 rounded-2xl px-3 py-2.5 text-sm font-medium text-[#2D2D2D] placeholder:text-[#C0BEBA] placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-[#3B3A36]/15 transition-all"
                />
              </div>
            </div>

            {/* Customer info (optional checkboxes — multiple allowed) */}
            <div>
              <p className="text-xs font-semibold text-[#878681] uppercase tracking-wider mb-2.5">
                ข้อมูลลูกค้า <span className="font-normal normal-case text-[#C0BEBA]">(ไม่บังคับ — เลือกได้หลายอย่าง)</span>
              </p>
              <div className="space-y-2">

                {/* Phone checkbox */}
                <div>
                  <button
                    type="button"
                    onClick={() => setHasPhone((v) => !v)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border-2 transition-all ${
                      hasPhone ? 'border-[#3B3A36] bg-[#3B3A36]' : 'border-[#E8E4DF] bg-[#F7F5F2] hover:border-[#D8D5D0]'
                    }`}
                  >
                    <div className={`h-5 w-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                      hasPhone ? 'border-white bg-white' : 'border-[#C0BEBA]'
                    }`}>
                      {hasPhone && <Check className="h-3 w-3 text-[#3B3A36]" strokeWidth={3} />}
                    </div>
                    <span className={`text-sm font-medium ${hasPhone ? 'text-white' : 'text-[#2D2D2D]'}`}>เบอร์โทร</span>
                  </button>
                  {hasPhone && (
                    <div className="mt-1.5 px-1">
                      <input
                        type="tel"
                        inputMode="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="08X-XXX-XXXX"
                        autoFocus
                        className="w-full bg-[#F0EDE8] border-0 rounded-2xl px-4 py-2.5 text-sm font-mono text-[#2D2D2D] placeholder:text-[#C0BEBA] placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-[#3B3A36]/15 transition-all"
                      />
                    </div>
                  )}
                </div>

                {/* First name checkbox */}
                <div>
                  <button
                    type="button"
                    onClick={() => setHasFirstName((v) => !v)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border-2 transition-all ${
                      hasFirstName ? 'border-[#3B3A36] bg-[#3B3A36]' : 'border-[#E8E4DF] bg-[#F7F5F2] hover:border-[#D8D5D0]'
                    }`}
                  >
                    <div className={`h-5 w-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                      hasFirstName ? 'border-white bg-white' : 'border-[#C0BEBA]'
                    }`}>
                      {hasFirstName && <Check className="h-3 w-3 text-[#3B3A36]" strokeWidth={3} />}
                    </div>
                    <span className={`text-sm font-medium ${hasFirstName ? 'text-white' : 'text-[#2D2D2D]'}`}>ชื่อ</span>
                  </button>
                  {hasFirstName && (
                    <div className="mt-1.5 px-1">
                      <input
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="ชื่อจริง"
                        autoFocus
                        className="w-full bg-[#F0EDE8] border-0 rounded-2xl px-4 py-2.5 text-sm text-[#2D2D2D] placeholder:text-[#C0BEBA] focus:outline-none focus:ring-2 focus:ring-[#3B3A36]/15 transition-all"
                      />
                    </div>
                  )}
                </div>

                {/* Last name checkbox */}
                <div>
                  <button
                    type="button"
                    onClick={() => setHasLastName((v) => !v)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border-2 transition-all ${
                      hasLastName ? 'border-[#3B3A36] bg-[#3B3A36]' : 'border-[#E8E4DF] bg-[#F7F5F2] hover:border-[#D8D5D0]'
                    }`}
                  >
                    <div className={`h-5 w-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                      hasLastName ? 'border-white bg-white' : 'border-[#C0BEBA]'
                    }`}>
                      {hasLastName && <Check className="h-3 w-3 text-[#3B3A36]" strokeWidth={3} />}
                    </div>
                    <span className={`text-sm font-medium ${hasLastName ? 'text-white' : 'text-[#2D2D2D]'}`}>นามสกุล</span>
                  </button>
                  {hasLastName && (
                    <div className="mt-1.5 px-1">
                      <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="นามสกุล"
                        className="w-full bg-[#F0EDE8] border-0 rounded-2xl px-4 py-2.5 text-sm text-[#2D2D2D] placeholder:text-[#C0BEBA] focus:outline-none focus:ring-2 focus:ring-[#3B3A36]/15 transition-all"
                      />
                    </div>
                  )}
                </div>

              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 pb-6 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-[#F0EDE8] hover:bg-[#E5E5E3] rounded-2xl px-4 py-3 text-sm font-medium text-[#878681] hover:text-[#2D2D2D] transition-all active:scale-[0.98]"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 bg-[#3B3A36] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-2xl px-4 py-3 text-sm font-semibold transition-all active:scale-[0.98]"
            >
              {loading ? 'กำลังบันทึก…' : 'บันทึกและเปิดออเดอร์'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
