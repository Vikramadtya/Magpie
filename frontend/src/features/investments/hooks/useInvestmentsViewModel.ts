import { useState, useMemo } from 'react';
import { useSettingsStore, formatCurrencyGlobal } from '../../../store/useSettingsStore';
import { useInvestments } from '../hooks/useInvestments';
import type { Investment } from '../api/types';

export const useInvestmentsViewModel = () => {
  const workspaceId = localStorage.getItem('workspaceId') || '';
  const { data: investments = [], isLoading, error, refetch } = useInvestments(workspaceId);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const currency = useSettingsStore(state => state.settings.currency);
  const formatCurrency = (val: any, sourceCurrency = currency) => formatCurrencyGlobal(Number(val), currency, sourceCurrency);

  const stateStatus = useMemo(() => {
    if (isLoading) return 'loading';
    if (error) return 'error';
    if (investments.length === 0) return 'empty';
    return 'success';
  }, [isLoading, error, investments.length]);

  return {
    workspaceId,
    investments,
    isModalOpen,
    setIsModalOpen,
    stateStatus,
    error,
    refetch,
    formatCurrency
  };
};
