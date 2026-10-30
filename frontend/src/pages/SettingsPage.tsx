import { useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { workspaceApi } from '../api/endpoints';
import { useAuth, useWorkspace } from '../auth/AuthProvider';
import { Button } from '../components/ui/Button';
import { Field } from '../components/ui/Field';
import { Input } from '../components/ui/Input';
import { PageHeader } from '../components/ui/PageHeader';
import { Select } from '../components/ui/Select';
import { StateView } from '../components/ui/StateView';
import { useActivity } from '../hooks/useInsights';
import { errorMessage } from '../lib/http';
import { CURRENCIES } from '../lib/money';

export default function SettingsPage() {
  const { user, reload } = useAuth();
  const ws = useWorkspace();
  const qc = useQueryClient();
  const activity = useActivity();
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
    </>
  );
}
