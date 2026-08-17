import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  PieChart, LayoutDashboard, ShoppingBag, Users, Receipt,
  Package, BarChart2, ChevronsUpDown, Check, Plus, Settings,
  Menu, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBusiness } from '@/context/BusinessContext';

const NAV_ITEMS = [
  { href: '/dashboard',   label: 'ภาพรวม',   icon: PieChart },
  { href: '/',            label: 'POS',       icon: LayoutDashboard },
  { href: '/orders',      label: 'ออเดอร์',  icon: ShoppingBag },
  { href: '/customers',   label: 'ลูกค้า',   icon: Users },
  { href: '/receivables', label: 'ลูกหนี้',  icon: Receipt },
  { href: '/products',    label: 'สินค้า',   icon: Package },
  { href: '/reports',     label: 'สรุปยอด',  icon: BarChart2 },
];

const PALETTE = ['#C084FC', '#60A5FA', '#34D399', '#FBBF24', '#F87171', '#A78BFA', '#FB923C'];

function avatarBg(name: string): string {
  if (name === 'Korat Air & Sound') return '#3B3A36';
  let h = 0;
  for (const c of name) h = (h << 5) - h + c.charCodeAt(0);
  return PALETTE[Math.abs(h) % PALETTE.length];
}

function BusinessAvatar({ name, size = 22 }: { name: string; size?: number }) {
  return (
    <div
      className="flex items-center justify-center shrink-0 text-white font-bold select-none"
      style={{
        width: size,
        height: size,
        background: avatarBg(name),
        borderRadius: 6,
        fontSize: Math.floor(size * 0.5),
        lineHeight: 1,
      }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

function LiveClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="px-3 py-3">
      <p className="font-mono text-[13px] font-semibold text-[#111110] tabular-nums leading-none">
        {now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </p>
      <p className="text-[10px] text-[#6B6865] mt-1">
        {now.toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short' })}
      </p>
    </div>
  );
}

function BusinessSwitcher({ onClose }: { onClose?: () => void }) {
  const { businesses, selected, selectBusiness } = useBusiness();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div ref={ref} className="relative px-2 pt-3 pb-1.5">
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'w-full flex items-center gap-2 rounded-[8px] px-2 py-2 transition-colors duration-100',
          open ? 'bg-[#ECEAE6]' : 'hover:bg-[#F0EDE8]',
        )}
      >
        {selected ? (
          <BusinessAvatar name={selected.name} size={22} />
        ) : (
          <div className="w-[22px] h-[22px] rounded-[6px] bg-[#E5E3DF] shrink-0" />
        )}
        <span className="flex-1 text-left text-[13px] font-medium text-[#111110] truncate leading-none">
          {selected?.name ?? 'เลือกธุรกิจ'}
        </span>
        <ChevronsUpDown className="h-3.5 w-3.5 text-[#8A8784] shrink-0" />
      </button>

      {open && (
        <div className="absolute left-2 right-2 top-full mt-1 bg-white rounded-[10px] shadow-lg shadow-black/10 border border-[#E8E6E3] z-50 overflow-hidden py-1">
          {businesses.map((biz) => (
            <button
              key={biz.id}
              onClick={() => { selectBusiness(biz.id); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-[#F7F5F2] transition-colors duration-75 text-left"
            >
              <BusinessAvatar name={biz.name} size={20} />
              <span className="flex-1 text-[13px] font-medium text-[#111110] truncate">{biz.name}</span>
              {biz.id === selected?.id && <Check className="h-3.5 w-3.5 text-[#3B3A36] shrink-0" />}
            </button>
          ))}
          <div className="border-t border-[#F0EDE8] my-1" />
          <button
            onClick={() => { setOpen(false); onClose?.(); navigate('/select'); }}
            className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-[#F7F5F2] transition-colors duration-75 text-left"
          >
            <div className="w-5 h-5 rounded-[5px] bg-[#F0EDE8] flex items-center justify-center shrink-0">
              <Plus className="h-3 w-3 text-[#4A4845]" />
            </div>
            <span className="text-[13px] text-[#4A4845]">จัดการธุรกิจ</span>
          </button>
        </div>
      )}
    </div>
  );
}

function NavItem({
  href,
  label,
  icon: Icon,
  onClick,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  onClick?: () => void;
}) {
  const { pathname } = useLocation();
  const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
  return (
    <Link
      to={href}
      onClick={onClick}
      className={cn(
        'flex items-center gap-2.5 mx-2 px-2 rounded-[6px] h-8 text-[13px] font-medium transition-colors duration-100',
        active
          ? 'bg-[#2D2C28] text-white'
          : 'text-[#1A1917] hover:bg-[#ECEAE6] hover:text-[#111110]',
      )}
    >
      <Icon
        className={cn('h-4 w-4 shrink-0', active ? 'text-white' : 'text-[#4A4845]')}
        strokeWidth={active ? 2 : 1.75}
      />
      {label}
    </Link>
  );
}

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <BusinessSwitcher onClose={onClose} />
      <nav className="flex-1 flex flex-col gap-0.5 pt-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => (
          <NavItem key={item.href} {...item} onClick={onClose} />
        ))}
      </nav>
      <div className="border-t border-[#F0EDE8] mt-2">
        <div className="px-2 py-1.5">
          <button
            onClick={() => { onClose?.(); navigate('/select'); }}
            className="w-full flex items-center gap-2.5 px-2 rounded-[6px] h-8 text-[13px] font-medium text-[#4A4845] hover:bg-[#F0EDE8] hover:text-[#111110] transition-colors duration-100"
          >
            <Settings className="h-4 w-4 text-[#8A8784] shrink-0" strokeWidth={1.75} />
            ตั้งค่าธุรกิจ
          </button>
        </div>
        <LiveClock />
      </div>
    </div>
  );
}

