import { Check, ChevronDown } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '../../lib/cn';

export interface Option { value: string; label: string; group?: string }

/** Pick any number of options from a list, with a box to narrow a long one down. */
export function MultiSelect({ label, options, selected, onChange, placeholder }: { label: string; options: Option[]; selected: string[]; onChange: (next: string[]) => void; placeholder: string }) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', away);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  const shown = useMemo(() => {
    const f = filter.trim().toLowerCase();
    return f ? options.filter((o) => o.label.toLowerCase().includes(f)) : options;
  }, [options, filter]);

  const names = options.filter((o) => selected.includes(o.value)).map((o) => o.label);
  const summary = names.length === 0 ? placeholder : names.length <= 2 ? names.join(', ') : `${names[0]} +${names.length - 1}`;
  const toggle = (value: string) => onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);

  let lastGroup: string | undefined;
  return (
    <div ref={box} className="relative min-w-0">
      <span className="block text-xs font-medium text-secondary mb-1">{label}</span>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cn('w-full flex items-center justify-between gap-2 rounded-xl border bg-surface px-3 h-10 text-sm text-left', names.length ? 'border-accent text-primary' : 'border-border text-secondary')}
      >
        <span className="truncate">{summary}</span>
        <ChevronDown className="w-4 h-4 shrink-0" />
      </button>
      {open && (
        <div className="absolute z-30 mt-1 w-full min-w-[14rem] rounded-xl border border-border bg-surface shadow-lift">
          {options.length > 8 && (
            <input autoFocus value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Narrow the list…" aria-label={`Narrow ${label}`} className="w-full bg-transparent px-3 py-2 text-sm border-b border-border outline-none" />
          )}
          <ul role="listbox" aria-multiselectable aria-label={label} className="max-h-56 overflow-y-auto py-1">
            {shown.length === 0 && <li className="px-3 py-2 text-sm text-secondary">Nothing found</li>}
            {shown.map((o) => {
              const header = o.group && o.group !== lastGroup ? o.group : null;
              lastGroup = o.group;
              const on = selected.includes(o.value);
              return (
                <li key={o.value} role="presentation">
                  {header && <p className="px-3 pt-2 pb-1 text-[11px] uppercase tracking-wider text-secondary">{header}</p>}
                  <button type="button" role="option" aria-selected={on} onClick={() => toggle(o.value)} className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left hover:bg-primary/[0.05]">
                    <span className={cn('grid place-items-center w-4 h-4 rounded border', on ? 'bg-accent border-accent text-white' : 'border-border')}>{on && <Check className="w-3 h-3" />}</span>
                    <span className="truncate">{o.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          {selected.length > 0 && <button type="button" onClick={() => onChange([])} className="w-full text-xs text-accent px-3 py-2 border-t border-border text-left">Clear {label.toLowerCase()}</button>}
        </div>
      )}
    </div>
  );
}
