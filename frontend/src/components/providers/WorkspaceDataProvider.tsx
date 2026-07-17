import { useEffect } from 'react';
import { useAccounts } from '../../features/accounts/hooks/useAccounts';
import { useTransactions } from '../../features/transactions/hooks/useTransactions';
import { useDashboard } from '../../features/dashboard/hooks/useDashboard';
import { useBudgets } from '../../features/budgets/hooks/useBudgets';
import { useGoals } from '../../features/goals/hooks/useGoals';
import { useSubscriptions } from '../../features/subscriptions/hooks/useSubscriptions';
import { usePayees } from '../../features/payees/hooks/usePayees';
import { useFinanceStore } from '../../store/useFinanceStore';
import { Loader2 } from 'lucide-react';

interface WorkspaceDataProviderProps {
  workspaceId: string;
  children: React.ReactNode;
}

export function WorkspaceDataProvider({ workspaceId, children }: WorkspaceDataProviderProps) {
  // Query data using React Query hooks
  const { data: accounts, isLoading: loadingAccounts } = useAccounts(workspaceId);
  const { data: transactions, isLoading: loadingTx } = useTransactions(workspaceId);
  const { data: dashboard, isLoading: loadingDash } = useDashboard(workspaceId, 12);
  const { data: budgets, isLoading: loadingBudgets } = useBudgets(workspaceId);
  const { data: goals, isLoading: loadingGoals } = useGoals(workspaceId);
  const { data: subscriptions, isLoading: loadingSubs } = useSubscriptions(workspaceId);
  const { data: payees, isLoading: loadingPayees } = usePayees(workspaceId);

  const {
    setAccounts,
    setTransactions,
    setDashboardData,
    setBudgets,
    setGoals,
    setSubscriptions,
    setPayees,
    setIsInitializing
  } = useFinanceStore();

  const isLoading = loadingAccounts || loadingTx || loadingDash || loadingBudgets || loadingGoals || loadingSubs || loadingPayees;

  // Sync React Query data into Zustand
  useEffect(() => {
    if (accounts) setAccounts(accounts);
  }, [accounts, setAccounts]);

  useEffect(() => {
    if (transactions) setTransactions(transactions);
  }, [transactions, setTransactions]);

  useEffect(() => {
    if (dashboard) setDashboardData(dashboard);
  }, [dashboard, setDashboardData]);

  useEffect(() => {
    if (budgets) setBudgets(budgets);
  }, [budgets, setBudgets]);

  useEffect(() => {
    if (goals) setGoals(goals);
  }, [goals, setGoals]);

  useEffect(() => {
    if (subscriptions) setSubscriptions(subscriptions);
  }, [subscriptions, setSubscriptions]);

  useEffect(() => {
    if (payees) setPayees(payees);
  }, [payees, setPayees]);

  // Sync loading state
  useEffect(() => {
    setIsInitializing(isLoading);
  }, [isLoading, setIsInitializing]);

  if (isLoading && !accounts && !transactions) {
    return (
      <div className="w-full h-screen flex flex-col items-center justify-center bg-gray-50/50">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-4" />
        <h2 className="text-gray-900 font-bold text-lg">Loading your workspace...</h2>
        <p className="text-gray-500 text-sm mt-1">Fetching accounts, transactions, and budgets</p>
      </div>
    );
  }

  return <>{children}</>;
}
