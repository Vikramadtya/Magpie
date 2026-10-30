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
  /** The amount as entered, when it was in a currency other than the account's. */
  origAmountMinor: number | null; origCurrency: string | null;
  loanId: string | null; loanPerson: string | null;
  /** Amount in the workspace base currency at that day's rate (editable); null when no rate was available. */
  baseAmountMinor: number | null; baseCurrency: string | null; baseFxRate: number | null; baseOverridden: boolean;
  tripId: string | null; tripName: string | null;
}
export interface CursorPage<T> { items: T[]; nextCursor: string | null }
export interface TransactionFilters {
  from?: string; to?: string; accountId?: string; categoryId?: string; payeeId?: string; tagId?: string;
  type?: TxType; q?: string; tripId?: string;
}
export interface TransactionInput {
  accountId: string; type: 'INCOME' | 'EXPENSE'; amountMinor: number; occurredOn: string;
  categoryId?: string | null; payeeId?: string | null; note?: string | null; tagIds?: string[];
  /** Currency of amountMinor; omitted = the account's currency. */
  currency?: string;
  /** Exact amount in the account's currency when `currency` differs (overrides the rate). */
  accountAmountMinor?: number | null;
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
  /** Currencies with no exchange rate yet; their amounts were not converted. */
  missingCurrencies: string[];
}
export interface Report<T> { currency: string; items: T[]; missingCurrencies: string[] }
export interface FxQuote { available: boolean; rate: number | null; convertedMinor: number | null }
export interface CategorySpend { categoryId: string; name: string; color: string | null; totalMinor: number }
export interface MonthFlow { month: string; incomeMinor: number; expenseMinor: number }
export interface NetWorthPoint { month: string; netWorthMinor: number }
export interface PayeeSpend { payeeId: string; name: string; totalMinor: number; count: number }

export interface Activity { id: number; userName: string | null; entity: string; entityId: string | null; action: string; summary: string | null; at: string }

export interface ParsedRow { date: string; amountMinor: number; description: string; duplicate: boolean }
export interface ImportPreview { strategy: string; rows: ParsedRow[]; skipped: number; duplicates: number }
export interface ImportResult { batchId: string; imported: number; duplicates: number }

export interface Holding {
  id: string; accountId: string | null; symbol: string; name: string; quantity: number; costBasisMinor: number;
  priceMinor: number; currency: string; priceAsOf: string | null; marketValueMinor: number; gainMinor: number;
  providerSymbol: string | null; exchange: string | null; assetType: string | null;
  priceSource: 'MANUAL' | 'LIVE'; priceUpdatedAt: string | null;
}
export interface HoldingInput {
  accountId?: string | null; symbol: string; name: string; quantity: number; costBasisMinor: number; priceMinor: number; currency: string;
  providerSymbol?: string | null; exchange?: string | null; assetType?: string | null;
}
export interface InvestmentSummary {
  currency: string; valueMinor: number; costMinor: number; gainMinor: number; gainPercent: number;
  allocation: { symbol: string; valueMinor: number; percent: number }[];
}

// ---------- loans ----------
export interface Loan {
  id: string; person: string; direction: 'BORROWED' | 'LENT'; principalMinor: number; currency: string;
  occurredOn: string; dueOn: string | null; note: string | null; repaidMinor: number; outstandingMinor: number; status: 'OPEN' | 'SETTLED';
}
export interface LoanPerson { person: string; netMinor: number; openLoans: number }
export interface LoanOverview { currency: string; owedToMeMinor: number; iOweMinor: number; people: LoanPerson[]; loans: Loan[] }
export interface LoanDetail { loan: Loan; transactions: Transaction[] }

// ---------- forecast and insights ----------
export interface ForecastLine { fixedMinor: number; variableMinor: number; totalMinor: number; lowMinor: number; highMinor: number }
export interface CategoryForecast {
  categoryId: string | null; name: string; color: string | null; forecastMinor: number; lowMinor: number; highMinor: number;
  method: string; confidence: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH'; months: number; lastMonthMinor: number; averageMinor: number;
}
export interface FixedItem { ruleId: string; name: string; amountMinor: number; date: string }
export interface Forecast {
  month: string; currency: string; expense: ForecastLine; income: ForecastLine; netMinor: number;
  categories: CategoryForecast[]; fixedExpenses: FixedItem[]; fixedIncome: FixedItem[]; monthsOfHistory: number;
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  thisMonth: { spentMinor: number; projectedMinor: number; expectedMinor: number; daysElapsed: number; daysInMonth: number };
  missingCurrencies: string[];
}
export interface Insights {
  currency: string; highlights: string[];
  movers: { categoryId: string | null; name: string; thisMonthMinor: number; usualMinor: number; deltaMinor: number; percent: number }[];
  weekdays: { day: string; averageMinor: number; sharePercent: number }[];
  weeksOfMonth: { label: string; averageMinor: number }[];
  anomalies: { id: string; date: string; name: string; category: string; amountMinor: number; typicalMinor: number; timesTypical: number }[];
  subscriptions: { payee: string; amountMinor: number; frequency: string; lastDate: string; nextExpected: string; perYearMinor: number; charges: number }[];
  savings: { month: string; ratePercent: number; incomeMinor: number; expenseMinor: number }[];
  growth: { categoryId: string | null; name: string; percentPerMonth: number; latestMinor: number }[];
  largest: { id: string; date: string; name: string; category: string; amountMinor: number }[];
}

// ---------- market data ----------
export interface SecurityHit { symbol: string; name: string; exchange: string | null; type: string | null; currency: string | null }
export interface PricedQuote { available: boolean; symbol: string; name: string | null; currency: string | null; exchange: string | null; priceMinor: number | null; source: string | null }

// ---------- trips ----------
export interface Trip {
  id: string; name: string; startDate: string; endDate: string; budgetMinor: number | null; notes: string | null;
  spentMinor: number; expenseCount: number; totalDays: number; daysSoFar: number;
  status: 'UPCOMING' | 'ONGOING' | 'PAST'; perDayMinor: number;
}
export interface TripDetail {
  trip: Trip; currency: string; normalDailyMinor: number; projectedMinor: number; budgetRemainingMinor: number | null;
  unassignedInRange: number;
  categories: { categoryId: string | null; name: string; color: string | null; totalMinor: number; percent: number }[];
  days: { date: string; totalMinor: number }[];
  currencies: { currency: string; localMinor: number; baseMinor: number; count: number }[];
  largest: { id: string; date: string; name: string; category: string; baseMinor: number; localMinor: number; localCurrency: string }[];
  missingCurrencies: string[];
}
export interface TripInput { name: string; startDate: string; endDate: string; budgetMinor?: number | null; notes?: string | null }
