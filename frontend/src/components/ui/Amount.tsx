import { cn } from '../../lib/cn';
import { formatMoney } from '../../lib/money';

/** Money text; `signed` colors income green and spending red. */
export function Amount({ minor, currency, signed, className }: { minor: number; currency: string; signed?: boolean; className?: string }) {
  return (
    <span className={cn('tabular-nums', signed && (minor > 0 ? 'text-green-600 dark:text-green-400' : minor < 0 ? 'text-red-500' : ''), className)}>
      {formatMoney(minor, currency, { sign: signed })}
    </span>
  );
}
