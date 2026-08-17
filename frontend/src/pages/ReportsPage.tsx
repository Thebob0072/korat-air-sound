import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Infinity, AlertCircle, RefreshCw } from 'lucide-react';
import { getReportSummary } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import type { ReportSummary } from '@/lib/api';

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  AirCon:      'ระบบแอร์',
  Tint:        'ฟิล์มกรองแสง',
  Glass:       'กระจกรถยนต์',
  CentralLock: 'กุญแจรีโมท',
  Sound:       'เครื่องเสียง',
  ServiceFee:  'อื่นๆ / ค่าบริการ',
};

const CATEGORY_STYLE: Record<string, { bar: string; pct: string; border: string }> = {
  AirCon:      { bar: 'bg-sky-400',    pct: 'text-sky-600',    border: 'border-sky-100' },
  Tint:        { bar: 'bg-violet-400', pct: 'text-violet-600', border: 'border-violet-100' },
  Glass:       { bar: 'bg-teal-400',   pct: 'text-teal-600',   border: 'border-teal-100' },
  CentralLock: { bar: 'bg-amber-400',  pct: 'text-amber-600',  border: 'border-amber-100' },
  Sound:       { bar: 'bg-orange-400', pct: 'text-orange-600', border: 'border-orange-100' },
  ServiceFee:  { bar: 'bg-stone-300',  pct: 'text-stone-500',  border: 'border-stone-200' },
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
  const names = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
  return `${names[m - 1]}\n${String(y).slice(2)}`;
}

