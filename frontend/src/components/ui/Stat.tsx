import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

/** A labelled figure with room for a change chip or a small note beneath. */
export function Stat({ label, value, tone, footer, className }: { label: string; value: ReactNode; tone?: 'income' | 'expense'; footer?: ReactNode; className?: string }) {
  return (
    <div className={cn('glass-panel p-4 flex flex-col', className)}>
      <p className="text-xs font-medium text-secondary">{label}</p>
      <p className={cn('text-xl sm:text-2xl font-bold mt-1 tabular-nums tracking-tight', tone === 'income' && 'text-green-600 dark:text-green-400', tone === 'expense' && 'text-red-500')}>{value}</p>
      {footer && <div className="mt-auto pt-2 text-xs text-secondary flex items-center gap-1.5 flex-wrap">{footer}</div>}
    </div>
  );
}
