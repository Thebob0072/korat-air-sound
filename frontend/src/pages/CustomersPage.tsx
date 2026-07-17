import { Fragment, useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Search, ChevronDown, ChevronUp, Car, FileText, Phone, UserRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getCustomerList } from '@/lib/api';
import type { CustomerSummary } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';

// ── Sub-components ────────────────────────────────────────────────────────────

interface ExpandedRowProps {
  customer: CustomerSummary;
}
function ExpandedRow({ customer }: ExpandedRowProps) {
  const navigate = useNavigate();
  return (
    <tr>
      <td colSpan={6} className="px-5 pb-4 pt-0 bg-[#FAF9F7]">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-3 border-t border-[#F0EDE8]">
          {customer.vehicles.map((v) => (
            <div key={v.id} className="bg-white rounded-[16px] p-4 border border-[#E5E5E3]">
              <div className="flex items-center gap-2 mb-3">
                <Car className="h-4 w-4 text-[#878681]" />
                <p className="font-mono font-bold text-sm text-[#2D2D2D] tracking-wide">{v.licensePlate}</p>
                <p className="text-xs text-[#878681]">{v.brand} {v.model}</p>
              </div>
              {v.orders.length === 0 ? (
                <p className="text-xs text-[#C0BEBA]">ยังไม่มีประวัติงาน</p>
              ) : (
                <div className="space-y-1.5">
                  {v.orders.slice(0, 5).map((o) => (
                    <button
                      key={o.id}
                      onClick={() => navigate(`/orders/${o.id}`)}
                      className="w-full flex items-center justify-between text-left hover:bg-[#F0EDE8] px-2 py-1.5 rounded-xl transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="h-3 w-3 text-[#C0BEBA] shrink-0" />
                        <span className="text-xs font-mono text-[#3B3A36] truncate">{o.orderNumber}</span>
                        <span className="text-[10px] text-[#C0BEBA] shrink-0">{formatDate(o.createdAt).split(' ')[0]}</span>
                      </div>
                      <span className="text-xs font-semibold font-mono text-[#2D2D2D] ml-2 shrink-0">
                        {formatCurrency(o.totalAmount)}
                      </span>
                    </button>
                  ))}
                  {v.orders.length > 5 && (
                    <p className="text-[10px] text-[#C0BEBA] text-center pt-1">
                      + อีก {v.orders.length - 5} ออเดอร์
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </td>
    </tr>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function CustomersPage() {
  const [search, setSearch]     = useState('');
  const [query,  setQuery]      = useState('');
  const [apiPage, setApiPage]   = useState(1);
  const [expanded, setExpanded] = useState<string | null>(null);

  const PAGE_SIZE = 20;

  const { data, isPending, isError } = useQuery({
    queryKey: ['customers', 'list', query, apiPage],
    queryFn: () => getCustomerList({ q: query, page: apiPage, pageSize: PAGE_SIZE }),
    placeholderData: (prev) => prev,
  });

  const customers = data?.customers ?? [];
  const total     = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  const handleSearch = useCallback(() => {
    setQuery(search.trim());
    setApiPage(1);
    setExpanded(null);
  }, [search]);

  const toggleExpand = (id: string) =>
    setExpanded((prev) => (prev === id ? null : id));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#2D2D2D]">รายชื่อลูกค้า</h1>
          {total > 0 && (
            <p className="text-xs text-[#878681] mt-0.5">{total.toLocaleString()} คน</p>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#878681] pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="ค้นหาชื่อหรือเบอร์โทร..."
            className="w-full h-11 pl-11 pr-4 text-sm bg-white rounded-full shadow-[0_2px_8px_rgb(0,0,0,0.05)] border border-[#E5E5E3] focus:outline-none focus:ring-2 focus:ring-[#3B3A36]/15 transition-all placeholder:text-[#878681]"
          />
        </div>
        <button
          onClick={handleSearch}
          className="h-11 px-5 bg-[#3B3A36] hover:opacity-90 text-white text-sm font-medium rounded-full transition-all"
        >
          ค้นหา
        </button>
      </div>

      {/* Table */}
      {isPending ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-[#878681]" />
        </div>
      ) : isError ? (
        <div className="text-center py-16 text-red-500 text-sm">โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่</div>
      ) : (
        <div className="bg-white rounded-[20px] border border-[#E5E5E3] overflow-hidden shadow-[0_2px_12px_rgb(0,0,0,0.04)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-sm">
              <thead>
                <tr className="border-b border-[#E5E5E3]">
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-[#878681] uppercase tracking-wide">ชื่อลูกค้า</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-[#878681] uppercase tracking-wide">เบอร์โทร</th>
                  <th className="text-center px-4 py-3.5 text-xs font-semibold text-[#878681] uppercase tracking-wide">รถ</th>
                  <th className="text-center px-4 py-3.5 text-xs font-semibold text-[#878681] uppercase tracking-wide">ออเดอร์</th>
                  <th className="text-right px-5 py-3.5 text-xs font-semibold text-[#878681] uppercase tracking-wide">ยอดรวม</th>
                  <th className="text-right px-5 py-3.5 text-xs font-semibold text-[#878681] uppercase tracking-wide">ล่าสุด</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <Fragment key={c.id}>
                    <tr
                      className={`border-b border-[#F0EDE8] last:border-0 cursor-pointer transition-colors ${
                        expanded === c.id ? 'bg-[#FAF9F7]' : 'hover:bg-[#F7F5F2]'
                      }`}
                      onClick={() => toggleExpand(c.id)}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-xl bg-[#F0EDE8] flex items-center justify-center shrink-0">
                            <UserRound className="h-4 w-4 text-[#878681]" />
                          </div>
                          <span className="font-medium text-[#2D2D2D]">{c.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5 text-[#878681]">
                          <Phone className="h-3.5 w-3.5 shrink-0" />
                          <span className="font-mono text-sm">{c.phone}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="inline-flex items-center gap-1 text-sm text-[#2D2D2D]">
                          <Car className="h-3.5 w-3.5 text-[#878681]" />
                          {c.vehicleCount}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className={`text-sm font-semibold ${c.totalOrders > 0 ? 'text-[#2D2D2D]' : 'text-[#C0BEBA]'}`}>
                          {c.totalOrders}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right font-mono font-semibold text-[#2D2D2D]">
                        {c.totalRevenue > 0 ? formatCurrency(c.totalRevenue) : <span className="text-[#C0BEBA]">—</span>}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <span className="text-xs text-[#878681]">
                            {c.lastVisit ? formatDate(c.lastVisit).split(' ')[0] : <span className="text-[#C0BEBA]">—</span>}
                          </span>
                          {expanded === c.id
                            ? <ChevronUp className="h-3.5 w-3.5 text-[#878681]" />
                            : <ChevronDown className="h-3.5 w-3.5 text-[#878681]" />
                          }
                        </div>
                      </td>
                    </tr>
                    {expanded === c.id && <ExpandedRow customer={c} />}
                  </Fragment>
                ))}
                {customers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-sm text-[#878681]">
                      {query ? `ไม่พบลูกค้า "${query}"` : 'ยังไม่มีข้อมูลลูกค้า'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-4 py-3 border-t border-[#F0EDE8] flex items-center justify-between gap-4 flex-wrap">
            <p className="text-xs text-[#878681]">
              แสดง {Math.min((apiPage - 1) * PAGE_SIZE + 1, total)}–{Math.min(apiPage * PAGE_SIZE, total)} จาก {total.toLocaleString()} คน
            </p>
            <div className="flex gap-1">
              <button
                disabled={apiPage <= 1}
                onClick={() => { setApiPage((p) => p - 1); setExpanded(null); }}
                className="h-8 px-3 text-xs font-medium bg-[#F0EDE8] hover:bg-[#EAE7E2] disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-all"
              >
                ก่อนหน้า
              </button>
              <span className="h-8 px-3 flex items-center text-xs text-[#878681]">
                {apiPage} / {totalPages}
              </span>
              <button
                disabled={apiPage >= totalPages}
                onClick={() => { setApiPage((p) => p + 1); setExpanded(null); }}
                className="h-8 px-3 text-xs font-medium bg-[#F0EDE8] hover:bg-[#EAE7E2] disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-all"
              >
                ถัดไป
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
