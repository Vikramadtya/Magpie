import { useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useSettingsStore, formatCurrencyGlobal } from '../../../store/useSettingsStore';
import { useFinanceStore } from '../../../store/useFinanceStore';
import type { Account } from '../../../store/useFinanceStore';
import { apiClient } from '../../../utils/api';

export const useAccountsViewModel = () => {
  const workspaceId = localStorage.getItem('workspaceId') || '';
  
  const accounts = useFinanceStore(state => state.accounts) as Account[];
  const loadingAccounts = useFinanceStore(state => state.isInitializing);
  const dashboard = useFinanceStore(state => state.dashboardData);
  const subscriptions = useFinanceStore(state => state.subscriptions);
  const currency = useSettingsStore(state => state.settings.currency);
  
  const computedMetrics = useMemo(() => {
    const m = {
      baseCurrency: currency,
      totalLiquidity: 0,
      cashBalance: 0,
      savingsBalance: 0,
      checkingBalance: 0,
      creditBalance: 0,
      upcomingCharges: 0,
      nativeLiquidity: {} as Record<string, number>,
      nativeCashBalances: {} as Record<string, number>,
      nativeSavingsBalances: {} as Record<string, number>,
      nativeCheckingBalances: {} as Record<string, number>,
      nativeCreditBalances: {} as Record<string, number>,
      nativeUpcomingCharges: {} as Record<string, number>,
    };

    accounts.forEach(acc => {
      const c = acc.currency || currency;
      const bal = Number(acc.balance) || 0;
      // In a real app, you would convert based on fx rates. Here we assume 1:1 if not matching for simplicity,
      // or we just sum them naively since they should use the activeCurrency dropdown anyway.
      // But we will sum natively into the record.
      const add = (record: Record<string, number>, val: number) => {
        record[c] = (record[c] || 0) + val;
      };

      if (acc.type === 'ASSET') {
        m.totalLiquidity += bal;
        add(m.nativeLiquidity, bal);

        if (acc.subType === 'CASH') {
          m.cashBalance += bal;
          add(m.nativeCashBalances, bal);
        } else if (acc.subType === 'SAVINGS') {
          m.savingsBalance += bal;
          add(m.nativeSavingsBalances, bal);
        } else if (acc.subType === 'CHECKING' || !acc.subType) {
          // default to checking
          m.checkingBalance += bal;
          add(m.nativeCheckingBalances, bal);
        }
      } else if (acc.type === 'LIABILITY' || acc.type === 'CREDIT_CARD') {
        m.creditBalance += bal;
        add(m.nativeCreditBalances, bal);
      }
    });

    const today = new Date();
    const in30Days = new Date(today);
    in30Days.setDate(today.getDate() + 30);

    subscriptions.forEach(sub => {
      if (sub.nextBillingDate) {
        const billingDate = new Date(sub.nextBillingDate);
        if (billingDate >= today && billingDate <= in30Days) {
          const val = (Number(sub.amount) || 0);
          m.upcomingCharges += val;
          const subCurr = sub.currency || currency;
          m.nativeUpcomingCharges[subCurr] = (m.nativeUpcomingCharges[subCurr] || 0) + val;
        }
      }
    });

    return m;
  }, [accounts, currency, subscriptions]);

  const metrics = computedMetrics;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [accountToEdit, setAccountToEdit] = useState<Account | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [displayMode, setDisplayMode] = useState<string>('COMMON');

  const formatCurrency = (val: any, sourceCurrency = currency) => formatCurrencyGlobal(Number(val), currency, sourceCurrency);

  const queryClient = useQueryClient();

  const handleDelete = async () => {
    if (!accountToDelete) return;
    setIsDeleting(true);
    try {
      await apiClient.delete(`/api/v1/accounts/${workspaceId}/${accountToDelete.id}`);
      queryClient.invalidateQueries({ queryKey: ['accounts', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', workspaceId] });
      setIsDeleteModalOpen(false);
      setAccountToDelete(null);
    } catch (e) {
      console.error(e);
      toast.error("Failed to delete account");
    } finally {
      setIsDeleting(false);
    }
  };

  const groupedAccounts = useMemo(() => {
    return accounts.reduce((acc: Record<string, Account[]>, account) => {
      const type = account.type || 'OTHER';
      if (!acc[type]) acc[type] = [];
      acc[type].push(account);
      return acc;
    }, {});
  }, [accounts]);

  const availableCurrencies = useMemo(() => {
    return Array.from(new Set(accounts.map((a: Account) => a.currency)));
  }, [accounts]);

  const showDropdown = availableCurrencies.length > 1;

  const stateStatus = useMemo(() => {
    if (loadingAccounts) return 'loading';
    if (accounts.length === 0) return 'empty';
    return 'success';
  }, [loadingAccounts, accounts.length]);

  return {
    workspaceId,
    accounts,
    groupedAccounts,
    metrics,
    availableCurrencies,
    showDropdown,
    displayMode,
    setDisplayMode,
    isModalOpen,
    setIsModalOpen,
    isEditModalOpen,
    setIsEditModalOpen,
    accountToEdit,
    setAccountToEdit,
    isDeleteModalOpen,
    setIsDeleteModalOpen,
    accountToDelete,
    setAccountToDelete,
    isDeleting,
    handleDelete,
    formatCurrency,
    currency,
    stateStatus,
    queryClient
  };
};
