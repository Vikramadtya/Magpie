import { cn } from '../../lib/cn';

/** A small pill switcher for a handful of views. */
export function Segmented<T extends string>({ value, onChange, options, className }: { value: T; onChange: (v: T) => void; options: readonly (readonly [T, string])[]; className?: string }) {
  return (
    <div className={cn('inline-flex p-[3px] rounded-[10px] bg-primary/[0.07]', className)} role="tablist">
      {options.map(([k, label]) => (
        <button
          type="button"
          key={k}
          role="tab"
          aria-selected={value === k}
          onClick={() => onChange(k)}
          className={cn('px-4 py-1 text-[13px] font-medium rounded-[8px] transition-all', value === k ? 'bg-surface text-primary shadow-[0_1px_3px_rgb(0_0_0/0.12),0_0_0_0.5px_rgb(0_0_0/0.04)] dark:bg-white/15' : 'text-secondary hover:text-primary')}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
