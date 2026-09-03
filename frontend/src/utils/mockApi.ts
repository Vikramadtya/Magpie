import MockAdapter from 'axios-mock-adapter';
import type { AxiosInstance } from 'axios';
import { v4 as uuidv4 } from 'uuid';

export function setupMockApi(axiosInstance: AxiosInstance) {
  const mock = new MockAdapter(axiosInstance, { delayResponse: 500 });
  
  console.log('[Mock API] Intercepting requests...');

  const workspaceId = 'default-workspace';

  // Categories Tree
  mock.onGet(new RegExp(`/api/v1/categories/tree/.*`)).reply(200, [
    {
      id: uuidv4(),
      name: 'Housing',
      type: 'EXPENSE',
      icon: '🏠',
      color: '#ef4444',
      children: [
        { id: uuidv4(), name: 'Rent', type: 'EXPENSE', icon: '📄', color: '#ef4444', children: [] },
        { id: uuidv4(), name: 'Utilities', type: 'EXPENSE', icon: '💡', color: '#ef4444', children: [] },
      ]
    },
    {
      id: uuidv4(),
      name: 'Food',
      type: 'EXPENSE',
      icon: '🍔',
      color: '#f97316',
      children: [
        { id: uuidv4(), name: 'Groceries', type: 'EXPENSE', icon: '🛒', color: '#f97316', children: [] },
        { id: uuidv4(), name: 'Dining Out', type: 'EXPENSE', icon: '🍽️', color: '#f97316', children: [] },
      ]
    },
    {
      id: uuidv4(),
      name: 'Income',
      type: 'INCOME',
      icon: '💰',
      color: '#22c55e',
      children: [
        { id: uuidv4(), name: 'Salary', type: 'INCOME', icon: '💵', color: '#22c55e', children: [] },
      ]
    }
  ]);

  // Budget Summary
  mock.onGet(new RegExp(`/api/v1/budgets/summary/.*`)).reply(200, {
    totalBudgeted: 500000, // $5000.00
    totalSpent: 235000, // $2350.00
    budgets: [
      { id: uuidv4(), categoryName: 'Housing', amount: 200000, spent: 200000, period: 'MONTHLY' },
      { id: uuidv4(), categoryName: 'Food', amount: 60000, spent: 35000, period: 'MONTHLY' },
    ]
  });

  // Grouped Transactions
  mock.onGet(new RegExp(`/api/v1/transactions/grouped/.*`)).reply(200, {
    '2026-08-02': [
      { id: uuidv4(), amount: -15000, type: 'EXPENSE', date: '2026-08-02', notes: 'Groceries', currency: 'USD', payeeId: uuidv4() }
    ],
    '2026-08-01': [
      { id: uuidv4(), amount: -200000, type: 'EXPENSE', date: '2026-08-01', notes: 'Rent', currency: 'USD', payeeId: uuidv4() }
    ]
  });

  // Flat Accounts
  mock.onGet(new RegExp(`/api/v1/accounts/.*`)).reply(200, [
    { id: uuidv4(), name: 'Checking Account', type: 'ASSET', balance: 500000, currency: 'USD' },
    { id: uuidv4(), name: 'Credit Card', type: 'LIABILITY', balance: -150000, currency: 'USD' }
  ]);

  // Transactions (Paged)
  mock.onGet(new RegExp(`/api/v1/transactions/.*`)).reply(200, {
    content: [
      { id: uuidv4(), amount: -15000, type: 'EXPENSE', date: '2026-08-02', notes: 'Groceries', currency: 'USD' }
    ],
    totalElements: 1,
    totalPages: 1,
    size: 20,
    number: 0
  });

  // Settings / User
  mock.onGet(new RegExp(`/api/v1/users/.*`)).reply(200, {
    id: 'test-user-id',
    name: 'Test User',
    email: 'test@example.com',
    preferences: {
      currency: 'USD',
      theme: 'dark'
    }
  });

  // Payees
  mock.onGet(new RegExp(`/api/v1/payees/.*`)).reply(200, [
    { id: uuidv4(), name: 'Amazon', type: 'MERCHANT', categoryId: null },
    { id: uuidv4(), name: 'Whole Foods', type: 'MERCHANT', categoryId: null },
    { id: uuidv4(), name: 'Employer', type: 'MERCHANT', categoryId: null }
  ]);

  // Subscriptions
  mock.onGet(new RegExp(`/api/v1/subscriptions/.*`)).reply(200, [
    { id: uuidv4(), name: 'Netflix', amount: 1599, billingCycle: 'MONTHLY', nextBillingDate: '2026-08-15', status: 'ACTIVE', categoryId: null, accountId: null },
    { id: uuidv4(), name: 'Spotify', amount: 999, billingCycle: 'MONTHLY', nextBillingDate: '2026-08-20', status: 'ACTIVE', categoryId: null, accountId: null }
  ]);

  // Goals
  mock.onGet(new RegExp(`/api/v1/goals/.*`)).reply(200, [
    { id: uuidv4(), name: 'Emergency Fund', targetAmount: 1000000, currentAmount: 250000, status: 'IN_PROGRESS' },
    { id: uuidv4(), name: 'Vacation', targetAmount: 300000, currentAmount: 150000, status: 'IN_PROGRESS' }
  ]);

  // Workspace
  mock.onGet(new RegExp(`/api/v1/workspaces/.*`)).reply(200, {
    id: workspaceId,
    name: 'Default Workspace',
    role: 'OWNER'
  });

  // Default catch-all
  mock.onAny().passThrough();
}
