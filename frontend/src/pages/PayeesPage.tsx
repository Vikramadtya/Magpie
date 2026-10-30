import { Plus, Trash2, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import type { Payee } from '../api/types';
import { useWorkspace } from '../auth/AuthProvider';
import { Button } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Field } from '../components/ui/Field';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { PageHeader } from '../components/ui/PageHeader';
import { Select } from '../components/ui/Select';
import { StateView } from '../components/ui/StateView';
import { groupCategories } from '../features/transactions/TransactionDialog';
import { useCategories, useCreatePayee, useCreateTag, useDeletePayee, useDeleteTag, usePayees, useTags, useUpdatePayee } from '../hooks/useReference';

export default function PayeesPage() {
  const { canEdit } = useWorkspace();
  const payees = usePayees();
  const tags = useTags();
  const categories = useCategories().data ?? [];
  const [editing, setEditing] = useState<Payee | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Payee | null>(null);
  const [tagName, setTagName] = useState('');
  const del = useDeletePayee();
  const createTag = useCreateTag();
  const deleteTag = useDeleteTag();
  const nameOf = (id: string | null) => categories.find((c) => c.id === id)?.name;

  const addTag = (e: FormEvent) => {
    e.preventDefault();
    if (!tagName.trim()) return;
    createTag.mutate({ name: tagName.trim() }, { onSuccess: () => setTagName('') });
  };

  return (
    <>
      <PageHeader title="Payees & tags" subtitle="Who you pay, and labels for slicing your data" actions={canEdit && <Button onClick={() => setEditing('new')}><Plus className="w-4 h-4 mr-2" />New payee</Button>} />
      <div className="grid lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2">
          <h2 className="font-semibold mb-3">Payees</h2>
          <StateView isLoading={payees.isLoading} error={payees.error} onRetry={() => void payees.refetch()} isEmpty={(payees.data ?? []).length === 0} emptyTitle="No payees yet" emptyHint="They are created as you record transactions.">
            <ul className="glass-panel divide-y divide-border">
              {payees.data?.map((p) => (
                <li key={p.id} className="px-4 py-2.5 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{p.name}</p>
                    {p.defaultCategoryId && <p className="text-xs text-secondary">Defaults to {nameOf(p.defaultCategoryId)}</p>}
                  </div>
                  {canEdit && <div className="flex gap-1"><Button size="sm" variant="ghost" onClick={() => setEditing(p)}>Edit</Button><Button size="sm" variant="ghost" onClick={() => setDeleting(p)}><Trash2 className="w-4 h-4" /></Button></div>}
                </li>
              ))}
            </ul>
          </StateView>
        </section>
        <section>
          <h2 className="font-semibold mb-3">Tags</h2>
          <div className="glass-panel p-4">
            <div className="flex flex-wrap gap-2 mb-3">
              {(tags.data ?? []).map((t) => (
                <span key={t.id} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border border-border">
                  {t.name}
                  {canEdit && <button aria-label={`Delete tag ${t.name}`} onClick={() => deleteTag.mutate(t.id)}><X className="w-3 h-3" /></button>}
                </span>
              ))}
              {tags.data?.length === 0 && <p className="text-sm text-secondary">No tags yet.</p>}
            </div>
            {canEdit && (
              <form onSubmit={addTag} className="flex gap-2">
                <Input value={tagName} onChange={(e) => setTagName(e.target.value)} placeholder="New tag" maxLength={60} aria-label="New tag" />
                <Button type="submit" disabled={createTag.isPending}>Add</Button>
              </form>
            )}
          </div>
        </section>
      </div>
      {editing && <PayeeModal payee={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      <ConfirmDialog open={!!deleting} title={`Delete ${deleting?.name}?`} message="Transactions keep their amounts but lose this payee." onCancel={() => setDeleting(null)} onConfirm={() => { if (deleting) del.mutate(deleting.id); setDeleting(null); }} />
    </>
  );
}

function PayeeModal({ payee, onClose }: { payee: Payee | null; onClose: () => void }) {
  const categories = useCategories().data ?? [];
  const create = useCreatePayee();
  const update = useUpdatePayee();
  const [name, setName] = useState(payee?.name ?? '');
  const [categoryId, setCategoryId] = useState(payee?.defaultCategoryId ?? '');
  const groups = groupCategories(categories, 'EXPENSE');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const body = { name: name.trim(), defaultCategoryId: categoryId || null };
    if (payee) update.mutate({ id: payee.id, ...body }, { onSuccess: onClose });
    else create.mutate(body, { onSuccess: onClose });
  };

  return (
    <Modal isOpen onClose={onClose} title={payee ? 'Edit payee' : 'New payee'}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Name"><Input value={name} onChange={(e) => setName(e.target.value)} maxLength={160} autoFocus /></Field>
        <Field label="Default category" hint="Applied automatically when you pick this payee.">
          <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">None</option>
            {groups.map((g) => <optgroup key={g.parent.id} label={g.parent.name}>{[g.parent, ...g.children].map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</optgroup>)}
          </Select>
        </Field>
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" disabled={create.isPending || update.isPending}>Save</Button></div>
      </form>
    </Modal>
  );
}
