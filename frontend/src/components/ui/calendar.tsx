import * as React from 'react';
import { DayPicker } from 'react-day-picker';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('p-4', className)}
      classNames={{
        months: 'flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0',
        month: 'space-y-3',
        caption: 'flex justify-center pt-1 relative items-center mb-1',
        caption_label: 'text-sm font-semibold text-[#2D2D2D]',
        nav: 'space-x-1 flex items-center',
        nav_button: cn(
          'h-7 w-7 bg-transparent hover:bg-[#E5E5E3] rounded-full flex items-center justify-center transition-colors text-[#878681] hover:text-[#2D2D2D]',
        ),
        nav_button_previous: 'absolute left-1',
        nav_button_next: 'absolute right-1',
        table: 'w-full border-collapse',
        head_row: 'flex',
        head_cell: 'text-[#878681] rounded-md w-9 font-normal text-[0.8rem] text-center',
        row: 'flex w-full mt-1',
        cell: cn(
          'h-9 w-9 text-center text-sm p-0 relative',
          '[&:has([aria-selected].day-range-end)]:rounded-r-full',
          '[&:has([aria-selected].day-outside)]:bg-[#F0EDE8]/50',
          '[&:has([aria-selected])]:bg-[#F0EDE8]',
          'first:[&:has([aria-selected])]:rounded-l-full',
          'last:[&:has([aria-selected])]:rounded-r-full',
          'focus-within:relative focus-within:z-20',
        ),
        day: cn(
          'h-9 w-9 p-0 font-normal rounded-full transition-colors',
          'hover:bg-[#E5E5E3] hover:text-[#2D2D2D]',
          'aria-selected:opacity-100',
        ),
        day_range_end: 'day-range-end',
        day_selected:
          'bg-[#3B3A36] text-white hover:bg-[#3B3A36] hover:text-white focus:bg-[#3B3A36] focus:text-white rounded-full',
        day_today: 'bg-[#E5E5E3] text-[#2D2D2D] font-semibold',
        day_outside: 'day-outside text-[#C0BEBA] aria-selected:bg-[#F0EDE8]/50 aria-selected:text-[#878681]',
        day_disabled: 'text-[#C0BEBA] opacity-50',
        day_range_middle: 'aria-selected:bg-[#F0EDE8] aria-selected:text-[#2D2D2D]',
        day_hidden: 'invisible',
        ...classNames,
      }}
      components={{
        IconLeft: () => <ChevronLeft className="h-4 w-4" />,
        IconRight: () => <ChevronRight className="h-4 w-4" />,
      }}
      locale={th}
      formatters={{
        formatCaption: (month) => {
          const thaiYear = month.getFullYear() + 543;
          return `${format(month, 'LLLL', { locale: th })} ${thaiYear}`;
        },
      }}
      {...props}
    />
  );
}
Calendar.displayName = 'Calendar';

export { Calendar };
