import { api } from './client';
import { http } from '../lib/http';
import type * as T from './types';

export const authApi = {
  login: (email: string, password: string) =>
    http.post<T.Session>('/api/v1/auth/login', { email, password }).then((r) => r.data),
  register: (body: { email: string; password: string; name: string; currency: string }) =>
    http.post<T.Session>('/api/v1/auth/register', body).then((r) => r.data),
  logout: () => http.post('/api/v1/auth/logout', {}).then(() => undefined),
  me: () => http.get<T.Me>('/api/v1/me').then((r) => r.data),
};

export const workspaceApi = {
  create: (name: string, currency: string, kind: 'PERSONAL' | 'SHARED' = 'PERSONAL') =>
    http.post<T.Workspace>('/api/v1/workspaces', { name, currency, kind }).then((r) => r.data),
  rename: (ws: string, name: string, currency: string) => api.patch<T.Workspace>(ws, '', { name, currency }),
  remove: (ws: string) => api.del(ws, ''),
  members: (ws: string) => api.get<T.Member[]>(ws, '/members'),
  setRole: (ws: string, userId: string, role: T.Role) => api.patch<void>(ws, `/members/${userId}`, { role }),
  removeMember: (ws: string, userId: string) => api.del(ws, `/members/${userId}`),
  leave: (ws: string) => api.post<void>(ws, '/leave'),
  invite: (ws: string, role: 'EDITOR' | 'VIEWER') => api.post<{ token: string; path: string }>(ws, '/invites', { role }),
  accept: (token: string) => http.post<T.Workspace>(`/api/v1/invites/${encodeURIComponent(token)}/accept`, {}).then((r) => r.data),
  activity: (ws: string) => api.get<T.Activity[]>(ws, '/activity', { limit: 50 }),
};

export const fxApi = {
  quote: (from: string, to: string, amountMinor: number) =>
    http.get<T.FxQuote>('/api/v1/fx/convert', { params: { from, to, amountMinor } }).then((r) => r.data),
};

export const accountsApi = {
  list: (ws: string) => api.get<T.Account[]>(ws, '/accounts'),
  create: (ws: string, b: { name: string; type: T.AccountType; currency: string; openingBalanceMinor: number }) =>
    api.post<T.Account>(ws, '/accounts', b),
  update: (ws: string, id: string, b: Partial<{ name: string; type: T.AccountType; archived: boolean; sortOrder: number; openingBalanceMinor: number }>) =>
    api.patch<T.Account>(ws, `/accounts/${id}`, b),
  remove: (ws: string, id: string) => api.del(ws, `/accounts/${id}`),
};

export const categoriesApi = {
  list: (ws: string) => api.get<T.Category[]>(ws, '/categories'),
  create: (ws: string, b: { name: string; kind?: 'INCOME' | 'EXPENSE'; icon?: string; color?: string; parentId?: string | null }) =>
    api.post<T.Category>(ws, '/categories', b),
  update: (ws: string, id: string, b: { name: string; icon?: string; color?: string; parentId?: string | null }) =>
    api.patch<T.Category>(ws, `/categories/${id}`, b),
  remove: (ws: string, id: string) => api.del(ws, `/categories/${id}`),
};

export const payeesApi = {
  list: (ws: string) => api.get<T.Payee[]>(ws, '/payees'),
  create: (ws: string, name: string, defaultCategoryId?: string | null) => api.post<T.Payee>(ws, '/payees', { name, defaultCategoryId }),
  update: (ws: string, id: string, name: string, defaultCategoryId?: string | null) => api.patch<T.Payee>(ws, `/payees/${id}`, { name, defaultCategoryId }),
  remove: (ws: string, id: string) => api.del(ws, `/payees/${id}`),
};

export const tagsApi = {
  list: (ws: string) => api.get<T.Tag[]>(ws, '/tags'),
  create: (ws: string, name: string, color?: string) => api.post<T.Tag>(ws, '/tags', { name, color }),
  remove: (ws: string, id: string) => api.del(ws, `/tags/${id}`),
};

