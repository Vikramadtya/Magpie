import { ChevronLeft, ChevronRight } from 'lucide-react';
import { monthKey, monthLabel, shiftMonth } from '../../lib/dates';
import { Button } from './Button';

export function MonthPicker({ month, onChange }: { month: string; onChange: (m: string) => void }) {
  const isCurrent = month === monthKey(new Date());
  return (
    <div className="inline-flex items-center gap-1">
      <Button variant="ghost" size="icon" onClick={() => onChange(shiftMonth(month, -1))} aria-label="Previous month"><ChevronLeft className="w-4 h-4" /></Button>
      <span className="min-w-[8.5rem] text-center text-sm font-medium">{monthLabel(month)}</span>
      <Button variant="ghost" size="icon" onClick={() => onChange(shiftMonth(month, 1))} disabled={isCurrent} aria-label="Next month"><ChevronRight className="w-4 h-4" /></Button>
    </div>
  );
}
