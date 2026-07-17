import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Loader2, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { DatePicker } from '@/components/ui/date-picker';
import { Pagination } from '@/components/ui/pagination';
import { usePagination } from '@/hooks/usePagination';
import { getOrders } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { isSameDay } from 'date-fns';
import type { OrderStatus } from '@/types';

const STATUS_LABELS: Record<OrderStatus, string> = {
  Draft: 'แบบร่าง',
  Quoted: 'ใบเสนอราคา',
  Paid: 'ชำระแล้ว',
  Cancelled: 'ยกเลิก',
};

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning';

const STATUS_BADGE: Record<OrderStatus, BadgeVariant> = {
  Draft: 'secondary',
  Quoted: 'warning',
  Paid: 'success',
  Cancelled: 'destructive',
};

const FILTERS: { value: string; label: string }[] = [
  { value: '', label: 'ทั้งหมด' },
  { value: 'Draft', label: 'แบบร่าง' },
  { value: 'Quoted', label: 'ใบเสนอราคา' },
  { value: 'Paid', label: 'ชำระแล้ว' },
  { value: 'Cancelled', label: 'ยกเลิก' },
];

export default function OrdersPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('');
  const [dateFilter, setDateFilter] = useState<Date | undefined>();

  const { data: orders = [], isPending, isError } = useQuery({
    queryKey: ['orders', filter],
    queryFn: () => getOrders(filter ? { status: filter } : {}),
  });

  const filteredOrders = useMemo(() => {
    if (!dateFilter) return orders;
    return orders.filter((o) => isSameDay(new Date(o.createdAt), dateFilter));
  }, [orders, dateFilter]);

  const { paged, page, setPage, pageSize, setPageSize, totalPages, total } = usePagination(filteredOrders);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-[#2D2D2D]">รายการออเดอร์</h1>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Status pills */}
        <div className="flex gap-1.5 flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                filter === f.value
                  ? 'bg-[#3B3A36] text-white shadow-sm'
                  : 'bg-white text-[#878681] hover:text-[#2D2D2D] hover:bg-[#F0EDE8]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Date filter */}
        <div className="w-full sm:ml-auto sm:w-48">
          <DatePicker
            value={dateFilter}
            onChange={setDateFilter}
            placeholder="กรองตามวันที่"
          />
        </div>
      </div>

      {isPending ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-[#878681]" />
        </div>
      ) : isError ? (
        <div className="text-center py-16 text-red-500 text-sm">โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่</div>
      ) : (
        <div className="bg-white rounded-[20px] border border-[#E5E5E3] overflow-hidden shadow-[0_2px_12px_rgb(0,0,0,0.04)]">
          <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead>
              <tr className="border-b border-[#E5E5E3]">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-[#878681] uppercase tracking-wide">เลขที่ออเดอร์</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-[#878681] uppercase tracking-wide">ทะเบียนรถ</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-[#878681] uppercase tracking-wide">ลูกค้า</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-[#878681] uppercase tracking-wide">วันที่เปิดงาน</th>
                <th className="text-right px-5 py-3.5 text-xs font-semibold text-[#878681] uppercase tracking-wide">ยอดรวม</th>
                <th className="text-center px-5 py-3.5 text-xs font-semibold text-[#878681] uppercase tracking-wide">สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((order) => (
                <tr
                  key={order.id}
                  className="border-b border-[#F0EDE8] last:border-0 hover:bg-[#F7F5F2] cursor-pointer transition-colors"
                  onClick={() => navigate(`/orders/${order.id}`)}
                >
                  <td className="px-5 py-4 font-mono font-semibold text-[#3B3A36]">
                    {order.orderNumber}
                  </td>
                  <td className="px-5 py-4 font-mono font-bold tracking-wide text-[#2D2D2D]">
                    {order.vehicle?.licensePlate}
                  </td>
                  <td className="px-5 py-4">
                    <div className="font-medium text-[#2D2D2D]">{order.vehicle?.customer?.name}</div>
                    <div className="text-xs text-[#878681] mt-0.5">{order.vehicle?.customer?.phone}</div>
                  </td>
                  <td className="px-5 py-4 text-[#878681]">{formatDate(order.createdAt)}</td>
                  <td className="px-5 py-4 text-right font-semibold font-mono text-[#2D2D2D]">
                    {formatCurrency(order.totalAmount)}
                  </td>
                  <td className="px-5 py-4 text-center">
                    <Badge variant={STATUS_BADGE[order.status]}>
                      {STATUS_LABELS[order.status]}
                    </Badge>
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
      )}
    </div>
  );
}
