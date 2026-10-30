import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

const TONES = {
  neutral: 'bg-primary/[0.06] text-secondary',
  accent: 'bg-accent/10 text-accent',
  good: 'bg-green-500/10 text-green-600 dark:text-green-400',
  bad: 'bg-red-500/10 text-red-500',
  warn: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
} as const;

/** A small status pill. */
export function Badge({ tone = 'neutral', children, className }: { tone?: keyof typeof TONES; children: ReactNode; className?: string }) {
  return <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium leading-4', TONES[tone], className)}>{children}</span>;
}
