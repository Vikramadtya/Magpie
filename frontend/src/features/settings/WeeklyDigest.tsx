import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { digestApi } from '../../api/endpoints';
import { useWorkspace } from '../../auth/AuthProvider';
import { Button } from '../../components/ui/Button';
import { Field } from '../../components/ui/Field';
import { Input } from '../../components/ui/Input';
import { errorMessage } from '../../lib/http';

/** A short Sunday note in the user's own Discord channel; the webhook link is stored sealed and never shown again. */
export function WeeklyDigest() {
  const { id: ws, canEdit } = useWorkspace();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['ws', ws, 'digest'], queryFn: () => digestApi.get(ws) });
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const s = q.data;

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try {
      await fn();
      await qc.invalidateQueries({ queryKey: ['ws', ws, 'digest'] });
      toast.success(ok);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const save = (e: FormEvent) => {
    e.preventDefault();
    void run(() => digestApi.save(ws, { webhookUrl: url.trim(), enabled: true }), 'Weekly digest is on').then(() => setUrl(''));
  };

  return (
    <section className="glass-panel p-6">
      <h2>Weekly digest</h2>
      <p className="text-body text-secondary mt-1 mb-4">A short Sunday message in your own Discord channel: what you spent, bills due, refunds waiting and budgets close to the limit. Only you can see it; Keeper never reads the channel.</p>
      {s?.configured && (
        <div className="flex flex-wrap items-center gap-3 mb-4 text-body">
          <label className="flex items-center gap-2"><input type="checkbox" className="w-4 h-4" checked={s.enabled} disabled={!canEdit || busy} onChange={(e) => void run(() => digestApi.save(ws, { enabled: e.target.checked }), e.target.checked ? 'Weekly digest is on' : 'Weekly digest is off')} /> Send it every Sunday</label>
          <Button size="sm" variant="outline" disabled={busy || !canEdit} onClick={() => void run(() => digestApi.test(ws), 'Sent to Discord')}>Send one now</Button>
          {s.lastSentAt && <span className="text-caption text-secondary">Last sent {new Date(s.lastSentAt).toLocaleDateString()}</span>}
        </div>
      )}
      {canEdit && (
        <form onSubmit={save} className="grid sm:grid-cols-[1fr_auto] gap-3 items-end">
          <Field label={s?.configured ? 'Replace the Discord webhook link' : 'Discord webhook link'} hint="In Discord: channel settings, Integrations, Webhooks, New webhook, Copy link.">
            <Input type="password" autoComplete="off" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://discord.com/api/webhooks/…" maxLength={300} />
          </Field>
          <Button type="submit" disabled={busy || !url.trim()}>{s?.configured ? 'Replace' : 'Turn on'}</Button>
        </form>
      )}
    </section>
  );
}
