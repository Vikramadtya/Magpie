import type { ReactNode } from 'react';

/** Label + control + inline error, used by every form. */
export function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium mb-1.5">{label}</span>
      {children}
      {hint && !error && <span className="block text-xs text-secondary mt-1">{hint}</span>}
      {error && (
        <span role="alert" className="block text-xs text-red-500 mt-1">
          {error}
        </span>
      )}
    </label>
  );
}
