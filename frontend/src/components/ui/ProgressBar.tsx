import { cn } from '../../lib/cn';

/** `value` is 0..100+. Turns amber near the limit and red when over. */
export function ProgressBar({ value, tone = 'auto', label, color: fill }: { value: number; tone?: 'auto' | 'accent'; label?: string; color?: string }) {
  const clamped = Math.max(0, Math.min(100, value));
  const color = tone === 'accent' ? 'bg-accent' : value > 100 ? 'bg-red-500' : value >= 85 ? 'bg-amber-500' : 'bg-green-500';
  return (
    <div className="h-1.5 rounded-full bg-primary/[0.07] overflow-hidden" role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className={cn('h-full rounded-full transition-[width] duration-500 ease-out', color)} style={{ width: `${clamped}%`, ...(fill ? { background: fill } : {}) }} />
    </div>
  );
}
