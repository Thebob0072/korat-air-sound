import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Loader2, FileText, AlertCircle, RefreshCw, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { DatePicker } from '@/components/ui/date-picker';
import { Pagination, PageSizeSelector } from '@/components/ui/pagination';
import { usePagination } from '@/hooks/usePagination';
import { getOrders, updateOrderStatus } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { isSameDay } from 'date-fns';
import type { OrderStatus } from '@/types';

const STATUS_LABELS: Record<OrderStatus, string> = {
  Draft: 'แบบร่าง',
  Quoted: 'ใบเสนอราคา',
  InProgress: 'กำลังซ่อม',
  WaitingForParts: 'รออะไหล่',
  Ready: 'รอส่งมอบ',
  InvoicePending: 'วางบิล',
  Paid: 'ชำระแล้ว',
  Cancelled: 'ยกเลิก',
};

const STATUS_DOT_ROW: Record<OrderStatus, string> = {
  Draft:           'bg-[#C0BEBA]',
  Quoted:          'bg-yellow-400',
  InProgress:      'bg-sky-400',
  WaitingForParts: 'bg-amber-400',
  Ready:           'bg-emerald-400',
  InvoicePending:  'bg-blue-400',
  Paid:            'bg-emerald-600',
  Cancelled:       'bg-red-400',
};

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning';

const STATUS_BADGE: Record<OrderStatus, BadgeVariant> = {
  Draft: 'secondary',
  Quoted: 'warning',
  InProgress: 'default',
  WaitingForParts: 'warning',
  Ready: 'success',
  InvoicePending: 'warning',
  Paid: 'success',
  Cancelled: 'destructive',
};

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  Draft:           'InProgress',
  Quoted:          'InProgress',
  InProgress:      'Ready',
  WaitingForParts: 'Ready',
};

const NEXT_LABEL: Partial<Record<OrderStatus, string>> = {
  Draft:           'รับรถแล้ว',
  Quoted:          'รับรถแล้ว',
  InProgress:      'งานเสร็จ',
  WaitingForParts: 'งานเสร็จ',
  Ready:           'ชำระเงิน',
};

const FILTERS: { value: string; label: string; dot?: string }[] = [
  { value: '',                label: 'ทั้งหมด' },
  { value: 'InProgress',     label: 'กำลังซ่อม',   dot: 'bg-sky-400' },
  { value: 'WaitingForParts',label: 'รออะไหล่',     dot: 'bg-amber-400' },
  { value: 'Ready',          label: 'รอส่งมอบ',     dot: 'bg-emerald-400' },
  { value: 'InvoicePending', label: 'วางบิล',       dot: 'bg-blue-400' },
  { value: 'Paid',           label: 'ชำระแล้ว',     dot: 'bg-emerald-600' },
  { value: 'Quoted',         label: 'ใบเสนอราคา',   dot: 'bg-yellow-400' },
  { value: 'Draft',          label: 'แบบร่าง' },
  { value: 'Cancelled',      label: 'ยกเลิก',       dot: 'bg-red-400' },
];

