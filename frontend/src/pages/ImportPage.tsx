import { Download, Undo2, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { importApi } from '../api/endpoints';
import type { ImportPreview } from '../api/types';
import { useWorkspace } from '../auth/AuthProvider';
import { Button } from '../components/ui/Button';
import { Field } from '../components/ui/Field';
import { PageHeader } from '../components/ui/PageHeader';
import { Select } from '../components/ui/Select';
import { useImportCommit, useImportPreview, useUndoImport } from '../hooks/useInsights';
import { useAccounts } from '../hooks/useReference';
import { errorMessage } from '../lib/http';
import { formatMoney } from '../lib/money';

export default function ImportPage() {
  const { id: ws, canEdit } = useWorkspace();
  const accounts = (useAccounts().data ?? []).filter((a) => !a.archived);
  const [accountId, setAccountId] = useState('');
  const [dateFormat, setDateFormat] = useState('ISO');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [lastBatch, setLastBatch] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const previewMut = useImportPreview();
  const commit = useImportCommit();
  const undo = useUndoImport();
  const account = accounts.find((a) => a.id === (accountId || accounts[0]?.id));
  const currency = account?.currency ?? 'USD';

  const runPreview = () => {
    if (!file || !account) return;
    previewMut.mutate({ file, accountId: account.id, dateFormat }, { onSuccess: setPreview });
  };

  const runCommit = () => {
    if (!preview || !file || !account) return;
    const rows = preview.rows.filter((r) => !r.duplicate);
    commit.mutate({ accountId: account.id, fileName: file.name, rows }, {
      onSuccess: (r) => {
        toast.success(`Imported ${r.imported} transactions${r.duplicates ? ` (${r.duplicates} duplicates skipped)` : ''}`);
        setLastBatch(r.batchId);
        setPreview(null);
        setFile(null);
        if (input.current) input.current.value = '';
      },
    });
  };

  const exportCsv = async () => {
    try {
      const blob = await importApi.exportCsv(ws);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'keeper-transactions.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <>
      <PageHeader title="Import / export" subtitle="Bring in bank statements or take your data with you" actions={<Button variant="outline" onClick={() => void exportCsv()}><Download className="w-4 h-4 mr-2" />Export CSV</Button>} />

      {canEdit ? (
        <section className="glass-panel p-6 space-y-5">
          <h2 className="font-semibold">Import a CSV</h2>
          <p className="text-sm text-secondary">Needs a header row with <code>date</code> and <code>amount</code> (negative = spending), or <code>debit</code>/<code>credit</code> columns. A <code>description</code> column is used as the note. Rows already imported are skipped.</p>
          <div className="grid sm:grid-cols-3 gap-3">
            <Field label="Into account">
              <Select value={account?.id ?? ''} onChange={(e) => { setAccountId(e.target.value); setPreview(null); }}>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.currency})</option>)}</Select>
            </Field>
            <Field label="Date format">
              <Select value={dateFormat} onChange={(e) => { setDateFormat(e.target.value); setPreview(null); }}>
                <option value="ISO">2026-03-31</option><option value="DMY">31/03/2026</option><option value="MDY">03/31/2026</option>
              </Select>
            </Field>
            <Field label="File (max 5 MB)">
              <label className="flex h-11 w-full cursor-pointer items-center gap-2 rounded-xl border border-dashed border-border bg-surface px-3.5 text-sm text-secondary transition-colors hover:border-accent hover:text-primary focus-within:ring-4 focus-within:ring-accent/15">
                <Upload className="w-4 h-4 shrink-0" /><span className="truncate">{file ? file.name : 'Choose a CSV file'}</span>
                <input ref={input} type="file" accept=".csv,text/csv" onChange={(e) => { setFile(e.target.files?.[0] ?? null); setPreview(null); }} className="sr-only" />
              </label>
            </Field>
          </div>
          <Button onClick={runPreview} disabled={!file || !account || previewMut.isPending}><Upload className="w-4 h-4 mr-2" />Preview</Button>

          {preview && (
            <div className="space-y-3">
              <p className="text-sm">
                <strong>{preview.rows.length - preview.duplicates}</strong> new rows
                {preview.duplicates > 0 && <>, <strong>{preview.duplicates}</strong> duplicates</>}
                {preview.skipped > 0 && <>, <strong>{preview.skipped}</strong> unreadable rows skipped</>}
                <span className="text-secondary"> · format: {preview.strategy}</span>
              </p>
              <div className="max-h-72 overflow-y-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-surface text-left text-xs text-secondary"><tr><th className="p-2">Date</th><th className="p-2">Description</th><th className="p-2 text-right">Amount</th></tr></thead>
                  <tbody>
                    {preview.rows.slice(0, 200).map((r, i) => (
                      <tr key={i} className={`border-t border-border/60 ${r.duplicate ? 'opacity-40 line-through' : ''}`}>
                        <td className="p-2 whitespace-nowrap">{r.date}</td><td className="p-2 truncate max-w-xs">{r.description}</td>
                        <td className={`p-2 text-right tabular-nums ${r.amountMinor < 0 ? 'text-red-500' : 'text-green-600 dark:text-green-400'}`}>{formatMoney(r.amountMinor, currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Button onClick={runCommit} disabled={commit.isPending || preview.rows.length === preview.duplicates}>Import {preview.rows.length - preview.duplicates} transactions</Button>
            </div>
          )}

          {lastBatch && (
            <div className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
              <span>Imported just now.</span>
              <Button size="sm" variant="outline" disabled={undo.isPending} onClick={() => undo.mutate(lastBatch, { onSuccess: () => { toast.success('Import undone'); setLastBatch(null); } })}><Undo2 className="w-4 h-4 mr-2" />Undo</Button>
            </div>
          )}
        </section>
      ) : (
        <p className="text-sm text-secondary">You have view-only access, so importing is disabled. Export is still available.</p>
      )}
    </>
  );
}
