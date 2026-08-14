import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Loader2, ChevronLeft, Car, FileText, Phone, UserRound,
  ChevronDown, ChevronUp, CreditCard,
} from 'lucide-react';
import { getCustomerDetail } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning';

const STATUS_LABELS: Record<string, string> = {
  Draft: 'แบบร่าง', Quoted: 'ใบเสนอราคา', InProgress: 'กำลังซ่อม',
  WaitingForParts: 'รออะไหล่', Ready: 'รอส่งมอบ',
  InvoicePending: 'วางบิล', Paid: 'ชำระแล้ว', Cancelled: 'ยกเลิก',
};
const STATUS_BADGE: Record<string, BadgeVariant> = {
  Draft: 'secondary', Quoted: 'warning', InProgress: 'default',
  WaitingForParts: 'warning', Ready: 'success',
  InvoicePending: 'warning', Paid: 'success', Cancelled: 'destructive',
};

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data: customer, isPending, isError } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => getCustomerDetail(id!),
    enabled: !!id,
  });

  if (isPending) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-[#878681]" />
      </div>
    );
  }
  if (isError || !customer) {
    return <div className="text-center py-16 text-red-500 text-sm">ไม่พบข้อมูลลูกค้า</div>;
  }

  const allOrders = customer.vehicles.flatMap((v) =>
    v.orders.map((o) => ({ ...o, vehicle: v }))
  );
  const totalSpent = allOrders
    .filter((o) => o.status === 'Paid')
    .reduce((s, o) => s + Number(o.totalAmount), 0);
  const pendingAmount = allOrders
    .filter((o) => o.status === 'InvoicePending')
    .reduce((s, o) => s + Number(o.totalAmount), 0);
  const lastVisit = allOrders.length > 0
    ? allOrders.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))[0].createdAt
    : null;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Back */}
      <button
        onClick={() => navigate('/customers')}
        className="flex items-center gap-1.5 text-sm text-[#878681] hover:text-[#2D2D2D] transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        ย้อนกลับ
      </button>

      {/* Profile header */}
      <div className="bg-white rounded-[20px] border border-[#E5E5E3] p-6 shadow-[0_2px_12px_rgb(0,0,0,0.04)]">
        <div className="flex items-start gap-4">
          <div className="h-14 w-14 rounded-2xl bg-[#F0EDE8] flex items-center justify-center shrink-0">
            <UserRound className="h-7 w-7 text-[#878681]" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-[#2D2D2D] leading-tight">
              {customer.name ?? <span className="text-[#C0BEBA] font-normal italic">ไม่มีชื่อ</span>}
            </h1>
            {customer.phone && (
              <div className="flex items-center gap-1.5 mt-1 text-[#878681]">
                <Phone className="h-3.5 w-3.5" />
                <span className="font-mono text-sm">{customer.phone}</span>
              </div>
            )}
            <p className="text-xs text-[#C0BEBA] mt-1">
              ลูกค้าตั้งแต่ {formatDate(customer.createdAt).split(' ')[0]}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-[#F0EDE8]">
          {[
            { label: 'รถทั้งหมด', value: customer.vehicles.length, unit: 'คัน' },
            { label: 'งานทั้งหมด', value: allOrders.length, unit: 'ครั้ง' },
            { label: 'ยอดใช้จ่าย', value: formatCurrency(totalSpent), unit: '' },
            { label: 'ล่าสุด', value: lastVisit ? formatDate(lastVisit).split(' ')[0] : '—', unit: '' },
          ].map((s) => (
            <div key={s.label} className="bg-[#FAF9F7] rounded-[14px] p-3">
              <p className="text-[10px] font-semibold text-[#9B9894] uppercase tracking-wide">{s.label}</p>
              <p className="text-lg font-bold text-[#2D2D2D] mt-1 leading-none">
                {s.value}<span className="text-xs font-normal text-[#878681] ml-0.5">{s.unit}</span>
              </p>
            </div>
          ))}
        </div>

        {/* Pending credit */}
        {pendingAmount > 0 && (
          <div className="mt-4 flex items-center justify-between bg-amber-50 border border-amber-200 rounded-[14px] px-4 py-3">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-semibold text-amber-800">ค้างชำระ (เครดิต)</span>
            </div>
            <span className="font-mono font-bold text-amber-700">{formatCurrency(pendingAmount)}</span>
          </div>
        )}
      </div>

      {/* Vehicles */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-[#878681] uppercase tracking-widest px-1">รถ ({customer.vehicles.length})</h2>
        {customer.vehicles.map((v) => {
          const isOpen = expanded === v.id;
          return (
            <div key={v.id} className="bg-white rounded-[20px] border border-[#E5E5E3] overflow-hidden shadow-[0_2px_12px_rgb(0,0,0,0.04)]">
              {/* Vehicle header */}
              <button
                className="w-full flex items-center gap-3 px-5 py-4 hover:bg-[#F7F5F2] transition-colors text-left"
                onClick={() => setExpanded(isOpen ? null : v.id)}
              >
                <div className="h-9 w-9 rounded-xl bg-[#F0EDE8] flex items-center justify-center shrink-0">
                  <Car className="h-4 w-4 text-[#878681]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-mono font-bold text-[#2D2D2D] tracking-wide">{v.licensePlate}</p>
                  <p className="text-xs text-[#878681] mt-0.5">{[v.brand, v.model].filter(Boolean).join(' ') || '—'}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-[#878681]">{v.orders.length} งาน</span>
                  {isOpen ? <ChevronUp className="h-4 w-4 text-[#878681]" /> : <ChevronDown className="h-4 w-4 text-[#878681]" />}
                </div>
              </button>

              {/* Orders list */}
              {isOpen && (
                <div className="border-t border-[#F0EDE8]">
                  {v.orders.length === 0 ? (
                    <p className="px-5 py-4 text-sm text-[#C0BEBA]">ยังไม่มีประวัติงาน</p>
                  ) : (
                    v.orders.map((o) => {
                      const isOverdue = o.status === 'InvoicePending' && o.dueDate && new Date(o.dueDate) < new Date();
                      return (
                        <button
                          key={o.id}
                          onClick={() => navigate(`/orders/${o.id}`)}
                          className="w-full flex items-center gap-3 px-5 py-3.5 border-b border-[#F7F5F2] last:border-0 hover:bg-[#F7F5F2] transition-colors text-left"
                        >
                          <FileText className="h-4 w-4 text-[#C0BEBA] shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-sm font-semibold text-[#3B3A36]">{o.orderNumber}</span>
                              <Badge variant={STATUS_BADGE[o.status] ?? 'secondary'}>
                                {STATUS_LABELS[o.status] ?? o.status}
                              </Badge>
                              {isOverdue && (
                                <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full">เกินกำหนด</span>
                              )}
                            </div>
                            <p className="text-xs text-[#878681] mt-0.5">
                              {formatDate(o.createdAt).split(' ')[0]}
                              {o.dueDate && o.status === 'InvoicePending' && (
                                <span className={`ml-2 ${isOverdue ? 'text-red-500' : 'text-blue-500'}`}>
                                  · ครบ {new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short' }).format(new Date(o.dueDate))}
                                </span>
                              )}
                            </p>
                          </div>
                          <span className="font-mono font-semibold text-sm text-[#2D2D2D] shrink-0">
                            {formatCurrency(o.totalAmount)}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
