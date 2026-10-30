import { cn } from '../../lib/cn';

/** A small pill switcher for a handful of views. */
export function Segmented<T extends string>({ value, onChange, options, className }: { value: T; onChange: (v: T) => void; options: readonly (readonly [T, string])[]; className?: string }) {
  return (
    <div className={cn('inline-flex p-1 rounded-xl bg-primary/[0.06]', className)} role="tablist">
      {options.map(([k, label]) => (
        <button
          key={k}
          role="tab"
          aria-selected={value === k}
          onClick={() => onChange(k)}
          className={cn('px-4 py-1.5 text-sm font-medium rounded-lg transition-all', value === k ? 'bg-surface text-primary shadow-card' : 'text-secondary hover:text-primary')}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
