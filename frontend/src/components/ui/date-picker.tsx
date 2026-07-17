import * as React from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { CalendarDays } from 'lucide-react';
import { Calendar } from './calendar';
import { cn } from '@/lib/utils';

interface DatePickerProps {
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'เลือกวันที่',
  className,
  disabled,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <button
          disabled={disabled}
          className={cn(
            'flex h-11 w-full items-center gap-2.5 rounded-2xl bg-[#F0EDE8] px-4 text-sm transition-all duration-200',
            'hover:bg-[#E5E5E3] focus:outline-none focus:ring-2 focus:ring-[#3B3A36]/15',
            'disabled:opacity-40 disabled:cursor-not-allowed',
            value ? 'text-[#2D2D2D]' : 'text-[#878681]',
            className,
          )}
        >
          <CalendarDays className="h-4 w-4 text-[#878681] shrink-0" />
          <span className="flex-1 text-left">
            {value
              ? `${format(value, 'd MMM', { locale: th })} ${value.getFullYear() + 543}`
              : placeholder}
          </span>
          {value && (
            <button
              onClick={(e) => { e.stopPropagation(); onChange?.(undefined); }}
              className="text-[#878681] hover:text-[#2D2D2D] transition-colors"
            >
              ✕
            </button>
          )}
        </button>
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={6}
          className={cn(
            'z-50 rounded-[20px] bg-white shadow-[0_8px_30px_rgb(0,0,0,0.1)] border border-[#E5E5E3]',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
          )}
        >
          <Calendar
            mode="single"
            selected={value}
            onSelect={(day) => { onChange?.(day); setOpen(false); }}
            initialFocus
          />
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
