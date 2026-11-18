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
      <div className="absolute inset-0 bg-black/30 backdrop-blur-md" onClick={onClose} />
      <div
        ref={panel}
        className={cn(
          'relative w-full sm:max-w-lg bg-surface/95 backdrop-blur-2xl text-primary shadow-[0_24px_80px_-12px_rgb(0_0_0/0.35)]',
          'rounded-t-[22px] sm:rounded-[22px] overflow-hidden animate-in fade-in zoom-in-95 duration-150',
          className,
        )}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/70">
          <h2 className="text-[17px] font-semibold tracking-[-0.015em]">{title}</h2>
          <button data-close onClick={onClose} aria-label="Close" className="p-1.5 rounded-full text-secondary bg-primary/[0.06] hover:bg-primary/[0.1]">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 max-h-[80vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
