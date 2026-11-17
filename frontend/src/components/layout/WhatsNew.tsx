import { useEffect, useState } from 'react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { hasUnseenRelease, latestRelease, markReleaseSeen } from '../../lib/whatsNew';

/** Shown once per release, a moment after the app opens so it never fights the first paint. */
export function WhatsNew() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!hasUnseenRelease()) return;
    const t = setTimeout(() => setOpen(true), 1200);
    return () => clearTimeout(t);
  }, []);
  const close = () => { markReleaseSeen(); setOpen(false); };
  return (
    <Modal isOpen={open} onClose={close} title={latestRelease.title}>
      <ul className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
        {latestRelease.items.map(([name, text]) => (
          <li key={name}><p className="text-sm font-medium">{name}</p><p className="text-sm text-secondary">{text}</p></li>
        ))}
      </ul>
      <div className="mt-5 flex justify-end"><Button onClick={close}>Got it</Button></div>
    </Modal>
  );
}
