import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, TrendingUp, CalendarDays, Calendar, Infinity } from 'lucide-react';
import { getReportSummary } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import type { ReportSummary } from '@/lib/api';

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  AirCon:      'ระบบแอร์',
  Tint:        'ฟิล์มกรองแสง',
  Glass:       'กระจกรถยนต์',
  CentralLock: 'เครื่องเสียง',
  ServiceFee:  'อื่นๆ / ค่าบริการ',
};

const CATEGORY_COLORS: Record<string, string> = {
  AirCon:      'bg-sky-400',
  Tint:        'bg-violet-400',
  Glass:       'bg-teal-400',
  CentralLock: 'bg-amber-400',
  ServiceFee:  'bg-[#C0BEBA]',
};

type ChartView = 'daily' | 'monthly';

const MONTH_PRESETS = [
  { label: '12 เดือน', months: 12 },
  { label: '24 เดือน', months: 24 },
  { label: '3 ปี',    months: 36 },
] as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

function shortDate(iso: string) {
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

function shortMonth(ym: string) {
  const [y, m] = ym.split('-').map(Number);
  const thMonth = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
  return `${thMonth[m - 1]}\n${String(y).slice(2)}`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  sub?: string;
  revenue: number;
  orders: number;
  icon: React.ReactNode;
  accent?: string;
}
function StatCard({ label, sub, revenue, orders, icon, accent = 'bg-[#3B3A36]' }: StatCardProps) {
  return (
    <div className="bg-white rounded-[20px] p-5 shadow-[0_2px_12px_rgb(0,0,0,0.04)] border border-[#E5E5E3] flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-[#878681] uppercase tracking-wide">{label}</p>
          {sub && <p className="text-[10px] text-[#C0BEBA] mt-0.5">{sub}</p>}
        </div>
        <div className={`h-9 w-9 rounded-xl ${accent} flex items-center justify-center shrink-0`}>
          {icon}
        </div>
      </div>
      <div>
        <p className="font-mono font-black text-2xl text-[#2D2D2D] leading-none tabular-nums">
          {formatCurrency(revenue)}
        </p>
        <p className="text-xs text-[#878681] mt-1">{orders.toLocaleString()} ออเดอร์</p>
      </div>
    </div>
  );
}

interface BarChartProps {
  data: Array<{ label: string; revenue: number; orders: number }>;
  highlightLast?: boolean;
}
function BarChart({ data, highlightLast = true }: BarChartProps) {
  const max = Math.max(...data.map((d) => d.revenue), 1);
  const [hovered, setHovered] = useState<number | null>(null);

  // Determine label density (show every Nth label to avoid crowding)
  const step = data.length > 20 ? Math.ceil(data.length / 15) : 1;

  return (
    <div className="relative">
      {/* Tooltip */}
      {hovered !== null && (
        <div className="absolute -top-10 z-10 pointer-events-none"
          style={{ left: `${(hovered / data.length) * 100}%`, transform: 'translateX(-50%)' }}>
          <div className="bg-[#2D2D2D] text-white text-xs rounded-xl px-3 py-1.5 whitespace-nowrap shadow-lg">
            {formatCurrency(data[hovered].revenue)} · {data[hovered].orders} ออเดอร์
          </div>
        </div>
      )}

      <div className="flex items-end gap-0.5 sm:gap-1 h-40 overflow-hidden">
        {data.map((d, i) => {
          const pct = (d.revenue / max) * 100;
          const isLast = highlightLast && i === data.length - 1;
          const isHovered = hovered === i;
          return (
            <div
              key={i}
              className="flex-1 flex flex-col items-center gap-1 group cursor-default"
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            >
              <div className="w-full flex items-end" style={{ height: '132px' }}>
                <div
                  className={`w-full rounded-t-sm transition-all duration-300 ${
                    isHovered
                      ? 'bg-[#2D2D2D]'
                      : isLast
                      ? 'bg-[#3B3A36]'
                      : d.revenue > 0
                      ? 'bg-[#C8C5C0]'
                      : 'bg-[#ECEAE6]'
                  }`}
                  style={{ height: pct > 0 ? `${Math.max(pct, 2)}%` : '2px' }}
                />
              </div>
              {i % step === 0 && (
                <p className="text-[8px] sm:text-[9px] text-[#C0BEBA] text-center leading-none whitespace-pre-line">
                  {d.label}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const [chartView, setChartView]   = useState<ChartView>('monthly');
  const [monthPreset, setMonthPreset] = useState(12);

  const { data, isPending, isError } = useQuery<ReportSummary>({
    queryKey: ['reports', 'summary', monthPreset],
    queryFn: () => getReportSummary({ days: 30, months: monthPreset }),
    staleTime: 60_000, // re-fetch at most every minute
  });

  if (isPending) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-[#878681]" />
      </div>
    );
  }

  if (isError || !data) {
    return <div className="text-center py-16 text-red-500 text-sm">โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่</div>;
  }

  const chartData =
    chartView === 'daily'
      ? data.daily.map((d) => ({ ...d, label: shortDate(d.date) }))
      : data.monthly.map((d) => ({ ...d, label: shortMonth(d.month) }));

  const totalRevAllCat = data.byCategory.reduce((s, c) => s + c.revenue, 0);

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-[#2D2D2D]">สรุปยอดขาย</h1>

      {/* ── Summary cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label="วันนี้"
          revenue={data.today.revenue}
          orders={data.today.orders}
          icon={<CalendarDays className="h-4 w-4 text-white" />}
          accent="bg-sky-500"
        />
        <StatCard
          label="เดือนนี้"
          revenue={data.thisMonth.revenue}
          orders={data.thisMonth.orders}
          icon={<Calendar className="h-4 w-4 text-white" />}
          accent="bg-violet-500"
        />
        <StatCard
          label="ปีนี้"
          revenue={data.thisYear.revenue}
          orders={data.thisYear.orders}
          icon={<TrendingUp className="h-4 w-4 text-white" />}
          accent="bg-emerald-600"
        />
        <StatCard
          label="ทั้งหมด"
          sub="ตั้งแต่เปิดระบบ"
          revenue={data.allTime.revenue}
          orders={data.allTime.orders}
          icon={<Infinity className="h-4 w-4 text-white" />}
          accent="bg-[#3B3A36]"
        />
      </div>

      {/* ── Chart section ──────────────────────────────────────────────────── */}
      <div className="bg-white rounded-[20px] p-5 shadow-[0_2px_12px_rgb(0,0,0,0.04)] border border-[#E5E5E3]">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
          <div>
            <h2 className="text-base font-bold text-[#2D2D2D]">กราฟยอดขาย</h2>
            <p className="text-xs text-[#878681] mt-0.5">
              {chartView === 'daily' ? 'ย้อนหลัง 30 วัน' : `ย้อนหลัง ${monthPreset} เดือน`}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* View toggle */}
            <div className="flex bg-[#F0EDE8] rounded-full p-1 gap-1">
              {(['daily', 'monthly'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setChartView(v)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                    chartView === v
                      ? 'bg-[#3B3A36] text-white shadow-sm'
                      : 'text-[#878681] hover:text-[#2D2D2D]'
                  }`}
                >
                  {v === 'daily' ? 'รายวัน' : 'รายเดือน'}
                </button>
              ))}
            </div>
            {/* Month preset (only for monthly view) */}
            {chartView === 'monthly' && (
              <div className="flex bg-[#F0EDE8] rounded-full p-1 gap-1">
                {MONTH_PRESETS.map((p) => (
                  <button
                    key={p.months}
                    onClick={() => setMonthPreset(p.months)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                      monthPreset === p.months
                        ? 'bg-[#3B3A36] text-white shadow-sm'
                        : 'text-[#878681] hover:text-[#2D2D2D]'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <BarChart data={chartData} />
      </div>

      {/* ── Category breakdown ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-[20px] p-5 shadow-[0_2px_12px_rgb(0,0,0,0.04)] border border-[#E5E5E3]">
        <h2 className="text-base font-bold text-[#2D2D2D] mb-4">ยอดขายแยกหมวดหมู่</h2>

        {data.byCategory.length === 0 ? (
          <p className="text-sm text-[#878681] text-center py-8">ยังไม่มีข้อมูล</p>
        ) : (
          <div className="space-y-3">
            {data.byCategory.map((c) => {
              const pct = totalRevAllCat > 0 ? (c.revenue / totalRevAllCat) * 100 : 0;
              return (
                <div key={c.category}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className={`h-2.5 w-2.5 rounded-full ${CATEGORY_COLORS[c.category] ?? 'bg-gray-300'}`} />
                      <span className="text-sm font-medium text-[#2D2D2D]">
                        {CATEGORY_LABELS[c.category] ?? c.category}
                      </span>
                      <span className="text-xs text-[#878681]">({c.orders} ออเดอร์)</span>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <span className="text-sm font-mono font-semibold text-[#2D2D2D]">
                        {formatCurrency(c.revenue)}
                      </span>
                      <span className="text-xs text-[#878681] ml-2">{pct.toFixed(1)}%</span>
                    </div>
                  </div>
                  <div className="h-2 bg-[#F0EDE8] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${CATEGORY_COLORS[c.category] ?? 'bg-gray-300'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
