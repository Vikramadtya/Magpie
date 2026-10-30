export type Role = 'OWNER' | 'EDITOR' | 'VIEWER';
export type TxType = 'INCOME' | 'EXPENSE' | 'TRANSFER';
export type AccountType = 'CHECKING' | 'SAVINGS' | 'CREDIT_CARD' | 'CASH' | 'LOAN' | 'INVESTMENT' | 'OTHER';
export type Frequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';

export interface User { id: string; email: string; name: string }
export interface Workspace { id: string; name: string; baseCurrency: string; role: Role }
export interface Session { accessToken: string; expiresIn: number; user: User }
export interface Me { user: User; workspaces: Workspace[] }

export interface Account {
  id: string; name: string; type: AccountType; currency: string;
  openingBalanceMinor: number; balanceMinor: number; archived: boolean; sortOrder: number; version: number;
}
export interface Category {
  id: string; parentId: string | null; name: string; kind: 'INCOME' | 'EXPENSE';
  icon: string | null; color: string | null; archived: boolean;
}
export interface CategoryNode {
  id: string; name: string; kind: 'INCOME' | 'EXPENSE'; icon: string | null; color: string | null; children: CategoryNode[];
}
export interface Payee { id: string; name: string; defaultCategoryId: string | null }
export interface Tag { id: string; name: string; color: string | null }

export interface Transaction {
  id: string; accountId: string; accountName: string; type: TxType; direction: 1 | -1;
  amountMinor: number; currency: string; occurredOn: string;
  categoryId: string | null; categoryName: string | null; payeeId: string | null; payeeName: string | null;
  note: string | null; tagIds: string[]; transferId: string | null; version: number; createdBy: string; createdAt: string;
}
export interface CursorPage<T> { items: T[]; nextCursor: string | null }
export interface TransactionFilters {
  from?: string; to?: string; accountId?: string; categoryId?: string; payeeId?: string; tagId?: string;
  type?: TxType; q?: string;
}
export interface TransactionInput {
  accountId: string; type: 'INCOME' | 'EXPENSE'; amountMinor: number; occurredOn: string;
  categoryId?: string | null; payeeId?: string | null; note?: string | null; tagIds?: string[];
}
export interface TransferInput {
  fromAccountId: string; toAccountId: string; amountMinor: number; destAmountMinor?: number | null;
  occurredOn: string; note?: string | null;
}
export interface Comment { id: string; userId: string; userName: string; body: string; createdAt: string }

export interface BudgetLine {
  categoryId: string; categoryName: string; color: string | null; amountMinor: number; rollover: boolean;
  rolloverMinor: number; spentMinor: number; remainingMinor: number;
}
export interface BudgetSummary { month: string; currency: string; budgetedMinor: number; spentMinor: number; lines: BudgetLine[] }

export interface Goal {
  id: string; name: string; targetMinor: number; currency: string; targetDate: string | null;
  savedMinor: number; percent: number; projectedDate: string | null;
}
export interface RecurringRule {
  id: string; name: string; accountId: string; categoryId: string | null; payeeId: string | null; type: 'INCOME' | 'EXPENSE';
  amountMinor: number; currency: string; frequency: Frequency; intervalN: number; anchorDay: number;
  nextRunOn: string; endOn: string | null; autoPost: boolean; status: 'ACTIVE' | 'PAUSED';
}
export interface RecurringInput {
  name: string; accountId: string; categoryId?: string | null; payeeId?: string | null; type: 'INCOME' | 'EXPENSE';
  amountMinor: number; frequency: Frequency; intervalN: number; startOn: string; endOn?: string | null; autoPost: boolean;
}
export interface Upcoming {
  ruleId: string; name: string; type: 'INCOME' | 'EXPENSE'; amountMinor: number; currency: string; date: string; autoPost: boolean;
}

export interface Dashboard {
  month: string; currency: string; netWorthMinor: number; assetsMinor: number; liabilitiesMinor: number;
  incomeMinor: number; expenseMinor: number; savingsRatePercent: number;
  accounts: Account[]; recent: Transaction[]; budgets: BudgetSummary; upcoming: Upcoming[];
}
export interface Report<T> { currency: string; items: T[] }
export interface CategorySpend { categoryId: string; name: string; color: string | null; totalMinor: number }
export interface MonthFlow { month: string; incomeMinor: number; expenseMinor: number }
export interface NetWorthPoint { month: string; netWorthMinor: number }
export interface PayeeSpend { payeeId: string; name: string; totalMinor: number; count: number }

export interface Member { userId: string; name: string; email: string; role: Role; joinedAt: string }
export interface Activity { id: number; userName: string | null; entity: string; entityId: string | null; action: string; summary: string | null; at: string }

export interface ParsedRow { date: string; amountMinor: number; description: string; duplicate: boolean }
export interface ImportPreview { strategy: string; rows: ParsedRow[]; skipped: number; duplicates: number }
export interface ImportResult { batchId: string; imported: number; duplicates: number }

export interface Holding {
  id: string; accountId: string | null; symbol: string; name: string; quantity: number; costBasisMinor: number;
  priceMinor: number; currency: string; priceAsOf: string | null; marketValueMinor: number; gainMinor: number;
}
export interface HoldingInput {
  accountId?: string | null; symbol: string; name: string; quantity: number; costBasisMinor: number; priceMinor: number; currency: string;
}
export interface InvestmentSummary {
  currency: string; valueMinor: number; costMinor: number; gainMinor: number; gainPercent: number;
  allocation: { symbol: string; valueMinor: number; percent: number }[];
}
