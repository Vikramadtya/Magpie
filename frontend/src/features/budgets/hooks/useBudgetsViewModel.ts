import { useState, useMemo } from 'react';
import { useSettingsStore, formatCurrencyGlobal } from '../../../store/useSettingsStore';
import { useBudgetSummary, useDeleteBudget } from '../hooks/useBudgets';
import type { Budget } from '../api/types';

export const useBudgetsViewModel = () => {
  const workspaceId = localStorage.getItem('workspaceId') || '';
  const { data: summary, isLoading, error, refetch } = useBudgetSummary(workspaceId);
  const deleteMutation = useDeleteBudget();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [budgetToEdit, setBudgetToEdit] = useState<Budget | null>(null);

  const handleDelete = async (budgetId: string) => {
    if (confirm('Are you sure you want to delete this budget?')) {
      await deleteMutation.mutateAsync({ workspaceId, budgetId });
    }
  };

  const handleEdit = (budget: Budget) => {
    setBudgetToEdit(budget);
    setIsModalOpen(true);
  };

  const currency = useSettingsStore(state => state.settings.currency);
  const formatCurrency = (val: any, sourceCurrency = currency) => formatCurrencyGlobal(Number(val), currency, sourceCurrency);

  const budgets = summary?.budgets || [];
  const totalBudgeted = summary?.totalBudgeted || 0;
  const totalSpent = summary?.totalSpent || 0;

  const stateStatus = useMemo(() => {
    if (isLoading) return 'loading';
    if (error) return 'error';
    if (budgets.length === 0) return 'empty';
    return 'success';
  }, [isLoading, error, budgets.length]);

  return {
    workspaceId,
    budgets,
    isModalOpen,
    setIsModalOpen,
    budgetToEdit,
    setBudgetToEdit,
    handleEdit,
    handleDelete,
    totalBudgeted,
    totalSpent,
    stateStatus,
    error,
    refetch,
    formatCurrency
  };
};
