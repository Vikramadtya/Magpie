import { useState, useMemo } from 'react';
import { useSettingsStore, formatCurrencyGlobal } from '../../../store/useSettingsStore';
import { useGoals, useDeleteGoal } from '../hooks/useGoals';
import type { Goal } from '../api/types';

export const useGoalsViewModel = () => {
  const workspaceId = localStorage.getItem('workspaceId') || '';
  const { data: goals = [], isLoading, error, refetch } = useGoals(workspaceId);
  const deleteMutation = useDeleteGoal();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [goalToEdit, setGoalToEdit] = useState<Goal | null>(null);

  const [isFundModalOpen, setIsFundModalOpen] = useState(false);
  const [goalToFund, setGoalToFund] = useState<Goal | null>(null);

  const handleFund = (goal: Goal) => {
    setGoalToFund(goal);
    setIsFundModalOpen(true);
  };

  const handleDelete = async (goalId: string) => {
    if (confirm('Are you sure you want to delete this goal?')) {
      await deleteMutation.mutateAsync({ workspaceId, goalId });
    }
  };

  const handleEdit = (goal: Goal) => {
    setGoalToEdit(goal);
    setIsModalOpen(true);
  };

  const currency = useSettingsStore(state => state.settings.currency);
  const formatCurrency = (val: any, sourceCurrency = currency) => formatCurrencyGlobal(Number(val), currency, sourceCurrency);

  const stateStatus = useMemo(() => {
    if (isLoading) return 'loading';
    if (error) return 'error';
    if (goals.length === 0) return 'empty';
    return 'success';
  }, [isLoading, error, goals.length]);

  return {
    workspaceId,
    goals,
    isModalOpen,
    setIsModalOpen,
    goalToEdit,
    setGoalToEdit,
    isFundModalOpen,
    setIsFundModalOpen,
    goalToFund,
    setGoalToFund,
    handleEdit,
    handleDelete,
    handleFund,
    stateStatus,
    error,
    refetch,
    formatCurrency
  };
};
