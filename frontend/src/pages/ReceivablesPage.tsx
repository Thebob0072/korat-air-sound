import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Loader2, CreditCard, AlertCircle, CheckCircle2, Clock, FileText, Phone, UserRound } from 'lucide-react';
import { getOrders } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Order } from '@/types';

// ── helpers ───────────────────────────────────────────────────────────────────

function isOverdue(dueDate: string | null | undefined) {
  return !!dueDate && new Date(dueDate) < new Date();
}

function dueDays(dueDate: string | null | undefined) {
  if (!dueDate) return null;
  const diff = Math.ceil((new Date(dueDate).getTime() - Date.now()) / 86_400_000);
  return diff;
}

// ── Group orders by customer ──────────────────────────────────────────────────

interface CustomerGroup {
  customerId: string | null;
  name: string | null;
  phone: string | null;
  orders: Order[];
  total: number;
  hasOverdue: boolean;
}

function groupByCustomer(orders: Order[]): CustomerGroup[] {
  const map = new Map<string, CustomerGroup>();

  for (const o of orders) {
    const c = o.vehicle?.customer;
    const key = c?.id ?? `anon-${o.vehicle?.id ?? o.id}`;
    if (!map.has(key)) {
      map.set(key, {
        customerId: c?.id ?? null,
        name: c?.name ?? null,
        phone: c?.phone ?? null,
        orders: [],
        total: 0,
        hasOverdue: false,
      });
    }
    const group = map.get(key)!;
    group.orders.push(o);
    group.total += Number(o.totalAmount);
    if (isOverdue(o.dueDate)) group.hasOverdue = true;
  }

  return Array.from(map.values()).sort((a, b) => {
    // Overdue first, then by earliest due date
    if (a.hasOverdue !== b.hasOverdue) return a.hasOverdue ? -1 : 1;
    const aMin = Math.min(...a.orders.map((o) => o.dueDate ? new Date(o.dueDate).getTime() : Infinity));
    const bMin = Math.min(...b.orders.map((o) => o.dueDate ? new Date(o.dueDate).getTime() : Infinity));
    return aMin - bMin;
  });
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ReceivablesPage() {
  const navigate = useNavigate();

  const { data: orders = [], isPending, isError } = useQuery({
    queryKey: ['orders', 'InvoicePending'],
    queryFn: () => getOrders({ status: 'InvoicePending' }),
  });

  const groups = groupByCustomer(orders);
  const totalOwed = orders.reduce((s, o) => s + Number(o.totalAmount), 0);
  const overdueCount = orders.filter((o) => isOverdue(o.dueDate)).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#1A1917] tracking-tight">รายงานลูกหนี้</h1>
        <p className="text-sm text-[#878681] mt-0.5">ออเดอร์วางบิลเครดิต 30 วันที่ยังไม่ได้ชำระ</p>
      </div>

      {/* Summary cards */}
      {!isPending && !isError && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="bg-white rounded-[18px] border border-[#E5E5E3] p-4 shadow-[0_2px_8px_rgb(0,0,0,0.04)]">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className="h-4 w-4 text-[#878681]" />
              <p className="text-xs font-semibold text-[#878681] uppercase tracking-wide">ค้างชำระทั้งหมด</p>
            </div>
            <p className="text-2xl font-mono font-black text-[#2D2D2D] tabular-nums">{formatCurrency(totalOwed)}</p>
            <p className="text-xs text-[#878681] mt-1">{orders.length} ออเดอร์ · {groups.length} ลูกค้า</p>
          </div>
          <div className={`rounded-[18px] border p-4 shadow-[0_2px_8px_rgb(0,0,0,0.04)] ${overdueCount > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-[#E5E5E3]'}`}>
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className={`h-4 w-4 ${overdueCount > 0 ? 'text-red-500' : 'text-[#878681]'}`} />
              <p className={`text-xs font-semibold uppercase tracking-wide ${overdueCount > 0 ? 'text-red-600' : 'text-[#878681]'}`}>เกินกำหนดชำระ</p>
            </div>
            <p className={`text-2xl font-mono font-black tabular-nums ${overdueCount > 0 ? 'text-red-600' : 'text-[#2D2D2D]'}`}>{overdueCount}</p>
            <p className={`text-xs mt-1 ${overdueCount > 0 ? 'text-red-400' : 'text-[#878681]'}`}>ออเดอร์</p>
          </div>
          <div className="bg-white rounded-[18px] border border-[#E5E5E3] p-4 shadow-[0_2px_8px_rgb(0,0,0,0.04)] col-span-2 sm:col-span-1">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-[#878681]" />
              <p className="text-xs font-semibold text-[#878681] uppercase tracking-wide">ครบกำหนดใน 7 วัน</p>
            </div>
            <p className="text-2xl font-mono font-black text-amber-600 tabular-nums">
              {orders.filter((o) => { const d = dueDays(o.dueDate); return d !== null && d >= 0 && d <= 7; }).length}
            </p>
            <p className="text-xs text-[#878681] mt-1">ออเดอร์</p>
          </div>
        </div>
      )}

      {/* Content */}
      {isPending ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-[#878681]" />
        </div>
      ) : isError ? (
        <div className="text-center py-16 text-red-500 text-sm">โหลดข้อมูลไม่สำเร็จ</div>
      ) : groups.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-[#878681]">
          <CheckCircle2 className="h-12 w-12 text-emerald-300" strokeWidth={1} />
          <p className="text-sm font-medium text-emerald-600">ไม่มีลูกหนี้คงค้าง</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <div
              key={group.customerId ?? group.orders[0].id}
              className={`bg-white rounded-[20px] border shadow-[0_2px_12px_rgb(0,0,0,0.04)] overflow-hidden ${
                group.hasOverdue ? 'border-red-200' : 'border-[#E5E5E3]'
              }`}
            >
              {/* Customer header */}
              <div className={`flex items-center gap-3 px-5 py-4 border-b ${group.hasOverdue ? 'bg-red-50 border-red-100' : 'bg-[#FAF9F7] border-[#F0EDE8]'}`}>
                <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${group.hasOverdue ? 'bg-red-100' : 'bg-[#F0EDE8]'}`}>
                  <UserRound className={`h-4 w-4 ${group.hasOverdue ? 'text-red-500' : 'text-[#878681]'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-[#2D2D2D]">
                      {group.name ?? <span className="text-[#C0BEBA] italic font-normal text-sm">ไม่มีชื่อ</span>}
                    </p>
                    {group.hasOverdue && (
                      <span className="text-[10px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">เกินกำหนด</span>
                    )}
                  </div>
                  {group.phone && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <Phone className="h-3 w-3 text-[#878681]" />
                      <span className="font-mono text-xs text-[#878681]">{group.phone}</span>
                    </div>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="font-mono font-black text-lg text-[#2D2D2D]">{formatCurrency(group.total)}</p>
                  <p className="text-xs text-[#878681]">{group.orders.length} ออเดอร์</p>
                </div>
              </div>

              {/* Orders */}
              {group.orders.map((o) => {
                const days = dueDays(o.dueDate);
                const over = isOverdue(o.dueDate);
                return (
                  <button
                    key={o.id}
                    onClick={() => navigate(`/orders/${o.id}`)}
                    className="w-full flex items-center gap-3 px-5 py-3.5 border-b border-[#F7F5F2] last:border-0 hover:bg-[#F7F5F2] transition-colors text-left"
                  >
                    <FileText className="h-4 w-4 text-[#C0BEBA] shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-sm font-semibold text-[#3B3A36]">{o.orderNumber}</span>
                        <span className="font-mono text-xs text-[#878681]">
                          {o.vehicle?.licensePlate}
                        </span>
                      </div>
                      <p className="text-xs mt-0.5">
                        <span className="text-[#878681]">วางบิล {formatDate(o.createdAt).split(' ')[0]}</span>
                        {o.dueDate && (
                          <span className={`ml-2 font-semibold ${over ? 'text-red-600' : days !== null && days <= 7 ? 'text-amber-600' : 'text-blue-600'}`}>
                            {over
                              ? `เกินกำหนด ${Math.abs(days!)} วัน`
                              : days === 0
                              ? 'ครบกำหนดวันนี้'
                              : `ครบใน ${days} วัน · ${new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short' }).format(new Date(o.dueDate))}`}
                          </span>
                        )}
                      </p>
                    </div>
                    <span className="font-mono font-semibold text-sm text-[#2D2D2D] shrink-0">{formatCurrency(o.totalAmount)}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
