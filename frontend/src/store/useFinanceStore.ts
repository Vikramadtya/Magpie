import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

export interface Transaction {
  id: string;
  amount: number;
  type: string;
  date: string;
  notes: string;
  name?: string;
  payee?: { id: string; name: string; type?: string };
  categoryName?: string;
  categoryId?: string;
  status: string;
  currency: string;
  entries: any[];
  comments?: { id: string; comment: string; createdAt: string }[];
}

export interface Account {
  id: string;
  name: string;
  type: string;
  currency: string;
  balance: number;
  parentId?: string;
  icon?: string;
  subType?: string;
}

interface FinanceStore {
  // UI State
  selectedAccountId: string;
  setSelectedAccountId: (id: string) => void;

  // Global Data State
  isInitializing: boolean;
  setIsInitializing: (loading: boolean) => void;

  accounts: Account[];
  setAccounts: (accounts: Account[]) => void;

  transactions: Transaction[];
  setTransactions: (transactions: Transaction[]) => void;

  dashboardData: any | null;
  setDashboardData: (data: any) => void;

  budgets: any[];
  setBudgets: (budgets: any[]) => void;

  goals: any[];
  setGoals: (goals: any[]) => void;

  subscriptions: any[];
  setSubscriptions: (subscriptions: any[]) => void;

  payees: any[];
  setPayees: (payees: any[]) => void;
}

export const useFinanceStore = create<FinanceStore>()(
  immer((set) => ({
    // UI State
    selectedAccountId: 'ALL',
    setSelectedAccountId: (id: string) => {
      set((state) => {
        state.selectedAccountId = id;
      });
    },

    // Global Data State
    isInitializing: true,
    setIsInitializing: (loading: boolean) => {
      set((state) => { state.isInitializing = loading; });
    },

    accounts: [],
    setAccounts: (accounts) => {
      set((state) => { state.accounts = accounts; });
    },

    transactions: [],
    setTransactions: (transactions) => {
      set((state) => { state.transactions = transactions; });
    },

    dashboardData: null,
    setDashboardData: (data) => {
      set((state) => { state.dashboardData = data; });
    },

    budgets: [],
    setBudgets: (budgets) => {
      set((state) => { state.budgets = budgets; });
    },

    goals: [],
    setGoals: (goals) => {
      set((state) => { state.goals = goals; });
    },

    subscriptions: [],
    setSubscriptions: (subscriptions) => {
      set((state) => { state.subscriptions = subscriptions; });
    },

    payees: [],
    setPayees: (payees) => {
      set((state) => { state.payees = payees; });
    },
  }))
);
