import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { receiptsApi } from '../api/endpoints';
import { useWorkspace } from '../auth/AuthProvider';

const key = (ws: string) => ['ws', ws, 'receipts'] as const;

export function useReceiptCounts() {
  const { id } = useWorkspace();
  return useQuery({ queryKey: [...key(id), 'counts'], queryFn: () => receiptsApi.counts(id), staleTime: 60_000 });
}

export function useReceipts(txId: string | null) {
  const { id } = useWorkspace();
  return useQuery({ queryKey: [...key(id), txId], queryFn: () => receiptsApi.list(id, txId!), enabled: !!txId });
}

export function useReceiptActions(txId: string) {
  const { id } = useWorkspace();
  const qc = useQueryClient();
  const refresh = () => void qc.invalidateQueries({ queryKey: key(id) });
  return {
    upload: useMutation({ mutationFn: (a: { file: Blob; name: string }) => receiptsApi.upload(id, txId, a.file, a.name), onSuccess: refresh }),
    remove: useMutation({ mutationFn: (receiptId: string) => receiptsApi.remove(id, receiptId), onSuccess: refresh }),
  };
}
