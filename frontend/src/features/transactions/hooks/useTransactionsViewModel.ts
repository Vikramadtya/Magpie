import { useState, useMemo } from 'react';
import { useFinanceStore } from '../../../store/useFinanceStore';
import type { Transaction } from '../../../store/useFinanceStore';
import { useDeleteTransaction } from '../hooks/useTransactions';
import { useSettingsStore, formatCurrencyGlobal } from '../../../store/useSettingsStore';
import { toast } from 'sonner';
import { apiClient } from '../../../utils/api';

export const useTransactionsViewModel = () => {
  const WORKSPACE_ID = localStorage.getItem('workspaceId') || '';

  const allTransactions = useFinanceStore(state => state.transactions);
  const allAccounts = useFinanceStore(state => state.accounts);
  const loading = useFinanceStore(state => state.isInitializing);
  const deleteMutation = useDeleteTransaction();

  const selectedAccountId = useFinanceStore(state => state.selectedAccountId);
  const setSelectedAccountId = useFinanceStore(state => state.setSelectedAccountId);

  const currency = useSettingsStore(state => state.settings.currency);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [transactionToEdit, setTransactionToEdit] = useState<Transaction | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const [selectedTransactionForComments, setSelectedTransactionForComments] = useState<Transaction | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTransactions = useMemo(() => {
    let filtered = selectedAccountId === 'ALL' 
      ? allTransactions 
      : allTransactions.filter((tx: any) => tx.accountId === selectedAccountId);

    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      filtered = filtered.filter(tx => 
        (tx.name && tx.name.toLowerCase().includes(lowerQuery)) ||
        (tx.payee?.name && tx.payee.name.toLowerCase().includes(lowerQuery)) ||
        (tx.categoryName && tx.categoryName.toLowerCase().includes(lowerQuery)) ||
        (tx.amount.toString().includes(lowerQuery))
      );
    }
    return filtered;
  }, [allTransactions, selectedAccountId, searchQuery]);

  const { grouped, groupDates, groupCounts } = useMemo(() => {
    const groupedData = filteredTransactions.reduce((groups: any, tx) => {
      const date = new Date(tx.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      if (!groups[date]) groups[date] = [];
      groups[date].push(tx);
      return groups;
    }, {});

    const dates = Object.keys(groupedData);
    const counts = dates.map(date => groupedData[date].length);

    return { grouped: groupedData, groupDates: dates, groupCounts: counts };
  }, [filteredTransactions]);

  const stateStatus = useMemo(() => {
    if (loading && allTransactions.length === 0) return 'loading';
    if (Object.keys(grouped).length === 0) return 'empty';
    return 'success';
  }, [loading, allTransactions.length, grouped]);

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
    transactions: filteredTransactions,
    grouped,
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