export const transactionsApi = {
  page: (ws: string, filters: T.TransactionFilters, cursor?: string) =>
    api.get<T.CursorPage<T.Transaction>>(ws, '/transactions', { ...filters, cursor, limit: 50 }),
  create: (ws: string, b: T.TransactionInput, key: string) => api.post<T.Transaction>(ws, '/transactions', b, { 'Idempotency-Key': key }),
  update: (ws: string, id: string, b: Omit<T.TransactionInput, 'type'> & { type: T.TxType; expectedVersion: number }) =>
    api.put<T.Transaction>(ws, `/transactions/${id}`, b),
  remove: (ws: string, id: string) => api.del(ws, `/transactions/${id}`),
  transfer: (ws: string, b: T.TransferInput, key: string) => api.post<T.Transaction[]>(ws, '/transfers', b, { 'Idempotency-Key': key }),
  bulk: (ws: string, b: { action: 'DELETE' | 'RECATEGORIZE'; ids: string[]; categoryId?: string }) =>
    api.post<{ affected: number }>(ws, '/transactions/bulk', b),
  undo: (ws: string, id: string) =>
    api.post<{ action: 'RESTORED' | 'REVERTED'; transaction: T.Transaction }>(ws, `/transactions/${id}/undo`),
  restore: (ws: string, id: string) => api.post<T.Transaction>(ws, `/transactions/${id}/restore`),
  deleted: (ws: string) => api.get<T.Transaction[]>(ws, '/transactions/deleted'),
  setNormalised: (ws: string, id: string, baseAmountMinor: number) =>
    api.put<T.Transaction>(ws, `/transactions/${id}/normalized`, { baseAmountMinor }),
  resetNormalised: (ws: string, id: string) => api.delJson<T.Transaction>(ws, `/transactions/${id}/normalized`),
  share: (ws: string, id: string, householdId: string) => api.post<T.Transaction>(ws, `/transactions/${id}/share`, { householdId }),
  unshare: (ws: string, id: string) => api.delJson<T.Transaction>(ws, `/transactions/${id}/share`),
  comments: (ws: string, id: string) => api.get<T.Comment[]>(ws, `/transactions/${id}/comments`),
  addComment: (ws: string, id: string, body: string) => api.post<T.Comment>(ws, `/transactions/${id}/comments`, { body }),
};

export const budgetsApi = {
  summary: (ws: string, month: string) => api.get<T.BudgetSummary>(ws, '/budgets', { month }),
  set: (ws: string, categoryId: string, month: string, amountMinor: number, rollover: boolean) =>
    api.put<void>(ws, `/budgets/${categoryId}/${month}`, { amountMinor, rollover }),
  remove: (ws: string, categoryId: string, month: string) => api.del(ws, `/budgets/${categoryId}/${month}`),
  copyPrevious: (ws: string, month: string) => api.post<{ copied: number }>(ws, `/budgets/copy-previous?month=${month}`),
};

export const goalsApi = {
  list: (ws: string) => api.get<T.Goal[]>(ws, '/goals'),
  create: (ws: string, b: { name: string; targetMinor: number; currency: string; targetDate?: string | null }) => api.post<T.Goal>(ws, '/goals', b),
  update: (ws: string, id: string, b: { name: string; targetMinor: number; currency: string; targetDate?: string | null }) => api.patch<T.Goal>(ws, `/goals/${id}`, b),
  remove: (ws: string, id: string) => api.del(ws, `/goals/${id}`),
  contribute: (ws: string, id: string, amountMinor: number, occurredOn: string) =>
    api.post<T.Goal>(ws, `/goals/${id}/contributions`, { amountMinor, occurredOn }),
};

export const recurringApi = {
  list: (ws: string) => api.get<T.RecurringRule[]>(ws, '/recurring'),
  upcoming: (ws: string, days: number) => api.get<T.Upcoming[]>(ws, '/recurring/upcoming', { days }),
  create: (ws: string, b: T.RecurringInput) => api.post<T.RecurringRule>(ws, '/recurring', b),
  update: (ws: string, id: string, b: T.RecurringInput) => api.put<T.RecurringRule>(ws, `/recurring/${id}`, b),
  postNow: (ws: string, id: string) => api.post<T.RecurringRule>(ws, `/recurring/${id}/post-now`),
  pause: (ws: string, id: string) => api.post<void>(ws, `/recurring/${id}/pause`),
  resume: (ws: string, id: string) => api.post<void>(ws, `/recurring/${id}/resume`),
  remove: (ws: string, id: string) => api.del(ws, `/recurring/${id}`),
};

