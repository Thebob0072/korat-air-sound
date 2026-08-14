import { useRef, useEffect, useState } from 'react';
import { Check } from 'lucide-react';

export const CAR_BRANDS = [
  // ญี่ปุ่น
  'Toyota', 'Honda', 'Isuzu', 'Mitsubishi', 'Nissan', 'Mazda',
  'Suzuki', 'Subaru', 'Lexus', 'Daihatsu',
  // เกาหลี
  'Hyundai', 'Kia', 'Genesis',
  // อเมริกา
  'Ford', 'Chevrolet', 'Jeep', 'Cadillac', 'GMC',
  // เยอรมัน
  'Mercedes-Benz', 'BMW', 'Audi', 'Volkswagen', 'Porsche',
  'MINI', 'Volvo', 'Land Rover', 'Jaguar',
  // ฝรั่งเศส / อิตาลี
  'Peugeot', 'Renault', 'Citroën', 'Fiat', 'Alfa Romeo',
  // จีน / EV
  'MG', 'BYD', 'NETA', 'GWM', 'Haval', 'ORA', 'AION', 'Zeekr',
  'Chery', 'OMODA', 'Jaecoo',
  // อื่นๆ
  'อื่นๆ',
];

interface CarBrandSelectProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

export function CarBrandSelect({
  value,
  onChange,
  placeholder = 'Toyota',
  className = '',
  autoFocus = false,
}: CarBrandSelectProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = value.trim()
    ? CAR_BRANDS.filter((b) => b.toLowerCase().includes(value.toLowerCase()))
    : CAR_BRANDS;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className={`relative ${className}`} ref={wrapRef}>
      <input
        ref={inputRef}
        autoFocus={autoFocus}
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        className="w-full bg-[#F0EDE8] border-0 rounded-2xl px-3 py-2.5 text-sm font-medium text-[#2D2D2D] placeholder:text-[#C0BEBA] placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-[#3B3A36]/15 transition-all"
      />
      {open && filtered.length > 0 && (
        <div className="absolute top-full left-0 z-[60] mt-1.5 w-56 bg-[#FDFCFA] rounded-2xl shadow-[0_8px_32px_rgb(0,0,0,0.14)] border border-[#E8E4DF] overflow-hidden">
          <div className="max-h-52 overflow-y-auto">
            {filtered.map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => {
                  onChange(b === 'อื่นๆ' ? '' : b);
                  setOpen(false);
                  setTimeout(() => inputRef.current?.focus(), 50);
                }}
                className={`w-full text-left px-4 py-2 text-sm border-b border-[#F0EDE8] last:border-0 transition-colors flex items-center justify-between gap-2 ${
                  value === b
                    ? 'bg-[#F0EDE8] font-semibold text-[#3B3A36]'
                    : b === 'อื่นๆ'
                    ? 'text-[#878681] hover:bg-[#F7F5F2] italic'
                    : 'hover:bg-[#F7F5F2] text-[#2D2D2D]'
                }`}
              >
                <span className="truncate">{b}</span>
                {value === b && <Check className="h-3 w-3 text-[#3B3A36] shrink-0" strokeWidth={3} />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
