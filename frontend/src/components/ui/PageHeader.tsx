import type { ReactNode } from 'react';

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-7">
      <div>
        <h1 className="text-[32px] leading-tight font-bold tracking-[-0.03em]">{title}</h1>
        {subtitle && <p className="text-sm text-secondary mt-1.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
