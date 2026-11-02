import { Copy, KeyRound, Smartphone } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/Button';
import { Field } from '../../components/ui/Field';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { useCreateQuickKey, useQuickKeys, useRevokeQuickKey } from '../../hooks/useInbox';
import { errorMessage } from '../../lib/http';

const copy = (text: string) => void navigator.clipboard.writeText(text).then(() => toast.success('Copied'));

/** Keys that let a phone page, an iPhone Shortcut or a form add entries to "To review". */
export function QuickAddKeys({ canEdit }: { canEdit: boolean }) {
  const keys = useQuickKeys();
  const create = useCreateQuickKey();
  const revoke = useRevokeQuickKey();
  const [label, setLabel] = useState('My phone');
  const [secret, setSecret] = useState<string | null>(null);

  return (
    <section className="glass-panel p-6">
      <h2 className="font-semibold mb-1 flex items-center gap-2"><Smartphone className="w-4 h-4" /> Quick add</h2>
      <p className="text-sm text-secondary mb-4">
        Add spending from your phone without waiting for Keeper to wake up. Each key can only send entries to <strong>To review</strong>; it cannot read anything, and you can revoke it at any time.
      </p>
      {(keys.data ?? []).length === 0 ? (
        <p className="text-sm text-secondary rounded-xl bg-primary/[0.04] px-4 py-3 mb-4">No keys yet.</p>
      ) : (
        <ul className="divide-y divide-border text-sm mb-4">
          {keys.data?.map((k) => (
            <li key={k.id} className="py-3 flex items-center gap-3">
              <span className="w-9 h-9 rounded-xl bg-accent/10 text-accent flex items-center justify-center shrink-0"><KeyRound className="w-4 h-4" /></span>
              <div className="flex-1 min-w-0">
                <p className="font-medium">{k.label} <span className="text-xs text-secondary font-normal">· {k.prefix}…</span></p>
                <p className="text-xs text-secondary">{k.lastUsedAt ? `Last used ${new Date(k.lastUsedAt).toLocaleString()}` : 'Not used yet'}</p>
              </div>
              {canEdit && <Button size="sm" variant="outline" disabled={revoke.isPending} onClick={() => revoke.mutate(k.id, { onSuccess: () => toast.success('Key revoked') })}>Revoke</Button>}
            </li>
          ))}
        </ul>
      )}
      {canEdit && (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate(label.trim() || 'My phone', { onSuccess: (r) => setSecret(r.secret), onError: (err) => toast.error(errorMessage(err)) });
          }}
        >
          <Input value={label} onChange={(e) => setLabel(e.target.value)} maxLength={60} aria-label="Key name" />
          <Button type="submit" disabled={create.isPending}>Create key</Button>
        </form>
      )}
      {secret && <NewKey secret={secret} onClose={() => setSecret(null)} />}
    </section>
  );
}

function NewKey({ secret, onClose }: { secret: string; onClose: () => void }) {
  const origin = window.location.origin;
  const link = `${origin}/quickadd#key=${secret}`;
  const endpoint = `${origin}/api/quickadd/submit`;
  const example = `curl -X POST ${endpoint} \\\n  -H "Authorization: Bearer ${secret}" \\\n  -H "Content-Type: application/json" \\\n  -d '{"amount":"450","account":"Card","category":"Food","payee":"Swiggy"}'`;
  return (
    <Modal isOpen onClose={onClose} title="Your quick-add key">
      <p className="text-sm text-secondary mb-4">Keep this safe. For your security it is shown only once.</p>
      <div className="space-y-4">
        <Field label="Open this link on your phone to set it up" hint="Anyone with the link can add entries to To review, so do not share it.">
          <div className="flex gap-2"><Input readOnly value={link} onFocus={(e) => e.target.select()} aria-label="Setup link" /><Button variant="outline" onClick={() => copy(link)} aria-label="Copy link"><Copy className="w-4 h-4" /></Button></div>
        </Field>
        <details className="text-sm">
          <summary className="cursor-pointer text-secondary">Use it from an iPhone Shortcut, a Google Form or a script</summary>
          <div className="mt-3 space-y-3">
            <Field label="Key"><div className="flex gap-2"><Input readOnly value={secret} onFocus={(e) => e.target.select()} /><Button variant="outline" onClick={() => copy(secret)} aria-label="Copy key"><Copy className="w-4 h-4" /></Button></div></Field>
            <Field label="Address"><div className="flex gap-2"><Input readOnly value={endpoint} /><Button variant="outline" onClick={() => copy(endpoint)} aria-label="Copy address"><Copy className="w-4 h-4" /></Button></div></Field>
            <pre className="text-xs bg-primary/[0.05] rounded-xl p-3 overflow-x-auto whitespace-pre-wrap break-all">{example}</pre>
            <p className="text-xs text-secondary">Send the key as <code>Authorization: Bearer …</code>. Accounts and categories can be given by name. The full guide is in docs/QUICKADD.md.</p>
          </div>
        </details>
      </div>
      <div className="flex justify-end mt-5"><Button onClick={onClose}>Done</Button></div>
    </Modal>
  );
}
