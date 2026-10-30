import { cn } from '../../lib/cn';

const HUES = ['bg-indigo-500/15 text-indigo-600 dark:text-indigo-300', 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300', 'bg-amber-500/15 text-amber-600 dark:text-amber-300', 'bg-rose-500/15 text-rose-600 dark:text-rose-300', 'bg-sky-500/15 text-sky-600 dark:text-sky-300', 'bg-violet-500/15 text-violet-600 dark:text-violet-300'];

/** Initials in a soft colour that stays the same for the same name. */
export function Avatar({ name, size = 36, className }: { name: string; size?: number; className?: string }) {
  const hue = [...name].reduce((h, c) => h + c.charCodeAt(0), 0) % HUES.length;
  return (
    <span
      aria-hidden
      className={cn('inline-flex items-center justify-center rounded-full font-semibold shrink-0', HUES[hue], className)}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {name.trim().charAt(0).toUpperCase() || '?'}
    </span>
  );
}
