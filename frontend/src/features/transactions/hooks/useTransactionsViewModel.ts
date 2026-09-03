import { useState, useMemo } from 'react';
import type { Transaction } from '../../../types/models';
import { useDeleteTransaction, useGroupedTransactions } from '../hooks/useTransactions';
import { useAccounts } from '../../accounts/hooks/useAccounts';
import { useSettingsStore, formatCurrencyGlobal } from '../../../store/useSettingsStore';
import { toast } from 'sonner';
import { apiClient } from '../../../utils/api';

export const useTransactionsViewModel = () => {
  const WORKSPACE_ID = localStorage.getItem('workspaceId') || '';

  const { data: allAccounts = [], isLoading: loadingAccounts } = useAccounts(WORKSPACE_ID);
  const deleteMutation = useDeleteTransaction();

  const selectedAccountId = useSettingsStore(state => state.selectedAccountId);
  const setSelectedAccountId = useSettingsStore(state => state.setSelectedAccountId);

  const currency = useSettingsStore(state => state.settings.currency);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [transactionToEdit, setTransactionToEdit] = useState<Transaction | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const [selectedTransactionForComments, setSelectedTransactionForComments] = useState<Transaction | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: grouped = {}, isLoading: isGroupedLoading } = useGroupedTransactions(WORKSPACE_ID, {
    accountId: selectedAccountId,
    searchQuery
  });

  const groupDates = Object.keys(grouped);
  const groupCounts = groupDates.map(date => grouped[date].length);

  // Flattened for compatibility
  const filteredTransactions = useMemo(() => {
    return Object.values(grouped).flat();
  }, [grouped]);

  const stateStatus = useMemo(() => {
    if (isGroupedLoading) return 'loading';
    if (Object.keys(grouped).length === 0) return 'empty';
    return 'success';
  }, [isGroupedLoading, grouped]);

  const handleDelete = async () => {
    if (!transactionToDelete) return;
    try {
      await deleteMutation.mutateAsync({ workspaceId: WORKSPACE_ID, id: transactionToDelete.id });
      setTransactionToDelete(null);
      setIsDeleteModalOpen(false);
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleExport = async () => {
    try {
      const response = await fetch(`/api/export/csv`, {
        headers: { 'X-Workspace-Id': WORKSPACE_ID }
      });
      if (!response.ok) throw new Error('Export failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `keeper_transactions.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      toast.error(`Failed to export data: ${err.message}`);
    }
  };

  const formatCurrency = (val: any, sourceCurrency = currency) => formatCurrencyGlobal(Number(val), currency, sourceCurrency);

  return {
    // Data
    workspaceId: WORKSPACE_ID,
    accounts: allAccounts,
    transactions: filteredTransactions as unknown as Transaction[],
    grouped: grouped as unknown as Record<string, Transaction[]>,
    groupDates,
    groupCounts,
    stateStatus,
    currency,

    // State
    selectedAccountId,
    searchQuery,
    isModalOpen,
    isDeleteModalOpen,
    transactionToEdit,
    transactionToDelete,
    selectedTransactionForComments,
    isDeleting: deleteMutation.isPending,

    // Actions
    setSelectedAccountId,
    setSearchQuery,
    setIsModalOpen,
    setTransactionToEdit,
    setTransactionToDelete,
    setIsDeleteModalOpen,
    setSelectedTransactionForComments,
    handleDelete,
    handleExport,
    formatCurrency
  };
};
