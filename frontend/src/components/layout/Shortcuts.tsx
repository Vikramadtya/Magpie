import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../ui/Modal';

const GO: Record<string, string> = { h: '/dashboard', t: '/transactions', p: '/plan', w: '/wealth', i: '/analytics', s: '/settings', r: '/review' };

export const SHORTCUTS: [string, string][] = [
  ['N', 'Add a transaction'],
  ['⌘K  or  Ctrl K', 'Search everything'],
  ['G then H', 'Go to Home'],
  ['G then T', 'Go to Transactions'],
  ['G then P', 'Go to Plan'],
  ['G then W', 'Go to Wealth'],
  ['G then I', 'Go to Insights'],
  ['G then S', 'Go to Settings'],
  ['P', 'Hide or show amounts'],
  ['?', 'This list'],
];

const isTyping = (e: KeyboardEvent) => {
  const el = e.target as HTMLElement | null;
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
};

/** Single-key shortcuts for people who live in the keyboard; ignored while typing. */
export function useShortcuts(togglePrivacy: () => void) {
  const navigate = useNavigate();
  useEffect(() => {
    let armed = 0;
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e) || e.metaKey || e.ctrlKey || e.altKey) return;
      const key = e.key.toLowerCase();
      if (armed && Date.now() - armed < 1200 && GO[key]) {
        armed = 0;
        navigate(GO[key]);
        return;
      }
      armed = 0;
      if (key === 'g') armed = Date.now();
      else if (key === 'p') togglePrivacy();
      else if (key === '?') window.dispatchEvent(new Event('keeper:shortcuts'));
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [navigate, togglePrivacy]);
}

export function ShortcutHelp() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener('keeper:shortcuts', show);
    return () => window.removeEventListener('keeper:shortcuts', show);
  }, []);
  return (
    <Modal isOpen={open} onClose={() => setOpen(false)} title="Keyboard shortcuts">
      <dl className="divide-y divide-border">
        {SHORTCUTS.map(([keys, what]) => (
          <div key={keys} className="flex justify-between gap-4 py-2.5 text-body">
            <dt className="text-secondary">{what}</dt>
            <dd><kbd className="rounded-md bg-primary/[0.06] px-2 py-0.5 text-caption font-medium tabular-nums">{keys}</kbd></dd>
          </div>
        ))}
      </dl>
    </Modal>
  );
}