export default function Sidebar() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { selected } = useBusiness();

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="no-print hidden lg:flex flex-col w-60 sticky top-0 h-screen shrink-0 bg-[#FAFAF8]">
        <SidebarContent />
      </aside>

      {/* Mobile top bar */}
      <header className="no-print lg:hidden fixed top-0 left-0 right-0 z-30 h-12 bg-[#FAFAF8] flex items-center px-3 gap-2.5">
        <button
          onClick={() => setDrawerOpen(true)}
          className="h-8 w-8 flex items-center justify-center rounded-[6px] hover:bg-[#F0EDE8] transition-colors"
          aria-label="เปิดเมนู"
        >
          <Menu className="h-5 w-5 text-[#111110]" />
        </button>
        {selected && <BusinessAvatar name={selected.name} size={22} />}
        <span className="text-[13px] font-medium text-[#111110] truncate flex-1">
          {selected?.name ?? ''}
        </span>
      </header>

      {/* Mobile overlay */}
      <div
        className={cn(
          'lg:hidden fixed inset-0 z-40 bg-black/25 transition-opacity duration-200',
          drawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
        onClick={() => setDrawerOpen(false)}
      />

      {/* Mobile drawer */}
      <div
        className={cn(
          'lg:hidden fixed top-0 left-0 bottom-0 z-50 w-64 bg-[#FAFAF8] shadow-xl transition-transform duration-200 ease-out',
          drawerOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center justify-between px-3 h-12 border-b border-[#F0EDE8] shrink-0">
          <span className="text-[13px] font-semibold text-[#111110]">เมนู</span>
          <button
            onClick={() => setDrawerOpen(false)}
            className="h-8 w-8 flex items-center justify-center rounded-[6px] hover:bg-[#F0EDE8] transition-colors"
          >
            <X className="h-4 w-4 text-[#4A4845]" />
          </button>
        </div>
        <div className="h-[calc(100%-3rem)]">
          <SidebarContent onClose={() => setDrawerOpen(false)} />
        </div>
      </div>
    </>
  );
}
