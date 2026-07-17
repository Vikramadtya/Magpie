import { useState, useMemo } from 'react';
import { useFinanceStore } from '../../../store/useFinanceStore';
import { useSettingsStore, formatCurrencyGlobal } from '../../../store/useSettingsStore';

export const useDashboardViewModel = () => {
  const WORKSPACE_ID = localStorage.getItem('workspaceId') || '';
  
  const dashboard = useFinanceStore(state => state.dashboardData);
  const loading = useFinanceStore(state => state.isInitializing);
  const currency = useSettingsStore(state => state.settings.currency);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [displayMode] = useState<string>('COMMON');

  const formatCurrency = (val: number, sourceCurrency = currency) => formatCurrencyGlobal(val, currency, sourceCurrency);
  const formatCompact = (val: any) => new Intl.NumberFormat(undefined, { notation: 'compact', compactDisplay: 'short', style: 'currency', currency: currency || 'USD' }).format(Number(val) / 100);

  const data = useMemo(() => {
    if (!dashboard) return null;
    return {
      netWorth: dashboard.keyMetrics?.netWorth || dashboard.netWorth?.[dashboard.netWorth.length - 1]?.balance || 0,
      netWorthHistory: dashboard.netWorth || [],
      monthlyIncome: dashboard.cashFlow?.[dashboard.cashFlow.length - 1]?.income || 0,
      monthlyExpense: dashboard.cashFlow?.[dashboard.cashFlow.length - 1]?.expense || 0,
      cashFlow: dashboard.cashFlow?.map((cf: any) => ({ month: cf.month, amount: cf.income - cf.expense })) || [],
      categorySpending: dashboard.categorySpending?.map((cs: any) => ({ name: cs.categoryName, value: cs.amount, color: cs.color })) || [],
      recentTransactions: dashboard.recentTransactions || [],
      nativeNetWorth: dashboard.keyMetrics?.nativeNetWorth || {},
      nativeMonthlyIncome: dashboard.keyMetrics?.nativeMonthlyIncome || {},
      nativeMonthlyExpense: dashboard.keyMetrics?.nativeMonthlyExpense || {}
    };
  }, [dashboard]);

  const availableCurrencies = useMemo(() => {
    if (!data) return [];
    return Array.from(new Set([
      ...Object.keys(data.nativeNetWorth || {}),
      ...Object.keys(data.nativeMonthlyIncome || {}),
      ...Object.keys(data.nativeMonthlyExpense || {})
    ]));
  }, [data]);

  const showDropdown = availableCurrencies.length > 1;

  const netWorthChange = useMemo(() => {
    if (data && data.netWorthHistory.length >= 2) {
      const current = data.netWorthHistory[data.netWorthHistory.length - 1].balance;
      const previous = data.netWorthHistory[data.netWorthHistory.length - 2].balance;
      if (previous !== 0) {
        return ((current - previous) / Math.abs(previous)) * 100;
      }
    }
    return 0;
  }, [data]);

  const isPositiveChange = netWorthChange >= 0;
  const changeFormatted = `${isPositiveChange ? '+' : ''}${netWorthChange.toFixed(1)}%`;

  return {
    workspaceId: WORKSPACE_ID,
    dashboard,
    data,
    loading,
    currency,
    isModalOpen,
    displayMode,
    showDropdown,
    availableCurrencies,
    netWorthChange,
    isPositiveChange,
    changeFormatted,
    setIsModalOpen,
    formatCurrency,
    formatCompact
  };
};