export default function OrdersPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('');
  const [dateFilter, setDateFilter] = useState<Date | undefined>();

  const advanceMutation = useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: OrderStatus }) => {
      const next = NEXT_STATUS[status];
      if (!next) throw new Error('ไม่มีสถานะถัดไป');
      return updateOrderStatus(orderId, next);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders', filter] });
    },
  });

  const { data: orders = [], isPending, isError } = useQuery({
    queryKey: ['orders', filter],
    queryFn: () => getOrders(filter ? { status: filter } : {}),
    retry: 1,
  });

  const filteredOrders = useMemo(() => {
    if (!dateFilter) return orders;
    return orders.filter((o) => isSameDay(new Date(o.createdAt), dateFilter));
  }, [orders, dateFilter]);

  const { paged, page, setPage, pageSize, setPageSize, totalPages, total } = usePagination(filteredOrders);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#1A1917] tracking-tight">ออเดอร์</h1>
        <p className="text-sm text-[#878681] mt-0.5">ประวัติงานและสถานะออเดอร์ทั้งหมด</p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        {/* Filter pills — scrollable, no wrap */}
        <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex-1 sm:min-w-0 pb-0.5">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 shrink-0 ${
                filter === f.value
                  ? 'bg-[#3B3A36] text-white shadow-sm'
                  : 'bg-white text-[#878681] hover:text-[#2D2D2D] hover:bg-[#F0EDE8]'
              }`}
            >
              {f.dot && (
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${filter === f.value ? 'bg-white/70' : f.dot}`} />
              )}
              {f.label}
            </button>
          ))}
        </div>
        {/* Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {!isPending && !isError && (
            <p className="text-sm text-[#878681] hidden sm:block">
              <span className="font-semibold text-[#2D2D2D]">{total}</span> ออเดอร์
              {dateFilter && <span className="ml-1.5 text-xs bg-[#F0EDE8] px-2 py-0.5 rounded-full">กรองตามวันที่</span>}
            </p>
          )}
          <div className="flex-1 sm:flex-none sm:w-40 min-w-[120px]">
            <DatePicker
              value={dateFilter}
              onChange={setDateFilter}
              placeholder="กรองตามวันที่"
              className={
                dateFilter
                  ? 'bg-white border-2 border-[#3B3A36] text-[#2D2D2D] shadow-sm'
                  : 'bg-white border border-[#D8D5D0] hover:border-[#3B3A36]/40'
              }
            />
          </div>
          <div className="hidden lg:block">
            <PageSizeSelector pageSize={pageSize} onPageSizeChange={setPageSize} />
          </div>
        </div>
      </div>

      {isPending ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-[#878681]" />
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center">
            <AlertCircle className="h-6 w-6 text-red-400" strokeWidth={1.5} />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-[#2D2D2D]">เชื่อมต่อ backend ไม่ได้</p>
            <p className="text-xs text-[#9B9894] mt-1">ตรวจสอบว่า backend กำลังทำงานอยู่</p>
          </div>
          <button
            onClick={() => queryClient.refetchQueries({ queryKey: ['orders'] })}
            className="flex items-center gap-2 px-4 py-2 bg-[#3B3A36] hover:opacity-90 text-white text-sm font-medium rounded-xl transition-all"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            ลองใหม่
          </button>
        </div>
      ) : (
        <>
          {/* ── Mobile/tablet cards (hidden on lg+) ──────────────────────── */}
          <div className="lg:hidden bg-white rounded-[20px] border border-[#E5E5E3] overflow-hidden shadow-[0_2px_12px_rgb(0,0,0,0.04)]">
            {paged.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-16 text-[#878681]">
                <FileText className="h-10 w-10 text-[#E5E5E3]" strokeWidth={1} />
                <span className="text-sm">ไม่มีออเดอร์ในหมวดนี้</span>
              </div>
            ) : (
              <div className="divide-y divide-[#F0EDE8]">
                {paged.map((order) => {
                  const isPendingThis = advanceMutation.isPending && advanceMutation.variables?.orderId === order.id;
                  const nextLabel = NEXT_LABEL[order.status];
                  return (
                    <div key={order.id}>
                      <div
                        onClick={() => navigate(`/orders/${order.id}`)}
                        className="w-full text-left px-4 py-3.5 active:bg-[#F7F5F2] transition-colors cursor-pointer"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`w-2 h-2 rounded-full shrink-0 mt-[3px] ${STATUS_DOT_ROW[order.status]}`} />
                            <span className="font-mono font-black text-[15px] tracking-wide text-[#2D2D2D] leading-tight">
                              {order.vehicle?.licensePlate ?? '—'}
                            </span>
                          </div>
                          <span className="font-mono font-bold text-[#2D2D2D] shrink-0 tabular-nums">
                            {formatCurrency(order.totalAmount)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-1.5 pl-4">
                          <div className="flex items-center gap-1.5 min-w-0 mr-2">
                            <span className="text-xs text-[#878681] truncate">
                              {order.vehicle?.customer?.name ?? order.vehicle?.customer?.phone ?? '—'}
                            </span>
                            <span className="text-[#D8D5D0] text-xs shrink-0">·</span>
                            <span className="text-xs text-[#9B9894] shrink-0">
                              {formatDate(order.createdAt).split(' ')[0]}
                            </span>
                          </div>
                          <Badge variant={STATUS_BADGE[order.status]} className="shrink-0">
                            {STATUS_LABELS[order.status]}
                          </Badge>
                        </div>
                        {order.status === 'InvoicePending' && order.dueDate && (
                          <p className={`text-[10px] font-semibold mt-1 pl-4 ${new Date(order.dueDate) < new Date() ? 'text-red-500' : 'text-blue-500'}`}>
                            ครบ {new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short' }).format(new Date(order.dueDate))}
                          </p>
                        )}
                      </div>
                      {nextLabel && (
                        <div className="px-4 py-2 border-t border-[#F7F5F2] bg-[#FDFCFA] flex justify-end">
                          {order.status === 'Ready' ? (
                            <button
                              onClick={() => navigate(`/orders/${order.id}`)}
                              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-[#3B3A36] text-white hover:opacity-90 transition-all"
                            >
                              {nextLabel}
                              <ChevronRight className="h-3 w-3" />
                            </button>
                          ) : (
                            <button
                              onClick={() => advanceMutation.mutate({ orderId: order.id, status: order.status })}
                              disabled={isPendingThis}
                              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-white border border-[#E5E5E3] hover:border-[#3B3A36]/30 text-[#3B3A36] transition-all disabled:opacity-40"
                            >
                              {isPendingThis && <Loader2 className="h-3 w-3 animate-spin" />}
                              {nextLabel}
                              <ChevronRight className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            <div className="px-4 pb-4">
              <Pagination
                total={total}
                page={page}
                pageSize={pageSize}
                totalPages={totalPages}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
              />
            </div>
          </div>

          {/* ── Desktop table (hidden below lg) ──────────────────────────── */}
          <div className="hidden lg:block bg-white rounded-[20px] border border-[#E5E5E3] overflow-hidden shadow-[0_2px_12px_rgb(0,0,0,0.04)]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-sm">
                <thead className="bg-[#FAF9F7]">
                  <tr className="border-b border-[#E5E5E3]">
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-[#9B9894] tracking-wide">เลขที่ออเดอร์</th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-[#9B9894] tracking-wide">ทะเบียนรถ</th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-[#9B9894] tracking-wide">ลูกค้า</th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-[#9B9894] tracking-wide">วันที่เปิดงาน</th>
                    <th className="text-right px-5 py-3.5 text-xs font-semibold text-[#9B9894] tracking-wide">ยอดรวม</th>
                    <th className="text-center px-5 py-3.5 text-xs font-semibold text-[#9B9894] tracking-wide">สถานะ</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((order) => (
                    <tr
                      key={order.id}
                      className="border-b border-[#F0EDE8] last:border-0 hover:bg-[#F7F5F2] cursor-pointer transition-colors"
                      onClick={() => navigate(`/orders/${order.id}`)}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT_ROW[order.status]}`} />
                          <span className="font-mono font-semibold text-[#3B3A36]">{order.orderNumber}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 font-mono font-bold tracking-wide text-[#2D2D2D]">
                        {order.vehicle?.licensePlate}
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-medium text-[#2D2D2D]">
                          {order.vehicle?.customer?.name ?? order.vehicle?.customer?.phone ?? <span className="text-[#C0BEBA] text-xs">—</span>}
                        </div>
                        {order.vehicle?.customer?.name && order.vehicle?.customer?.phone && (
                          <div className="text-xs text-[#878681] mt-0.5 font-mono">{order.vehicle.customer.phone}</div>
                        )}
                      </td>
                      <td className="px-5 py-4 text-[#878681]">{formatDate(order.createdAt)}</td>
                      <td className="px-5 py-4 text-right font-semibold font-mono text-[#2D2D2D]">
                        {formatCurrency(order.totalAmount)}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <Badge variant={STATUS_BADGE[order.status]}>
                          {STATUS_LABELS[order.status]}
                        </Badge>
                        {order.status === 'InvoicePending' && order.dueDate && (
                          <div className={`text-xs mt-1 font-medium ${new Date(order.dueDate) < new Date() ? 'text-red-500' : 'text-blue-500'}`}>
                            ครบ {new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short' }).format(new Date(order.dueDate))}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {paged.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-16">
                        <div className="flex flex-col items-center gap-3 text-[#878681]">
                          <FileText className="h-10 w-10 text-[#E5E5E3]" strokeWidth={1} />
                          <span className="text-sm">ไม่มีออเดอร์ในหมวดนี้</span>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="px-4 pb-4">
              <Pagination
                total={total}
                page={page}
                pageSize={pageSize}
                totalPages={totalPages}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
