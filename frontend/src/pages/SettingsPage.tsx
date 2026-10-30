import { useQueryClient } from '@tanstack/react-query';
import { Copy } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { workspaceApi } from '../api/endpoints';
import { useAuth, useWorkspace } from '../auth/AuthProvider';
import { Button } from '../components/ui/Button';
import { Field } from '../components/ui/Field';
import { Input } from '../components/ui/Input';
import { PageHeader } from '../components/ui/PageHeader';
import { Select } from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';
import { StateView } from '../components/ui/StateView';
import { useConnections, useCreateConnection, useRevokeConnection } from '../hooks/useInbox';
import { useActivity } from '../hooks/useInsights';
import { errorMessage } from '../lib/http';
import { CURRENCIES } from '../lib/money';

export default function SettingsPage() {
  const { user, reload } = useAuth();
  const ws = useWorkspace();
  const qc = useQueryClient();
  const activity = useActivity();
  const connections = useConnections();
  const createConnection = useCreateConnection();
  const revokeConnection = useRevokeConnection();
  const [connectName, setConnectName] = useState('Expense split');
  const [created, setCreated] = useState<{ secret: string } | null>(null);
  const endpoint = `${window.location.origin}/api/v1/ingest`;
  const [name, setName] = useState(ws.name);
  const [currency, setCurrency] = useState(ws.baseCurrency);
  const [saving, setSaving] = useState(false);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await workspaceApi.rename(ws.id, name.trim(), currency);
      await reload();
      void qc.invalidateQueries({ queryKey: ['ws', ws.id] });
      toast.success('Saved');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader title="Settings" subtitle={user?.email} />
      <div className="space-y-6 max-w-3xl">
        <section className="glass-panel p-5">
          <h2 className="font-semibold mb-3">Your ledger</h2>
          <form onSubmit={save} className="grid sm:grid-cols-[1fr_8rem_auto] gap-3 items-end">
            <Field label="Name"><Input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} /></Field>
            <Field label="Main currency"><Select value={currency} onChange={(e) => setCurrency(e.target.value)}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</Select></Field>
            <Button type="submit" disabled={saving}>Save</Button>
          </form>
          <p className="text-xs text-secondary mt-2">
            Reports and trips count everything in the main currency, using each day's exchange rate. Changing it restates your history (values you set by hand are kept).
          </p>
        </section>

        <section className="glass-panel p-5">
          <h2 className="font-semibold mb-1">Connect your expense-split app</h2>
          <p className="text-sm text-secondary mb-4">
            Group expenses are entered in the split app and arrive in <strong>To review</strong>. Create a connection here and paste its code into the split app. It can only send items to this ledger, and you can revoke it any time.
          </p>
          <StateView isLoading={connections.isLoading} error={connections.error} isEmpty={(connections.data ?? []).length === 0} emptyTitle="Not connected yet">
            <ul className="divide-y divide-border text-sm mb-4">
              {connections.data?.map((c) => (
                <li key={c.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{c.name} <span className="text-xs text-secondary font-normal">· {c.prefix}…</span></p>
                    <p className="text-xs text-secondary">{c.lastUsedAt ? `Last sent items ${new Date(c.lastUsedAt).toLocaleString()}` : 'Not used yet'}</p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => revokeConnection.mutate(c.id)} disabled={revokeConnection.isPending}>Disconnect</Button>
                </li>
              ))}
            </ul>
          </StateView>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              createConnection.mutate(connectName.trim() || 'Expense split', { onSuccess: (r) => setCreated({ secret: r.secret }) });
            }}
          >
            <Input value={connectName} onChange={(e) => setConnectName(e.target.value)} maxLength={80} aria-label="Connection name" />
            <Button type="submit" disabled={createConnection.isPending}>Connect an app</Button>
          </form>
        </section>

        <section className="glass-panel p-5">
          <h2 className="font-semibold mb-3">Recent activity</h2>
          <StateView isLoading={activity.isLoading} error={activity.error} isEmpty={activity.data?.length === 0} emptyTitle="No activity yet">
            <ul className="divide-y divide-border text-sm">
              {activity.data?.slice(0, 20).map((a) => (
                <li key={a.id} className="py-2 flex justify-between gap-3">
                  <span>{a.action.toLowerCase().replace('_', ' ')} {a.entity}{a.summary ? ` · ${a.summary}` : ''}</span>
                  <time className="text-xs text-secondary shrink-0">{new Date(a.at).toLocaleString()}</time>
                </li>
              ))}
            </ul>
          </StateView>
        </section>
      </div>
      {created && <ConnectionCode secret={created.secret} endpoint={endpoint} onClose={() => setCreated(null)} />}
    </>
  );
}

/** Shown once: the secret cannot be retrieved again, only replaced by a new connection. */
function ConnectionCode({ secret, endpoint, onClose }: { secret: string; endpoint: string; onClose: () => void }) {
  const code = `keeper-connect:v1:${btoa(JSON.stringify({ url: endpoint, token: secret }))}`;
  const copy = (text: string) => void navigator.clipboard.writeText(text).then(() => toast.success('Copied'));
  return (
    <Modal isOpen onClose={onClose} title="Connect the split app">
      <p className="text-sm text-secondary mb-4">Copy this into the split app now. For your security it is shown only once.</p>
      <Field label="Connection code (paste this into the app)">
        <div className="flex gap-2"><Input readOnly value={code} onFocus={(e) => e.target.select()} aria-label="Connection code" /><Button variant="outline" onClick={() => copy(code)} aria-label="Copy code"><Copy className="w-4 h-4" /></Button></div>
      </Field>
      <details className="mt-4 text-sm">
        <summary className="cursor-pointer text-secondary">Or set it up by hand</summary>
        <div className="mt-3 space-y-3">
          <Field label="Address"><div className="flex gap-2"><Input readOnly value={endpoint} /><Button variant="outline" onClick={() => copy(endpoint)} aria-label="Copy address"><Copy className="w-4 h-4" /></Button></div></Field>
          <Field label="Token"><div className="flex gap-2"><Input readOnly value={secret} /><Button variant="outline" onClick={() => copy(secret)} aria-label="Copy token"><Copy className="w-4 h-4" /></Button></div></Field>
          <p className="text-xs text-secondary">Send it as <code>Authorization: Bearer &lt;token&gt;</code>. Test with <code>GET {endpoint}/ping</code>.</p>
        </div>
      </details>
      <div className="flex justify-end mt-5"><Button onClick={onClose}>Done</Button></div>
    </Modal>
  );
}