function compactNum(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `${(v / 1_000).toFixed(v < 10_000 ? 1 : 0)}K`;
  return String(Math.round(v));
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface MiniStatCardProps {
  label: string;
  revenue: number;
  orders: number;
  accent: string;
}
function MiniStatCard({ label, revenue, orders, accent }: MiniStatCardProps) {
  return (
    <div className="bg-white rounded-[20px] border border-[#E5E5E3] p-2.5 sm:p-4 relative overflow-hidden shadow-[0_1px_6px_rgb(0,0,0,0.04)]">
      <div className={`absolute top-0 left-0 right-0 h-[3px] ${accent}`} />
      <p className="text-[10px] sm:text-[11px] font-semibold text-[#878681] mt-0.5 tracking-wide truncate">{label}</p>
      <p className="font-mono font-black text-sm sm:text-[22px] text-[#2D2D2D] tabular-nums mt-1 leading-none break-all">
        {formatCurrency(revenue)}
      </p>
      <p className="text-[10px] sm:text-xs text-[#C0BEBA] mt-1.5">{orders.toLocaleString()} ออเดอร์</p>
    </div>
  );
}

const CHART_H = 140;

interface BarChartProps {
  data: Array<{ label: string; revenue: number; orders: number }>;
}
function BarChart({ data }: BarChartProps) {
  const max = Math.max(...data.map((d) => d.revenue), 1);
  const [hovered, setHovered] = useState<number | null>(null);
  const step = data.length > 20 ? Math.ceil(data.length / 15) : 1;

  return (
    <div className="flex gap-2 sm:gap-3">
      {/* Y-axis labels */}
      <div
        className="flex flex-col justify-between shrink-0 pb-5 text-right"
        style={{ width: 40, height: CHART_H + 20 }}
      >
        {[1, 0.75, 0.5, 0.25, 0].map((f, i) => (
          <span key={i} className="text-[9px] text-[#C0BEBA] tabular-nums leading-none block">
            {f === 0 ? '0' : compactNum(max * f)}
          </span>
        ))}
      </div>

      {/* Chart canvas */}
      <div className="flex-1 relative">
        {/* Horizontal grid lines */}
        {[0.75, 0.5, 0.25].map((f) => (
          <div
            key={f}
            className="absolute left-0 right-0 border-t border-[#F0EDE8] pointer-events-none"
            style={{ bottom: 20 + f * CHART_H }}
          />
        ))}

        {/* Tooltip */}
        {hovered !== null && (
          <div
            className="absolute z-10 pointer-events-none flex flex-col items-center"
            style={{
              bottom: 20 + (data[hovered].revenue / max) * CHART_H + 10,
              left: `${((hovered + 0.5) / data.length) * 100}%`,
              transform: 'translateX(-50%)',
            }}
          >
            <div className="bg-[#2D2D2D] text-white text-[10px] font-medium rounded-xl px-2.5 py-1.5 whitespace-nowrap shadow-lg">
              {formatCurrency(data[hovered].revenue)} · {data[hovered].orders} ออเดอร์
            </div>
            <div className="w-1.5 h-1.5 bg-[#2D2D2D] rotate-45 -mt-[3px]" />
          </div>
        )}

        {/* Bars */}
        <div className="flex items-end gap-0.5 sm:gap-[3px]" style={{ height: CHART_H + 20 }}>
          {data.map((d, i) => {
            const barH = d.revenue > 0 ? Math.max((d.revenue / max) * CHART_H, 3) : 2;
            const isLast = i === data.length - 1;
            const isHov = hovered === i;
            return (
              <div
                key={i}
                className="flex-1 flex flex-col items-center justify-end cursor-default"
                style={{ height: CHART_H + 20 }}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              >
                <div
                  className={`w-full rounded-t-[3px] transition-colors duration-150 ${
                    isHov ? 'bg-[#2D2D2D]' : isLast ? 'bg-[#3B3A36]' : d.revenue > 0 ? 'bg-[#C8C5C0]' : 'bg-[#ECEAE6]'
                  }`}
                  style={{ height: barH }}
                />
                {i % step === 0 ? (
                  <p className="text-center leading-tight whitespace-pre-line mt-1" style={{ height: 20, fontSize: 8, color: '#C0BEBA' }}>
                    {d.label}
                  </p>
                ) : (
                  <div style={{ height: 20 }} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface CategoryCardProps {
  category: string;
  revenue: number;
  orders: number;
  pct: number;
}
function CategoryCard({ category, revenue, orders, pct }: CategoryCardProps) {
  const label = CATEGORY_LABELS[category] ?? category;
  const s = CATEGORY_STYLE[category] ?? { bar: 'bg-gray-300', pct: 'text-gray-500', border: 'border-gray-200' };

  return (
    <div className={`bg-white rounded-[20px] border ${s.border} p-4 relative overflow-hidden`}>
      <div className={`absolute top-0 left-0 right-0 h-[3px] ${s.bar}`} />
      <p className="text-[11px] font-semibold text-[#878681] mt-0.5 leading-snug">{label}</p>
      <p className="font-mono font-black text-lg text-[#2D2D2D] tabular-nums mt-1.5 leading-none">
        {formatCurrency(revenue)}
      </p>
      <div className="flex items-center justify-between mt-1.5">
        <p className="text-xs text-[#C0BEBA]">{orders} ออเดอร์</p>
        {pct > 0 && (
          <span className={`text-[10px] font-bold tabular-nums ${s.pct}`}>
            {pct.toFixed(1)}%
          </span>
        )}
      </div>
      {pct > 0 && (
        <div className="mt-2.5 h-1 bg-[#F0EDE8] rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${s.bar} transition-all duration-700`} style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const [chartView, setChartView]     = useState<ChartView>('monthly');
  const [monthPreset, setMonthPreset] = useState(12);
  const queryClient = useQueryClient();

  const { data, isPending, isError } = useQuery<ReportSummary>({
    queryKey: ['reports', 'summary', monthPreset],
    queryFn:  () => getReportSummary({ days: 30, months: monthPreset }),
    staleTime: 60_000,
    retry: 1,
  });

  if (isPending) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-[#878681]" />
      </div>
    );
  }
  if (isError || !data) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1917] tracking-tight">สรุปยอดขาย</h1>
          <p className="text-sm text-[#878681] mt-0.5">ภาพรวมรายได้และสถิติออเดอร์</p>
        </div>
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center">
            <AlertCircle className="h-7 w-7 text-red-400" strokeWidth={1.5} />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-[#2D2D2D]">เชื่อมต่อ backend ไม่ได้</p>
            <p className="text-xs text-[#9B9894] mt-1">ตรวจสอบว่า backend กำลังทำงานอยู่</p>
          </div>
          <button
            onClick={() => queryClient.refetchQueries({ queryKey: ['reports'] })}
            className="flex items-center gap-2 px-4 py-2 bg-[#3B3A36] hover:opacity-90 text-white text-sm font-medium rounded-xl transition-all"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            ลองใหม่
          </button>
        </div>
      </div>
    );
  }

  const chartData =
    chartView === 'daily'
      ? data.daily.map((d) => ({ ...d, label: shortDate(d.date) }))
      : data.monthly.map((d) => ({ ...d, label: shortMonth(d.month) }));

  const totalRevAllCat = data.byCategory.reduce((s, c) => s + c.revenue, 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#1A1917] tracking-tight">สรุปยอดขาย</h1>
        <p className="text-sm text-[#878681] mt-0.5">ภาพรวมรายได้และสถิติออเดอร์</p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Hero: all-time */}
        <div className="bg-white rounded-[24px] border border-[#E5E5E3] p-6 flex flex-col justify-between min-h-[152px] relative overflow-hidden shadow-[0_2px_12px_rgb(0,0,0,0.04)]">
          <div className="absolute top-5 bottom-5 left-0 w-[3px] bg-[#3B3A36] rounded-r-full" />
          <div className="pl-4">
            <div className="flex items-center gap-2 mb-1">
              <Infinity className="h-3.5 w-3.5 text-[#3B3A36]" />
              <p className="text-[11px] font-semibold text-[#878681] tracking-wide">ยอดรวมทั้งหมด</p>
            </div>
            <p className="text-[10px] text-[#C0BEBA]">ตั้งแต่เปิดระบบ</p>
          </div>
          <div className="pl-4">
            <p className="font-mono font-black text-[30px] text-[#2D2D2D] tabular-nums leading-none">
              {formatCurrency(data.allTime.revenue)}
            </p>
            <p className="text-xs text-[#C0BEBA] mt-1.5">{data.allTime.orders.toLocaleString()} ออเดอร์</p>
          </div>
        </div>

        {/* Today / Month / Year */}
        <div className="lg:col-span-2 grid grid-cols-3 gap-2 sm:gap-3">
          <MiniStatCard label="วันนี้"   revenue={data.today.revenue}     orders={data.today.orders}     accent="bg-sky-400" />
          <MiniStatCard label="เดือนนี้" revenue={data.thisMonth.revenue} orders={data.thisMonth.orders} accent="bg-violet-400" />
          <MiniStatCard label="ปีนี้"    revenue={data.thisYear.revenue}  orders={data.thisYear.orders}  accent="bg-emerald-400" />
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-[24px] border border-[#E5E5E3] p-5 shadow-[0_2px_12px_rgb(0,0,0,0.04)]">
        <div className="flex items-start justify-between flex-wrap gap-3 mb-5">
          <div>
            <p className="font-semibold text-[#2D2D2D]">กราฟยอดขาย</p>
            <p className="text-xs text-[#878681] mt-0.5">
              {chartView === 'daily' ? 'ย้อนหลัง 30 วัน' : `ย้อนหลัง ${monthPreset} เดือน`}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex bg-[#F0EDE8] rounded-full p-1 gap-0.5">
              {(['daily', 'monthly'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setChartView(v)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                    chartView === v ? 'bg-[#3B3A36] text-white shadow-sm' : 'text-[#878681] hover:text-[#2D2D2D]'
                  }`}
                >
                  {v === 'daily' ? 'รายวัน' : 'รายเดือน'}
                </button>
              ))}
            </div>
            {chartView === 'monthly' && (
              <div className="flex bg-[#F0EDE8] rounded-full p-1 gap-0.5">
                {MONTH_PRESETS.map((p) => (
                  <button
                    key={p.months}
                    onClick={() => setMonthPreset(p.months)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                      monthPreset === p.months ? 'bg-[#3B3A36] text-white shadow-sm' : 'text-[#878681] hover:text-[#2D2D2D]'
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

      {/* Category cards */}
      <div className="bg-white rounded-[24px] border border-[#E5E5E3] p-5 shadow-[0_2px_12px_rgb(0,0,0,0.04)]">
        <p className="font-semibold text-[#2D2D2D] mb-4">ยอดขายแยกหมวดหมู่</p>
        {data.byCategory.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10 text-[#878681]">
            <div className="h-12 w-12 rounded-2xl bg-[#F0EDE8] flex items-center justify-center">
              <span className="text-xl">📊</span>
            </div>
            <p className="text-sm">ยังไม่มีข้อมูล</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {data.byCategory.map((c) => {
              const pct = totalRevAllCat > 0 ? (c.revenue / totalRevAllCat) * 100 : 0;
              return (
                <CategoryCard
                  key={c.category}
                  category={c.category}
                  revenue={c.revenue}
                  orders={c.orders}
                  pct={pct}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
