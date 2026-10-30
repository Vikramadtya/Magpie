import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

/** A labelled figure with room for a change chip or a small note beneath. */
export function Stat({ label, value, tone, icon, footer, className }: { label: string; value: ReactNode; tone?: 'income' | 'expense'; icon?: ReactNode; footer?: ReactNode; className?: string }) {
  return (
    <div className={cn('glass-panel p-5 flex flex-col', className)}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[13px] font-medium text-secondary">{label}</p>
        {icon && <span className={cn('w-8 h-8 rounded-xl flex items-center justify-center shrink-0 -mt-1 -mr-1', tone === 'income' ? 'bg-green-500/10 text-green-600 dark:text-green-400' : tone === 'expense' ? 'bg-red-500/10 text-red-500' : 'bg-accent/10 text-accent')} aria-hidden>{icon}</span>}
      </div>
      <p className={cn('text-xl sm:text-[28px] leading-tight font-semibold mt-1.5 tabular-nums tracking-[-0.025em]', tone === 'income' && 'text-green-600 dark:text-green-400', tone === 'expense' && 'text-red-500')}>{value}</p>
      {footer && <div className="mt-auto pt-2 text-xs text-secondary flex items-center gap-1.5 flex-wrap">{footer}</div>}
    </div>
  );
}
