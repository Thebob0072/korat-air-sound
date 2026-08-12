import type { InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface FormInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  required?: boolean;
  hint?: string;
}

export function FormInput({ label, required, hint, className, id, ...props }: FormInputProps) {
  return (
    <div>
      {label && (
        <label htmlFor={id} className="block text-sm font-semibold text-[#2D2D2D] mb-1.5">
          {label}
          {required && <span className="text-[#C0BEBA] ml-0.5">*</span>}
          {hint && <span className="ml-2 text-xs font-normal text-[#878681]">{hint}</span>}
        </label>
      )}
      <input
        id={id}
        className={cn(
          'w-full bg-[#F0EDE8] border-0 rounded-2xl px-4 py-2.5 text-sm text-[#2D2D2D] placeholder:text-[#C0BEBA] focus:outline-none focus:ring-2 focus:ring-[#3B3A36]/15 transition-all',
          className,
        )}
        {...props}
      />
    </div>
  );
}
