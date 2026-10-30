import { Copy } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { workspaceApi } from '../api/endpoints';
import type { Role } from '../api/types';
import { useAuth, useWorkspace } from '../auth/AuthProvider';
import { Button } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Field } from '../components/ui/Field';
import { Input } from '../components/ui/Input';
import { PageHeader } from '../components/ui/PageHeader';
import { Select } from '../components/ui/Select';
import { StateView } from '../components/ui/StateView';
import { useActivity, useMembers } from '../hooks/useInsights';
import { qk } from '../hooks/keys';
import { errorMessage } from '../lib/http';
import { CURRENCIES } from '../lib/money';
import { useQueryClient } from '@tanstack/react-query';

export default function SettingsPage() {
  const { user, reload, selectWorkspace, workspaces } = useAuth();
  const ws = useWorkspace();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const members = useMembers();
  const activity = useActivity();
  const [name, setName] = useState(ws.name);
  const [currency, setCurrency] = useState(ws.baseCurrency);
  const [newName, setNewName] = useState('');
  const [inviteRole, setInviteRole] = useState<'EDITOR' | 'VIEWER'>('EDITOR');
  const [inviteLink, setInviteLink] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);

  const run = async (fn: () => Promise<unknown>, ok?: string) => {
    try {
      await fn();
      if (ok) toast.success(ok);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const save = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => { await workspaceApi.rename(ws.id, name.trim(), currency); await reload(); void qc.invalidateQueries({ queryKey: ['ws', ws.id] }); }, 'Saved');
  };
  const createWorkspace = (e: FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    void run(async () => { const created = await workspaceApi.create(newName.trim(), currency); await reload(); selectWorkspace(created.id); setNewName(''); }, 'Workspace created');
  };
  const invite = () =>
    run(async () => {
      const r = await workspaceApi.invite(ws.id, inviteRole);
      setInviteLink(`${window.location.origin}${r.path}`);
    });
  const leaveOrDelete = async (fn: () => Promise<unknown>) => {
    await run(async () => {
      await fn();
      await reload();
      const other = workspaces.find((w) => w.id !== ws.id);
      if (other) selectWorkspace(other.id);
      navigate('/dashboard');
    });
  };

  return (
    <>
      <PageHeader title="Settings" subtitle={user?.email} />
      <div className="space-y-6 max-w-3xl">
        {ws.isOwner && (
          <section className="glass-panel p-5">
            <h2 className="font-semibold mb-3">Workspace</h2>
            <form onSubmit={save} className="grid sm:grid-cols-[1fr_8rem_auto] gap-3 items-end">
              <Field label="Name"><Input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} /></Field>
              <Field label="Main currency"><Select value={currency} onChange={(e) => setCurrency(e.target.value)}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</Select></Field>
              <Button type="submit">Save</Button>
            </form>
            <p className="text-xs text-secondary mt-2">Reports convert other currencies into the main currency using daily rates.</p>
          </section>
        )}

        <section className="glass-panel p-5">
          <h2 className="font-semibold mb-3">People</h2>
          <StateView isLoading={members.isLoading} error={members.error}>
            <ul className="divide-y divide-border">
              {members.data?.map((m) => (
                <li key={m.userId} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0"><p className="text-sm font-medium truncate">{m.name}{m.userId === user?.id ? ' (you)' : ''}</p><p className="text-xs text-secondary truncate">{m.email}</p></div>
                  {ws.isOwner && m.userId !== user?.id ? (
                    <div className="flex items-center gap-2">
                      <Select className="h-9 w-28" value={m.role} aria-label={`Role of ${m.name}`} onChange={(e) => void run(async () => { await workspaceApi.setRole(ws.id, m.userId, e.target.value as Role); await qc.invalidateQueries({ queryKey: qk.members(ws.id) }); })}>
                        <option value="OWNER">Owner</option><option value="EDITOR">Editor</option><option value="VIEWER">Viewer</option>
                      </Select>
                      <Button size="sm" variant="ghost" onClick={() => void run(async () => { await workspaceApi.removeMember(ws.id, m.userId); await qc.invalidateQueries({ queryKey: qk.members(ws.id) }); })}>Remove</Button>
                    </div>
                  ) : <span className="text-xs text-secondary">{m.role.toLowerCase()}</span>}
                </li>
              ))}
            </ul>
          </StateView>

          {ws.isOwner && (
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-sm font-medium mb-2">Invite someone</p>
              <div className="flex gap-2">
                <Select className="w-32" value={inviteRole} onChange={(e) => setInviteRole(e.target.value as 'EDITOR' | 'VIEWER')} aria-label="Invite role"><option value="EDITOR">Editor</option><option value="VIEWER">Viewer</option></Select>
                <Button onClick={() => void invite()}>Create link</Button>
              </div>
              {inviteLink && (
                <div className="mt-3 flex gap-2">
                  <Input readOnly value={inviteLink} onFocus={(e) => e.target.select()} aria-label="Invite link" />
                  <Button variant="outline" onClick={() => void navigator.clipboard.writeText(inviteLink).then(() => toast.success('Link copied'))}><Copy className="w-4 h-4" /></Button>
                </div>
              )}
              <p className="text-xs text-secondary mt-2">Links work once and expire after 7 days. Anyone with the link who signs in joins with that role.</p>
            </div>
          )}
        </section>

        <section className="glass-panel p-5">
          <h2 className="font-semibold mb-3">Recent activity</h2>
          <StateView isLoading={activity.isLoading} error={activity.error} isEmpty={activity.data?.length === 0} emptyTitle="No activity yet">
            <ul className="divide-y divide-border text-sm">
              {activity.data?.slice(0, 20).map((a) => (
                <li key={a.id} className="py-2 flex justify-between gap-3">
                  <span><strong>{a.userName ?? 'Someone'}</strong> {a.action.toLowerCase().replace('_', ' ')} {a.entity}{a.summary ? ` · ${a.summary}` : ''}</span>
                  <time className="text-xs text-secondary shrink-0">{new Date(a.at).toLocaleString()}</time>
                </li>
              ))}
            </ul>
          </StateView>
        </section>

        <section className="glass-panel p-5">
          <h2 className="font-semibold mb-3">New workspace</h2>
          <form onSubmit={createWorkspace} className="flex gap-2">
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Household" maxLength={120} aria-label="Workspace name" />
            <Button type="submit">Create</Button>
          </form>
        </section>

        <section className="glass-panel p-5 border-red-500/30">
          <h2 className="font-semibold mb-3 text-red-500">Danger zone</h2>
          <div className="flex flex-wrap gap-2">
            {workspaces.length > 1 || !ws.isOwner ? <Button variant="outline" onClick={() => setConfirmLeave(true)}>Leave workspace</Button> : null}
            {ws.isOwner && workspaces.length > 1 && <Button variant="destructive" onClick={() => setConfirmDelete(true)}>Delete workspace</Button>}
          </div>
          {workspaces.length === 1 && <p className="text-xs text-secondary mt-2">Create another workspace before leaving or deleting your only one.</p>}
        </section>
      </div>

      <ConfirmDialog open={confirmLeave} title="Leave workspace?" message={`You will lose access to "${ws.name}". An owner can invite you again.`} confirmLabel="Leave" onCancel={() => setConfirmLeave(false)} onConfirm={() => { setConfirmLeave(false); void leaveOrDelete(() => workspaceApi.leave(ws.id)); }} />
      <ConfirmDialog open={confirmDelete} title={`Delete "${ws.name}"?`} message="All accounts, transactions and budgets in it are permanently deleted for everyone. This cannot be undone." confirmLabel="Delete forever" onCancel={() => setConfirmDelete(false)} onConfirm={() => { setConfirmDelete(false); void leaveOrDelete(() => workspaceApi.remove(ws.id)); }} />
    </>
  );
}
