import { forwardRef, type SelectHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        'flex h-11 w-full rounded-xl border border-transparent bg-primary/[0.05] px-3 text-[15px] text-primary transition-all hover:bg-primary/[0.07]',
        'focus-visible:outline-none focus-visible:bg-surface focus-visible:border-accent focus-visible:ring-4 focus-visible:ring-accent/20 disabled:opacity-50',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  ),
);
Select.displayName = 'Select';
