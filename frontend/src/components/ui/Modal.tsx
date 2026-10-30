import { X } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';
import { cn } from '../../lib/cn';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
}

export function Modal({ isOpen, onClose, title, children, className }: ModalProps) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    // Respect an explicit autoFocus inside the dialog; otherwise focus the first field.
    if (!panel.current?.contains(document.activeElement)) {
      panel.current?.querySelector<HTMLElement>('input,select,textarea')?.focus();
    }
    return () => {
      document.removeEventListener('keydown', onKey);
      previous?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-6" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div
        ref={panel}
        className={cn(
          'relative w-full sm:max-w-lg bg-surface text-primary border border-border shadow-2xl',
          'rounded-t-2xl sm:rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150',
          className,
        )}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          <button data-close onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg text-secondary hover:bg-black/5 dark:hover:bg-white/10">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 max-h-[80vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