export const insightsApi = {
  dashboard: (ws: string, month: string) => api.get<T.Dashboard>(ws, '/dashboard', { month }),
  spending: (ws: string, from: string, to: string) => api.get<T.Report<T.CategorySpend>>(ws, '/analytics/spending-by-category', { from, to }),
  cashFlow: (ws: string, from: string, to: string) => api.get<T.Report<T.MonthFlow>>(ws, '/analytics/cash-flow', { from, to }),
  netWorth: (ws: string, months: number) => api.get<T.Report<T.NetWorthPoint>>(ws, '/analytics/net-worth', { months }),
  topPayees: (ws: string, from: string, to: string) => api.get<T.Report<T.PayeeSpend>>(ws, '/analytics/top-payees', { from, to, limit: 10 }),
};

export const importApi = {
  preview: (ws: string, file: File, accountId: string, dateFormat: string) => {
    const form = new FormData();
    form.append('file', file);
    form.append('accountId', accountId);
    form.append('dateFormat', dateFormat);
    return http
      .post<T.ImportPreview>(`/api/v1/workspaces/${ws}/imports/preview`, form, { headers: { 'Content-Type': undefined } })
      .then((r) => r.data);
  },
  commit: (ws: string, accountId: string, fileName: string, rows: T.ParsedRow[]) =>
    api.post<T.ImportResult>(ws, '/imports/commit', { accountId, fileName, rows }),
  undo: (ws: string, batchId: string) => api.del(ws, `/imports/${batchId}`),
  exportCsv: (ws: string) =>
    http.get<Blob>(`/api/v1/workspaces/${ws}/export/transactions.csv`, { responseType: 'blob' }).then((r) => r.data),
};

export const holdingsApi = {
  list: (ws: string) => api.get<T.Holding[]>(ws, '/holdings'),
  summary: (ws: string) => api.get<T.InvestmentSummary>(ws, '/investments/summary'),
  create: (ws: string, b: T.HoldingInput) => api.post<T.Holding>(ws, '/holdings', b),
  update: (ws: string, id: string, b: T.HoldingInput) => api.put<T.Holding>(ws, `/holdings/${id}`, b),
  refresh: (ws: string) => api.post<T.Holding[]>(ws, '/holdings/refresh'),
  setPrice: (ws: string, id: string, priceMinor: number) => api.put<T.Holding>(ws, `/holdings/${id}/price`, { priceMinor }),
  remove: (ws: string, id: string) => api.del(ws, `/holdings/${id}`),
};

export const loansApi = {
  overview: (ws: string) => api.get<T.LoanOverview>(ws, '/loans'),
  detail: (ws: string, id: string) => api.get<T.LoanDetail>(ws, `/loans/${id}`),
  create: (ws: string, b: { person: string; direction: 'BORROWED' | 'LENT'; accountId: string; amountMinor: number; occurredOn: string; dueOn?: string | null; note?: string | null }) =>
    api.post<T.Loan>(ws, '/loans', b),
  repay: (ws: string, id: string, b: { accountId: string; amountMinor: number; occurredOn: string; note?: string | null }) =>
    api.post<T.Loan>(ws, `/loans/${id}/payments`, b),
  remove: (ws: string, id: string) => api.del(ws, `/loans/${id}`),
};

export const forecastApi = {
  forecast: (ws: string) => api.get<T.Forecast>(ws, '/forecast'),
  insights: (ws: string) => api.get<T.Insights>(ws, '/insights'),
};

export const marketApi = {
  search: (q: string) => http.get<T.SecurityHit[]>('/api/v1/market/search', { params: { q } }).then((r) => r.data),
  quote: (symbol: string) => http.get<T.PricedQuote>('/api/v1/market/quote', { params: { symbol } }).then((r) => r.data),
};

export const householdApi = {
  summary: (ws: string, month: string) => api.get<T.HouseholdSummary>(ws, '/household/summary', { month }),
  settle: (ws: string, b: { toUserId: string; amountMinor: number; occurredOn: string; note?: string | null }) =>
    api.post<unknown>(ws, '/household/settlements', b),
  removeSettlement: (ws: string, id: string) => api.del(ws, `/household/settlements/${id}`),
};
