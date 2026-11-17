import { FileText, Paperclip, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { receiptsApi } from '../../api/endpoints';
import type { ReceiptFile, Transaction } from '../../api/types';
import { useWorkspace } from '../../auth/AuthProvider';
import { Button } from '../../components/ui/Button';
import { IconButton } from '../../components/ui/IconButton';
import { Modal } from '../../components/ui/Modal';
import { useReceiptActions, useReceipts } from '../../hooks/useReceipts';
import { errorMessage } from '../../lib/http';
import { shrinkPhoto } from '../../lib/image';

/** A photo or PDF of the receipt, kept with the transaction (encrypted on the server). */
export function ReceiptsModal({ tx, canEdit, onClose }: { tx: Transaction; canEdit: boolean; onClose: () => void }) {
  const list = useReceipts(tx.id);
  const { upload, remove } = useReceiptActions(tx.id);
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      const blob = await shrinkPhoto(file);
      await upload.mutateAsync({ file: blob, name: file.name });
      toast.success('Receipt attached');
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  return (
    <Modal isOpen onClose={onClose} title="Receipts">
      <div className="space-y-4">
        <p className="text-body text-secondary">{tx.payeeName ?? tx.note ?? tx.categoryName ?? 'This transaction'}: keep the receipt for returns, refunds and tax time. Photos are shrunk to stay light.</p>
        {list.isLoading ? <p className="text-body text-secondary">Loading…</p> : (list.data ?? []).length === 0 ? (
          <p className="text-body text-secondary rounded-xl bg-primary/[0.04] px-4 py-6 text-center">No receipts yet.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-3">
            {(list.data ?? []).map((r) => <Thumb key={r.id} r={r} canEdit={canEdit} onRemove={() => remove.mutate(r.id, { onError: (e) => toast.error(errorMessage(e)) })} />)}
          </ul>
        )}
        {canEdit && (
          <>
            <input ref={input} type="file" accept="image/*,application/pdf" capture="environment" className="sr-only" aria-label="Choose a receipt" onChange={(e) => void pick(e.target.files?.[0])} />
            <Button className="w-full" disabled={busy} onClick={() => input.current?.click()}><Paperclip className="w-4 h-4 mr-2" />{busy ? 'Attaching…' : 'Take a photo or choose a file'}</Button>
          </>
        )}
      </div>
    </Modal>
  );
}

/** One receipt: fetched with the sign-in header, shown from a temporary local address. */
function Thumb({ r, canEdit, onRemove }: { r: ReceiptFile; canEdit: boolean; onRemove: () => void }) {
  const { id: ws } = useWorkspace();
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let made: string | null = null;
    let alive = true;
    void receiptsApi.file(ws, r.id).then((blob) => {
      if (!alive) return;
      made = URL.createObjectURL(blob);
      setUrl(made);
    });
    return () => {
      alive = false;
      if (made) URL.revokeObjectURL(made);
    };
  }, [ws, r.id]);
  const pdf = r.contentType === 'application/pdf';
  return (
    <li className="relative rounded-xl overflow-hidden border border-border bg-primary/[0.03] aspect-[3/4] group">
      {url && (
        <a href={url} target="_blank" rel="noreferrer" className="block w-full h-full" aria-label={`Open ${r.filename}`}>
          {pdf ? <span className="w-full h-full flex flex-col items-center justify-center gap-2 text-secondary"><FileText className="w-8 h-8" /><span className="text-caption px-2 truncate max-w-full">{r.filename}</span></span> : <img src={url} alt={r.filename} className="w-full h-full object-cover" />}
        </a>
      )}
      {canEdit && <div className="absolute top-1.5 right-1.5 rounded-lg bg-surface/90 shadow-card"><IconButton label="Remove receipt" onClick={onRemove}><Trash2 className="w-4 h-4" /></IconButton></div>}
    </li>
  );
}
