import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PAGE_SIZES, type PageSize } from '@/hooks/usePagination';

interface PaginationProps {
  total: number;
  page: number;
  pageSize: PageSize;
  totalPages: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: PageSize) => void;
}

function pageNumbers(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const nums: (number | '…')[] = [1];
  if (current > 3) nums.push('…');
  const lo = Math.max(2, current - 1);
  const hi = Math.min(total - 1, current + 1);
  for (let i = lo; i <= hi; i++) nums.push(i);
  if (current < total - 2) nums.push('…');
  nums.push(total);
  return nums;
}

export function Pagination({
  total,
  page,
  pageSize,
  totalPages,
  onPageChange,
  onPageSizeChange,
}: PaginationProps) {
  if (total === 0) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const showPageNav = totalPages > 1;

  return (
    <div className="flex items-center justify-between flex-wrap gap-3 px-1 mt-4">
      {/* Left: page-size selector + count info */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 bg-[#F0EDE8] rounded-2xl p-1">
          {PAGE_SIZES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onPageSizeChange(s)}
              className={`min-w-[2.25rem] px-2.5 h-7 rounded-xl text-xs font-semibold transition-all duration-150 ${
                pageSize === s
                  ? 'bg-white text-[#2D2D2D] shadow-sm'
                  : 'text-[#878681] hover:text-[#2D2D2D]'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <span className="text-xs text-[#878681]">
          {from}–{to} จาก {total} รายการ
        </span>
      </div>

      {/* Right: page navigation — hidden when everything fits */}
      {showPageNav && (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
            className="h-8 w-8 flex items-center justify-center rounded-xl text-[#878681] hover:text-[#2D2D2D] hover:bg-[#F0EDE8] disabled:opacity-30 disabled:pointer-events-none transition-all"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {pageNumbers(page, totalPages).map((n, i) =>
            n === '…' ? (
              <span key={`ellipsis-${i}`} className="h-8 w-6 flex items-center justify-center text-xs text-[#C0BEBA]">
                …
              </span>
            ) : (
              <button
                key={n}
                type="button"
                onClick={() => onPageChange(n)}
                className={`h-8 min-w-[2rem] px-2 rounded-xl text-xs font-semibold transition-all duration-150 ${
                  page === n
                    ? 'bg-[#3B3A36] text-white shadow-sm'
                    : 'text-[#878681] hover:text-[#2D2D2D] hover:bg-[#F0EDE8]'
                }`}
              >
                {n}
              </button>
            ),
          )}

          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={page === totalPages}
            className="h-8 w-8 flex items-center justify-center rounded-xl text-[#878681] hover:text-[#2D2D2D] hover:bg-[#F0EDE8] disabled:opacity-30 disabled:pointer-events-none transition-all"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
