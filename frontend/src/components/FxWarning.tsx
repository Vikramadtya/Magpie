import { AlertTriangle } from 'lucide-react';

/** Shown when some amounts could not be converted because no exchange rate is available yet. */
export function FxWarning({ currencies, base }: { currencies?: string[]; base: string }) {
  if (!currencies || currencies.length === 0) return null;
  return (
    <div role="status" className="mb-4 flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm">
      <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
      <span>
        No exchange rate for {currencies.join(', ')} yet, so those amounts are shown unconverted in {base}. Rates refresh automatically; try again shortly.
      </span>
    </div>
  );
}
