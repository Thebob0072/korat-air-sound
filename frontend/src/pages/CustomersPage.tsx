import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Search, Car, Phone, UserRound, ChevronRight, AlertCircle, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getCustomerList } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Pagination, PageSizeSelector } from '@/components/ui/pagination';
import { type PageSize } from '@/hooks/usePagination';

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function CustomersPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch]     = useState('');
  const [query,  setQuery]      = useState('');
  const [apiPage, setApiPage]   = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(20);

  const { data, isPending, isError } = useQuery({
    queryKey: ['customers', 'list', query, apiPage, pageSize],
    queryFn: () => getCustomerList({ q: query, page: apiPage, pageSize }),
    placeholderData: (prev) => prev,
    retry: 1,
  });

  const customers = data?.customers ?? [];
  const total     = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  const handleSearch = useCallback(() => {
    setQuery(search.trim());
    setApiPage(1);
  }, [search]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#1A1917] tracking-tight">ลูกค้า</h1>
        <p className="text-sm text-[#878681] mt-0.5">ข้อมูลลูกค้าและประวัติการใช้บริการ</p>
      </div>

      {/* Toolbar: search + count + size */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 w-full max-w-md">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#878681] pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="ค้นหาชื่อหรือเบอร์โทร..."
              className="w-full h-11 pl-10 pr-3 text-sm font-medium text-[#2D2D2D] bg-white rounded-xl border border-[#E5E5E3] focus:outline-none focus:ring-2 focus:ring-[#3B3A36]/15 transition-all placeholder:text-[#C0BEBA] placeholder:font-normal"
            />
          </div>
          <button
            onClick={handleSearch}
            className="h-11 px-5 bg-[#3B3A36] hover:opacity-90 text-white text-sm font-semibold rounded-xl transition-all shrink-0"
          >
            ค้นหา
          </button>
        </div>

        {!isPending && !isError && (
          <div className="flex items-center gap-2 ml-auto">
            <p className="text-sm text-[#878681]">
              <span className="font-semibold text-[#2D2D2D]">{total.toLocaleString()}</span> คน
            </p>
            <div className="hidden lg:block">
              <PageSizeSelector pageSize={pageSize} onPageSizeChange={(s) => { setPageSize(s); setApiPage(1); }} />
            </div>
          </div>
        )}
      </div>

      {/* Table */}
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
            onClick={() => queryClient.refetchQueries({ queryKey: ['customers'] })}
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
            {customers.length === 0 ? (
              <p className="py-16 text-center text-sm text-[#878681]">
                {query ? `ไม่พบลูกค้า "${query}"` : 'ยังไม่มีข้อมูลลูกค้า'}
              </p>
            ) : (
              <div className="divide-y divide-[#F0EDE8]">
                {customers.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => navigate(`/customers/${c.id}`)}
                    className="w-full text-left px-4 py-3.5 active:bg-[#F7F5F2] transition-colors flex items-center gap-3"
                  >
                    <div className="h-10 w-10 rounded-xl bg-[#F0EDE8] flex items-center justify-center shrink-0">
                      <UserRound className="h-5 w-5 text-[#878681]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#2D2D2D] truncate">
                        {c.name ?? <span className="text-[#C0BEBA] italic font-normal text-xs">ไม่มีชื่อ</span>}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        {c.phone && (
                          <span className="text-xs text-[#878681] font-mono">{c.phone}</span>
                        )}
                        {c.phone && (c.vehicleCount > 0 || c.totalOrders > 0) && (
                          <span className="text-[#D8D5D0] text-xs">·</span>
                        )}
                        {c.vehicleCount > 0 && (
                          <span className="inline-flex items-center gap-0.5 text-xs text-[#878681]">
                            <Car className="h-3 w-3" />{c.vehicleCount}
                          </span>
                        )}
                        {c.totalOrders > 0 && (
                          <span className="text-xs text-[#878681]">{c.totalOrders} งาน</span>
                        )}
                        {c.totalRevenue > 0 && (
                          <span className="text-xs font-mono text-[#878681]">{formatCurrency(c.totalRevenue)}</span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-[#C0BEBA] shrink-0" />
                  </button>
                ))}
              </div>
            )}
            <div className="px-4 pb-4">
              <Pagination
                total={total}
                page={apiPage}
                pageSize={pageSize}
                totalPages={totalPages}
                onPageChange={(p) => setApiPage(p)}
                onPageSizeChange={(s) => { setPageSize(s); setApiPage(1); }}
              />
            </div>
          </div>

          {/* ── Desktop table (hidden below lg) ──────────────────────────── */}
          <div className="hidden lg:block bg-white rounded-[20px] border border-[#E5E5E3] overflow-hidden shadow-[0_2px_12px_rgb(0,0,0,0.04)]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-sm">
                <thead className="bg-[#FAF9F7]">
                  <tr className="border-b border-[#E5E5E3]">
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-[#9B9894] tracking-wide">ลูกค้า</th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-[#9B9894] tracking-wide">เบอร์โทร</th>
                    <th className="text-center px-4 py-3.5 text-xs font-semibold text-[#9B9894] tracking-wide">รถ</th>
                    <th className="text-center px-4 py-3.5 text-xs font-semibold text-[#9B9894] tracking-wide">งาน</th>
                    <th className="text-right px-5 py-3.5 text-xs font-semibold text-[#9B9894] tracking-wide">ยอดรวม</th>
                    <th className="text-right px-5 py-3.5 text-xs font-semibold text-[#9B9894] tracking-wide">ล่าสุด</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c) => (
                    <tr
                      key={c.id}
                      className="border-b border-[#F0EDE8] last:border-0 cursor-pointer hover:bg-[#F7F5F2] transition-colors"
                      onClick={() => navigate(`/customers/${c.id}`)}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-xl bg-[#F0EDE8] flex items-center justify-center shrink-0">
                            <UserRound className="h-4 w-4 text-[#878681]" />
                          </div>
                          <span className="font-medium text-[#2D2D2D]">
                            {c.name ?? <span className="text-[#C0BEBA] text-xs italic">ไม่มีชื่อ</span>}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        {c.phone ? (
                          <div className="flex items-center gap-1.5 text-[#878681]">
                            <Phone className="h-3.5 w-3.5 shrink-0" />
                            <span className="font-mono text-sm">{c.phone}</span>
                          </div>
                        ) : (
                          <span className="text-[#C0BEBA] text-xs">—</span>
                        )}
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
                          <ChevronRight className="h-3.5 w-3.5 text-[#C0BEBA]" />
                        </div>
                      </td>
                    </tr>
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
            <div className="px-4 pb-4">
              <Pagination
                total={total}
                page={apiPage}
                pageSize={pageSize}
                totalPages={totalPages}
                onPageChange={(p) => setApiPage(p)}
                onPageSizeChange={(s) => { setPageSize(s); setApiPage(1); }}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
