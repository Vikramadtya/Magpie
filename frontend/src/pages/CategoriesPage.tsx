import { Plus } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import type { Category } from '../api/types';
import { useWorkspace } from '../auth/AuthProvider';
import { Button } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Field } from '../components/ui/Field';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { PageHeader } from '../components/ui/PageHeader';
import { StateView } from '../components/ui/StateView';
import { useCategories, useCreateCategory, useDeleteCategory, useUpdateCategory } from '../hooks/useReference';
import { cn } from '../lib/cn';

type Editing = { category: Category | null; parent: Category | null; kind: 'INCOME' | 'EXPENSE' };

export default function CategoriesPage() {
  const { canEdit } = useWorkspace();
  const categories = useCategories();
  const [kind, setKind] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const [editing, setEditing] = useState<Editing | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);
  const del = useDeleteCategory();

  const groups = useMemo(() => {
    const all = (categories.data ?? []).filter((c) => c.kind === kind);
    return all.filter((c) => !c.parentId).map((p) => ({ parent: p, children: all.filter((c) => c.parentId === p.id) }));
  }, [categories.data, kind]);

  return (
    <>
      <PageHeader title="Categories" subtitle="Group your spending and income" actions={canEdit && <Button onClick={() => setEditing({ category: null, parent: null, kind })}><Plus className="w-4 h-4 mr-2" />New category</Button>} />
      <div className="inline-flex p-1 rounded-lg bg-black/5 dark:bg-white/10 mb-4" role="tablist">
        {(['EXPENSE', 'INCOME'] as const).map((k) => (
          <button key={k} role="tab" aria-selected={kind === k} onClick={() => setKind(k)} className={cn('px-4 py-1.5 text-sm font-medium rounded-md', kind === k ? 'bg-surface shadow-sm' : 'text-secondary')}>{k === 'EXPENSE' ? 'Expenses' : 'Income'}</button>
        ))}
      </div>
      <StateView isLoading={categories.isLoading} error={categories.error} onRetry={() => void categories.refetch()} isEmpty={groups.length === 0} emptyTitle="No categories" emptyHint="Create one to start organizing.">
        <ul className="space-y-3">
          {groups.map(({ parent, children }) => (
            <li key={parent.id} className="glass-panel p-4">
              <div className="flex items-center justify-between">
                <p className="font-semibold flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{ background: parent.color ?? 'var(--accent-blue)' }} />{parent.icon} {parent.name}</p>
                {canEdit && (
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => setEditing({ category: null, parent, kind })}>+ Sub</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditing({ category: parent, parent: null, kind })}>Edit</Button>
                    <Button size="sm" variant="ghost" onClick={() => setDeleting(parent)}>Delete</Button>
                  </div>
                )}
              </div>
              {children.length > 0 && (
                <ul className="mt-2 ml-5 divide-y divide-border">
                  {children.map((c) => (
                    <li key={c.id} className="py-1.5 flex items-center justify-between text-sm">
                      <span>{c.name}</span>
                      {canEdit && <div className="flex gap-1"><Button size="sm" variant="ghost" onClick={() => setEditing({ category: c, parent, kind })}>Edit</Button><Button size="sm" variant="ghost" onClick={() => setDeleting(c)}>Delete</Button></div>}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </StateView>
      {editing && <CategoryModal editing={editing} onClose={() => setEditing(null)} />}
      <ConfirmDialog open={!!deleting} title={`Delete ${deleting?.name}?`} message="It will be hidden from pickers. Existing transactions keep their category." onCancel={() => setDeleting(null)} onConfirm={() => { if (deleting) del.mutate(deleting.id); setDeleting(null); }} />
    </>
  );
}

function CategoryModal({ editing, onClose }: { editing: Editing; onClose: () => void }) {
  const { category, parent, kind } = editing;
  const create = useCreateCategory();
  const update = useUpdateCategory();
  const [name, setName] = useState(category?.name ?? '');
  const [icon, setIcon] = useState(category?.icon ?? '');
  const [color, setColor] = useState(category?.color ?? parent?.color ?? '#0A84FF');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const body = { name: name.trim(), icon: icon || undefined, color };
    if (category) update.mutate({ id: category.id, body: { ...body, parentId: category.parentId } }, { onSuccess: onClose });
    else create.mutate({ ...body, kind, parentId: parent?.id ?? null }, { onSuccess: onClose });
  };

  return (
    <Modal isOpen onClose={onClose} title={category ? 'Edit category' : parent ? `New sub-category of ${parent.name}` : 'New category'}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Name"><Input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} autoFocus /></Field>
        {!parent && !category?.parentId && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Icon (emoji)"><Input value={icon} onChange={(e) => setIcon(e.target.value)} maxLength={4} placeholder="🛒" /></Field>
            <Field label="Colour"><Input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="p-1" /></Field>
          </div>
        )}
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" disabled={create.isPending || update.isPending}>Save</Button></div>
      </form>
    </Modal>
  );
}
