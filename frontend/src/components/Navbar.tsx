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

export default function Navbar() {
  const { pathname } = useLocation();

  return (
    <nav className="no-print bg-white border-b border-[#E5E5E3] sticky top-0 z-40">
      <div className="mx-auto px-4 sm:px-6 max-w-7xl flex items-center h-14">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2.5 shrink-0 mr-6">
          <div className="h-8 w-8 bg-[#3B3A36] rounded-xl flex items-center justify-center shrink-0">
            <Car className="h-4 w-4 text-white" />
          </div>
          <div className="leading-none hidden lg:block">
            <p className="font-semibold text-sm text-[#2D2D2D] tracking-tight">Korat Air &amp; Sound</p>
            <p className="text-[10px] text-[#878681] mt-0.5">ระบบจัดการร้าน</p>
          </div>
        </Link>

        {/* Nav items */}
        <div className="flex items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                title={item.label}
                className={cn(
                  'relative flex items-center gap-2 rounded-xl text-sm font-medium transition-all duration-150',
                  /* mobile/tablet: icon only square */
                  'px-2.5 py-2 lg:px-4 lg:py-2',
                  active
                    ? 'bg-[#F0EDE8] text-[#2D2D2D]'
                    : 'text-[#9B9894] hover:text-[#2D2D2D] hover:bg-[#F7F5F2]',
                )}
              >
                <item.icon className={cn(
                  'h-[18px] w-[18px] shrink-0',
                  active ? 'text-[#3B3A36]' : 'text-[#C0BEBA]',
                )} />
                {/* label: hidden until lg */}
                <span className="hidden lg:inline">{item.label}</span>
                {/* active dot */}
                {active && (
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 h-[3px] w-3 rounded-full bg-[#3B3A36]" />
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}


