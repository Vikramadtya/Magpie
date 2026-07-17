import { DefaultApi } from '../../../api-client';
import { apiClient } from '../../../utils/api';

const api = new DefaultApi(undefined, '', apiClient);

export const TransactionService = {
  getAll: async (workspaceId: string) => {
    const response = await api.getAllTransactions(workspaceId);
    return response.data.map((tx: any) => {
      const entry = tx.entries?.[0];
      return {
        id: tx.id,
        date: tx.date,
        notes: tx.notes || '',
        name: tx.name,
        payee: tx.payee,
        status: tx.status,
        currency: entry?.currency || 'USD',
        amount: entry ? Math.abs(entry.amount) : 0,
        type: tx.name === 'Transfer' ? 'TRANSFER' : (entry?.amount < 0 ? 'EXPENSE' : 'INCOME'),
        categoryId: entry?.accountId, // Simple mapping for now
        entries: tx.entries,
        comments: tx.comments,
      };
    });
  },
  create: async (workspaceId: string, tx: any, isTransfer?: boolean) => {
    const response = await api.createTransaction(workspaceId, tx);
    return response.data;
  },
  update: async (workspaceId: string, txId: string, tx: any) => { 
    const response = await api.updateTransaction(workspaceId, txId, tx);
    return response.data;
  },
  delete: async (workspaceId: string, txId: string) => {
    await api.deleteTransaction(workspaceId, txId);
  },
  addComment: async (workspaceId: string, txId: string, text: string) => {},
};
