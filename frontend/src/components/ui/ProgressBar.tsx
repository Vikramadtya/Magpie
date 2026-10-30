import { cn } from '../../lib/cn';

/** `value` is 0..100+. Turns amber near the limit and red when over. */
export function ProgressBar({ value, tone = 'auto', label }: { value: number; tone?: 'auto' | 'accent'; label?: string }) {
  const clamped = Math.max(0, Math.min(100, value));
  const color = tone === 'accent' ? 'bg-accent' : value > 100 ? 'bg-red-500' : value >= 85 ? 'bg-amber-500' : 'bg-green-500';
  return (
    <div className="h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden" role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${clamped}%` }} />
    </div>
  );
}
