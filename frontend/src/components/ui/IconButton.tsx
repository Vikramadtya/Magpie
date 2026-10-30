import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/cn';

/** A quiet icon-only button; the label doubles as tooltip and accessible name. */
export function IconButton({ label, children, className, ...props }: { label: string; children: ReactNode } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn('p-2 rounded-lg text-secondary transition-colors hover:text-primary hover:bg-primary/[0.06] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/20', className)}
      {...props}
    >
      {children}
    </button>
  );
}
