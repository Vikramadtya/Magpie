import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { cn } from '../../lib/cn';

/** Change against a previous value. For spending, `inverse` makes a rise read as bad. */
export function Delta({ current, previous, inverse, className }: { current: number; previous: number; inverse?: boolean; className?: string }) {
  if (previous === 0 && current === 0) return null;
  if (previous === 0) return <span className={cn('text-xs text-secondary', className)}>new</span>;
  const pct = Math.round(((current - previous) / Math.abs(previous)) * 100);
  if (pct === 0) return <span className={cn('text-xs text-secondary', className)}>no change</span>;
  const good = inverse ? pct < 0 : pct > 0;
  const Icon = pct > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={cn('inline-flex items-center gap-0.5 text-xs font-medium', good ? 'text-green-600 dark:text-green-400' : 'text-red-500', className)}>
      <Icon className="w-3.5 h-3.5" aria-hidden />
      {Math.abs(pct)}%<span className="sr-only">{pct > 0 ? ' higher' : ' lower'}</span>
    </span>
  );
}
