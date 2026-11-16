import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';

/** Opens whenever the server says the Free plan does not allow something, in the server's own words. */
export function UpgradePrompt() {
  const [message, setMessage] = useState<string | null>(null);
  const navigate = useNavigate();
  useEffect(() => {
    const on = (e: Event) => setMessage((e as CustomEvent<string>).detail);
    window.addEventListener('keeper:plan-limit', on);
    return () => window.removeEventListener('keeper:plan-limit', on);
  }, []);
  return (
    <Modal isOpen={message !== null} onClose={() => setMessage(null)} title="This is part of Pro">
      <p className="text-body mb-5">{message}</p>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => setMessage(null)}>Not now</Button>
        <Button onClick={() => { setMessage(null); navigate('/billing'); }}>See plans</Button>
      </div>
    </Modal>
  );
}
