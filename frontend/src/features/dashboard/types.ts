export interface DashboardData {
  keyMetrics: {
    netWorth: number;
    cashBalance: number;
    creditBalance: number;
    investmentBalance: number;
    monthlyIncome: number;
    monthlyExpenses: number;
    savingsRate: number;
    totalActiveGoals: number;
    nativeNetWorth?: number;
    nativeMonthlyIncome?: number;
    nativeMonthlyExpense?: number;
    avgDailySpend?: number;
  };
  recentTransactions: {
    id: string;
    amount: number;
    currency: string;
    payee: string | { name: string };
    date: string;
    icon?: any;
  }[];
  netWorth: { date: string; balance: number }[];
  spendingByCategory?: { name: string; amount: number; color: string }[];
  categorySpending?: { name: string; amount: number; color: string }[];
  cashFlow?: any[];
}
