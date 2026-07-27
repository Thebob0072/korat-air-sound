import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { PAGE_SIZES, type PageSize } from '@/hooks/usePagination';

// ── Shared size selector (rendered above the table card by each page) ─────────

interface PageSizeSelectorProps {
  pageSize: PageSize;
  onPageSizeChange: (s: PageSize) => void;
}

export function PageSizeSelector({ pageSize, onPageSizeChange }: PageSizeSelectorProps) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-[#878681]">แสดง</span>
      <div className="relative">
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value) as PageSize)}
          className="appearance-none bg-white border border-[#E5E5E3] rounded-xl pl-3 pr-6 h-8 text-xs font-semibold text-[#2D2D2D] focus:outline-none focus:ring-2 focus:ring-[#3B3A36]/15 cursor-pointer shadow-sm"
        >
          {PAGE_SIZES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-[#878681] pointer-events-none" />
      </div>
      <span className="text-xs text-[#878681]">รายการ</span>
    </div>
  );
}

// ── Page navigation (rendered inside the table card, bottom) ──────────────────

interface PaginationProps {
  total: number;
  page: number;
  pageSize: PageSize;
  totalPages: number;
  onPageChange: (p: number) => void;
  onPageSizeChange?: (s: PageSize) => void;
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
}: PaginationProps) {
  if (total === 0) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  const [jumpVal, setJumpVal] = useState('');

  const handleJump = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    const n = parseInt(jumpVal, 10);
    if (!isNaN(n) && n >= 1 && n <= totalPages) onPageChange(n);
    setJumpVal('');
  };

  return (
    <div className="flex items-center mt-3 px-1">

      {/* Center — page numbers + jump (only when multipage) */}
      <div className="flex-1 flex items-center justify-center gap-1 flex-wrap">
        {totalPages > 1 && (
          <>
            {pageNumbers(page, totalPages).map((n, i) =>
              n === '…' ? (
                <span key={`e-${i}`} className="h-8 w-5 flex items-center justify-center text-xs text-[#C0BEBA]">…</span>
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

            {/* Jump to page */}
            <div className="flex items-center gap-1 ml-1 border-l border-[#E5E5E3] pl-2">
              <span className="text-xs text-[#C0BEBA]">ไปหน้า</span>
              <input
                type="number"
                min={1}
                max={totalPages}
                value={jumpVal}
                onChange={(e) => setJumpVal(e.target.value)}
                onKeyDown={handleJump}
                placeholder="…"
                className="w-10 h-8 text-center text-xs rounded-xl bg-[#F0EDE8] text-[#2D2D2D] font-mono placeholder:text-[#C0BEBA] focus:outline-none focus:ring-2 focus:ring-[#3B3A36]/15 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
          </>
        )}
      </div>

      {/* Right — count */}
      <span className="text-xs text-[#878681] shrink-0 tabular-nums">
        {from}–{to} จาก {total} รายการ
      </span>

    </div>
  );
}
