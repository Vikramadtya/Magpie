import { Pencil, Plus, Trash2, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import type { Payee } from '../api/types';
import { useWorkspace } from '../auth/AuthProvider';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import { IconButton } from '../components/ui/IconButton';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Field } from '../components/ui/Field';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { PageHeader } from '../components/ui/PageHeader';
import { Select } from '../components/ui/Select';
import { StateView } from '../components/ui/StateView';
import { groupCategories } from '../features/transactions/TransactionDialog';
import { useCategories, useCreatePayee, useCreatePerson, useCreateTag, useDeletePayee, useDeletePerson, useDeleteTag, usePayees, usePeople, useTags, useUpdatePayee } from '../hooks/useReference';

export default function PayeesPage() {
  const { canEdit } = useWorkspace();
  const payees = usePayees();
  const tags = useTags();
  const categories = useCategories().data ?? [];
  const [editing, setEditing] = useState<Payee | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Payee | null>(null);
  const [tagName, setTagName] = useState('');
  const del = useDeletePayee();
  const people = usePeople();
  const [personName, setPersonName] = useState('');
  const createPerson = useCreatePerson();
  const deletePerson = useDeletePerson();
  const createTag = useCreateTag();
  const deleteTag = useDeleteTag();
  const nameOf = (id: string | null) => categories.find((c) => c.id === id)?.name;

  const addTag = (e: FormEvent) => {
    e.preventDefault();
    if (!tagName.trim()) return;
    createTag.mutate({ name: tagName.trim() }, { onSuccess: () => setTagName('') });
  };

  const addPerson = (e: FormEvent) => {
    e.preventDefault();
    if (!personName.trim()) return;
    createPerson.mutate(personName.trim(), { onSuccess: () => setPersonName('') });
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
                <li key={p.id} className="px-5 py-3 flex items-center gap-3 group">
                  <Avatar name={p.name} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.name}</p>
                    {p.defaultCategoryId && <p className="text-xs text-secondary">Defaults to {nameOf(p.defaultCategoryId)}</p>}
                  </div>
                  {canEdit && <div className="flex gap-0.5 sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100 transition-opacity"><IconButton label="Edit" onClick={() => setEditing(p)}><Pencil className="w-4 h-4" /></IconButton><IconButton label="Delete" onClick={() => setDeleting(p)}><Trash2 className="w-4 h-4" /></IconButton></div>}
                </li>
              ))}
            </ul>
          </StateView>
        </section>
        <section>
          <h2 className="font-semibold mb-3">Tags</h2>
          <div className="glass-panel p-5">
            <div className="flex flex-wrap gap-2 mb-3">
              {(tags.data ?? []).map((t) => (
                <span key={t.id} className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1 rounded-full text-xs font-medium bg-primary/[0.06]">
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
        <section className="lg:col-span-3">
          <h2 className="font-semibold mb-1">People</h2>
          <p className="text-xs text-secondary mb-3">Others who spend from your accounts. Mark a transaction as theirs and it stays out of your own spending, analytics and budgets (unless a budget opts in).</p>
          <div className="glass-panel p-4">
            <div className="flex flex-wrap gap-2 mb-3">
              {(people.data ?? []).map((p) => (
                <span key={p.id} className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1 rounded-full text-xs font-medium bg-primary/[0.06]">
                  {p.name}
                  {canEdit && <button aria-label={`Remove ${p.name}`} onClick={() => deletePerson.mutate(p.id)}><X className="w-3 h-3" /></button>}
                </span>
              ))}
              {people.data?.length === 0 && <p className="text-sm text-secondary">No one yet.</p>}
            </div>
            {canEdit && (
              <form onSubmit={addPerson} className="flex gap-2 max-w-sm">
                <Input value={personName} onChange={(e) => setPersonName(e.target.value)} placeholder="Add a person" maxLength={120} aria-label="New person" />
                <Button type="submit" disabled={createPerson.isPending}>Add</Button>
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
