import { useState, useMemo } from 'react';
import { useSettingsStore, formatCurrencyGlobal } from '../../../store/useSettingsStore';
import { useBudgets, useDeleteBudget } from '../hooks/useBudgets';
import type { Budget } from '../api/types';

export const useBudgetsViewModel = () => {
  const workspaceId = localStorage.getItem('workspaceId') || '';
  const { data: budgets = [], isLoading, error, refetch } = useBudgets(workspaceId);
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

  const totalBudgeted = useMemo(() => budgets.reduce((acc, b) => acc + b.amount, 0), [budgets]);
  const totalSpent = useMemo(() => budgets.reduce((acc, b) => acc + b.spent, 0), [budgets]);

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
