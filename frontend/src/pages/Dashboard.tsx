import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Loader2, TrendingUp, CreditCard, Wrench, Clock,
  AlertCircle, CheckCircle2, ArrowRight, Car, Users,
} from 'lucide-react';
import { getDashboard } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Order } from '@/types';

// ── helpers ───────────────────────────────────────────────────────────────────

const STATUS_TH: Record<string, string> = {
  InProgress: 'กำลังทำ', WaitingForParts: 'รออะไหล่', Ready: 'รอส่งมอบ',
  InvoicePending: 'วางบิล', Paid: 'ชำระแล้ว',
};
const STATUS_DOT: Record<string, string> = {
  InProgress: 'bg-sky-500', WaitingForParts: 'bg-amber-400', Ready: 'bg-emerald-500',
  InvoicePending: 'bg-blue-500', Paid: 'bg-emerald-500',
};

function dueDays(iso: string | null | undefined) {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

// ── KPI card ──────────────────────────────────────────────────────────────────

function KpiCard({
  label, amount, sub, accent = false, warn = false,
}: {
  label: string; amount: string; sub: string; accent?: boolean; warn?: boolean;
}) {
  return (
    <div className={`rounded-[20px] border p-5 shadow-[0_2px_12px_rgb(0,0,0,0.04)] ${
      warn ? 'bg-red-50 border-red-200' : accent ? 'bg-[#3B3A36] border-[#3B3A36]' : 'bg-white border-[#E5E5E3]'
    }`}>
      <p className={`text-xs font-semibold uppercase tracking-wider mb-3 ${
        warn ? 'text-red-500' : accent ? 'text-white/60' : 'text-[#9B9894]'
      }`}>{label}</p>
      <p className={`font-mono font-black text-2xl leading-none tabular-nums ${
        warn ? 'text-red-600' : accent ? 'text-white' : 'text-[#2D2D2D]'
      }`}>{amount}</p>
      <p className={`text-xs mt-2 ${
        warn ? 'text-red-400' : accent ? 'text-white/50' : 'text-[#9B9894]'
      }`}>{sub}</p>
    </div>
  );
}

// ── Order row ─────────────────────────────────────────────────────────────────

function OrderRow({ order, onClick }: { order: Order; onClick: () => void }) {
  const plate = order.vehicle?.licensePlate ?? '—';
  const customer = order.vehicle?.customer;
  const status = order.status;
  const days = dueDays(order.dueDate);
  const overdue = status === 'InvoicePending' && days !== null && days < 0;

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#F7F5F2] transition-colors text-left border-b border-[#F7F5F2] last:border-0"
    >
      <span className={`h-2 w-2 rounded-full shrink-0 ${STATUS_DOT[status] ?? 'bg-[#C0BEBA]'}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-bold text-[#2D2D2D] tracking-wide">{plate}</span>
          <span className="text-xs text-[#878681]">{STATUS_TH[status] ?? status}</span>
          {overdue && <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full">เกินกำหนด</span>}
          {status === 'InvoicePending' && days !== null && days >= 0 && days <= 7 && (
            <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">ครบใน {days} วัน</span>
          )}
        </div>
        <p className="text-xs text-[#9B9894] mt-0.5 truncate">
          {customer?.name ?? customer?.phone ?? <span className="italic">ไม่ระบุ</span>}
          {' · '}{formatDate(order.updatedAt ?? order.createdAt).split(' ')[0]}
        </p>
      </div>
      <span className="font-mono text-sm font-semibold text-[#2D2D2D] shrink-0">
        {formatCurrency(order.totalAmount)}
      </span>
    </button>
  );
}

// ── Section card ─────────────────────────────────────────────────────────────

function Section({
  title, count, linkTo, linkLabel = 'ดูทั้งหมด', children, empty,
  onLinkClick,
}: {
  title: string; count?: number; linkTo?: string; linkLabel?: string;
  children: React.ReactNode; empty?: boolean; onLinkClick?: () => void;
}) {
  return (
    <div className="bg-white rounded-[20px] border border-[#E5E5E3] overflow-hidden shadow-[0_2px_12px_rgb(0,0,0,0.04)]">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#F0EDE8]">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-[#2D2D2D]">{title}</h2>
          {count !== undefined && (
            <span className="text-xs font-bold text-[#878681] bg-[#F0EDE8] px-2 py-0.5 rounded-full">{count}</span>
          )}
        </div>
        {linkTo && !empty && (
          <button onClick={onLinkClick} className="flex items-center gap-1 text-xs text-[#878681] hover:text-[#2D2D2D] transition-colors font-medium">
            {linkLabel} <ArrowRight className="h-3 w-3" />
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Dashboard() {
  const navigate = useNavigate();

  const { data, isPending, isError } = useQuery({
    queryKey: ['dashboard'],
    queryFn: getDashboard,
    refetchInterval: 60_000, // auto-refresh every minute
  });

  if (isPending) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-[#878681]" />
      </div>
    );
  }

  if (isError || !data) {
    return <div className="text-center py-16 text-red-500 text-sm">โหลด dashboard ไม่สำเร็จ</div>;
  }

  const { revenue, active, credit, recentPaid, newCustomersMonth } = data;
  const overdueOrders = credit.orders.filter((o) => dueDays(o.dueDate) !== null && dueDays(o.dueDate)! < 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1917] tracking-tight">ภาพรวม</h1>
          <p className="text-sm text-[#878681] mt-0.5">
            {new Date().toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <button
          onClick={() => navigate('/')}
          className="h-10 px-4 bg-[#3B3A36] hover:opacity-90 text-white text-sm font-semibold rounded-2xl transition-all flex items-center gap-2"
        >
          <Car className="h-4 w-4" />
          เปิดบิล
        </button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label="วันนี้"
          amount={formatCurrency(revenue.today.amount)}
          sub={`${revenue.today.orders} ออเดอร์`}
          accent
        />
        <KpiCard
          label="เดือนนี้"
          amount={formatCurrency(revenue.thisMonth.amount)}
          sub={`${revenue.thisMonth.orders} ออเดอร์`}
        />
        <KpiCard
          label="งานกำลังทำ"
          amount={String(active.count)}
          sub="InProgress · รออะไหล่ · รอส่งมอบ"
        />
        <KpiCard
          label="ค้างชำระ (เครดิต)"
          amount={formatCurrency(credit.total)}
          sub={`${credit.orders.length} ออเดอร์${credit.overdueCount > 0 ? ` · เกินกำหนด ${credit.overdueCount}` : ''}`}
          warn={credit.overdueCount > 0}
        />
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-[16px] border border-[#E5E5E3] px-4 py-3.5 flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs text-[#9B9894] font-medium">ยอดปีนี้</p>
            <p className="font-mono font-bold text-[#2D2D2D]">{formatCurrency(revenue.thisYear.amount)}</p>
          </div>
        </div>
        <div className="bg-white rounded-[16px] border border-[#E5E5E3] px-4 py-3.5 flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
            <Users className="h-4 w-4 text-violet-600" />
          </div>
          <div>
            <p className="text-xs text-[#9B9894] font-medium">ลูกค้าใหม่เดือนนี้</p>
            <p className="font-mono font-bold text-[#2D2D2D]">{newCustomersMonth} คน</p>
          </div>
        </div>
        <div className="bg-white rounded-[16px] border border-[#E5E5E3] px-4 py-3.5 flex items-center gap-3 col-span-2 sm:col-span-1">
          <div className="h-9 w-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
            <CreditCard className="h-4 w-4 text-amber-600" />
          </div>
          <div>
            <p className="text-xs text-[#9B9894] font-medium">เกินกำหนดชำระ</p>
            <p className={`font-mono font-bold ${credit.overdueCount > 0 ? 'text-red-600' : 'text-[#2D2D2D]'}`}>
              {credit.overdueCount} ออเดอร์
            </p>
          </div>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Active orders */}
        <Section
          title="งานที่กำลังดำเนินการ"
          count={active.count}
          linkTo="/orders"
          onLinkClick={() => navigate('/orders')}
          empty={active.count === 0}
        >
          {active.count === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-[#9B9894]">
              <CheckCircle2 className="h-8 w-8 text-emerald-300" strokeWidth={1} />
              <p className="text-sm">ไม่มีงานค้างอยู่</p>
            </div>
          ) : (
            <div>
              {active.orders.map((o) => (
                <OrderRow key={o.id} order={o} onClick={() => navigate(`/orders/${o.id}`)} />
              ))}
            </div>
          )}
        </Section>

        {/* Credit / receivables */}
        <Section
          title="ลูกหนี้เครดิต"
          count={credit.orders.length}
          linkTo="/receivables"
          linkLabel="หน้าลูกหนี้"
          onLinkClick={() => navigate('/receivables')}
          empty={credit.orders.length === 0}
        >
          {credit.orders.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-[#9B9894]">
              <CheckCircle2 className="h-8 w-8 text-emerald-300" strokeWidth={1} />
              <p className="text-sm">ไม่มีลูกหนี้คงค้าง</p>
            </div>
          ) : (
            <div>
              {/* Overdue first */}
              {overdueOrders.length > 0 && (
                <div className="px-4 py-2 bg-red-50 border-b border-red-100 flex items-center gap-2">
                  <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                  <span className="text-xs font-semibold text-red-600">เกินกำหนด {overdueOrders.length} ออเดอร์</span>
                </div>
              )}
              {credit.orders.slice(0, 8).map((o) => (
                <OrderRow key={o.id} order={o} onClick={() => navigate(`/orders/${o.id}`)} />
              ))}
              {credit.orders.length > 8 && (
                <button
                  onClick={() => navigate('/receivables')}
                  className="w-full py-3 text-xs text-[#878681] hover:text-[#2D2D2D] hover:bg-[#F7F5F2] transition-colors flex items-center justify-center gap-1"
                >
                  + อีก {credit.orders.length - 8} ออเดอร์ <ArrowRight className="h-3 w-3" />
                </button>
              )}
            </div>
          )}
        </Section>

        {/* Recent paid */}
        <Section
          title="ชำระเงินล่าสุด"
          count={recentPaid.length}
          linkTo="/orders"
          onLinkClick={() => navigate('/orders')}
          empty={recentPaid.length === 0}
        >
          {recentPaid.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-[#9B9894]">
              <Clock className="h-8 w-8 text-[#E5E5E3]" strokeWidth={1} />
              <p className="text-sm">ยังไม่มีออเดอร์ที่ชำระ</p>
            </div>
          ) : (
            <div>
              {recentPaid.map((o) => (
                <OrderRow key={o.id} order={o} onClick={() => navigate(`/orders/${o.id}`)} />
              ))}
            </div>
          )}
        </Section>

        {/* Quick actions */}
        <div className="bg-white rounded-[20px] border border-[#E5E5E3] p-5 shadow-[0_2px_12px_rgb(0,0,0,0.04)]">
          <h2 className="text-sm font-bold text-[#2D2D2D] mb-4">ทางลัด</h2>
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { label: 'เปิดบิลใหม่',   icon: Car,         to: '/',             bg: 'bg-[#3B3A36]', fg: 'text-white' },
              { label: 'ดูออเดอร์',     icon: Wrench,      to: '/orders',       bg: 'bg-[#F0EDE8]', fg: 'text-[#3B3A36]' },
              { label: 'ลูกค้า',        icon: Users,       to: '/customers',    bg: 'bg-[#F0EDE8]', fg: 'text-[#3B3A36]' },
              { label: 'ลูกหนี้',       icon: CreditCard,  to: '/receivables',  bg: credit.overdueCount > 0 ? 'bg-red-500' : 'bg-[#F0EDE8]', fg: credit.overdueCount > 0 ? 'text-white' : 'text-[#3B3A36]' },
            ].map(({ label, icon: Icon, to, bg, fg }) => (
              <button
                key={to}
                onClick={() => navigate(to)}
                className={`${bg} ${fg} rounded-2xl p-4 flex flex-col gap-2.5 items-start hover:opacity-90 active:scale-[0.98] transition-all`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-sm font-semibold leading-tight">{label}</span>
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
