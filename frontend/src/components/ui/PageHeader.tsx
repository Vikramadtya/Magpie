import type { ReactNode } from 'react';

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-8">
      <div>
        <h1 className="text-[28px] leading-tight font-semibold tracking-[-0.02em]">{title}</h1>
        {subtitle && <p className="text-sm text-secondary mt-1.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
