import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Car, ShoppingBag, Package, LayoutDashboard, Users, BarChart2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/',          label: 'POS',      icon: LayoutDashboard },
  { href: '/orders',    label: 'ออเดอร์',  icon: ShoppingBag },
  { href: '/customers', label: 'ลูกค้า',   icon: Users },
  { href: '/products',  label: 'สินค้า',   icon: Package },
  { href: '/reports',   label: 'สรุปยอด', icon: BarChart2 },
];

function LiveClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="hidden lg:flex flex-col items-end shrink-0 ml-auto pl-4">
      <p className="font-mono text-sm font-semibold text-[#2D2D2D] leading-none tabular-nums">
        {now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </p>
      <p className="text-[10px] text-[#878681] mt-0.5">
        {now.toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
      </p>
    </div>
  );
}

export default function Navbar() {
  const { pathname } = useLocation();

  return (
    <nav className="no-print bg-white border-b border-[#E5E5E3] sticky top-0 z-40">
      <div className="mx-auto px-4 sm:px-6 max-w-7xl flex items-center h-14 gap-1">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2.5 shrink-0 mr-5">
          <div className="h-8 w-8 bg-[#3B3A36] rounded-xl flex items-center justify-center shrink-0">
            <Car className="h-4 w-4 text-white" />
          </div>
          <div className="leading-none hidden lg:block">
            <p className="font-bold text-sm text-[#2D2D2D] tracking-tight">Korat Air &amp; Sound</p>
            <p className="text-[10px] text-[#878681] mt-0.5 font-normal">แอร์รถยนต์ · ฟิล์ม · กระจก</p>
          </div>
        </Link>

        {/* Nav items */}
        <div className="flex items-center gap-0.5">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                title={item.label}
                className={cn(
                  'relative flex items-center gap-2 rounded-xl text-sm font-medium transition-all duration-150',
                  'px-2.5 py-2 lg:px-3.5 lg:py-2',
                  active
                    ? 'bg-[#F0EDE8] text-[#2D2D2D]'
                    : 'text-[#9B9894] hover:text-[#2D2D2D] hover:bg-[#F7F5F2]',
                )}
              >
                <item.icon className={cn(
                  'h-[18px] w-[18px] shrink-0',
                  active ? 'text-[#3B3A36]' : 'text-[#C0BEBA]',
                )} strokeWidth={active ? 2 : 1.75} />
                <span className="hidden lg:inline">{item.label}</span>
                {active && (
                  <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 h-[3px] w-3 rounded-full bg-[#3B3A36]" />
                )}
              </Link>
            );
          })}
        </div>

        <LiveClock />
      </div>
    </nav>
  );
}


