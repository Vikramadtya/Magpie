import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useTransactionsViewModel } from '../useTransactionsViewModel';
import { useFinanceStore } from '../../../../store/useFinanceStore';
import { useSettingsStore } from '../../../../store/useSettingsStore';

// Mock dependencies
vi.mock('../../../../store/useFinanceStore');
vi.mock('../../../../store/useSettingsStore');
vi.mock('../useTransactions', () => ({
  useDeleteTransaction: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

describe('useTransactionsViewModel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mocks
    (useFinanceStore as any).mockImplementation((selector: any) => {
      const state = {
        transactions: [],
        accounts: [],
        isInitializing: false,
        selectedAccountId: 'ALL',
        setSelectedAccountId: vi.fn(),
      };
      return selector(state);
    });

    (useSettingsStore as any).mockImplementation((selector: any) => {
      const state = {
        settings: { currency: 'USD' }
      };
      return selector(state);
    });
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useTransactionsViewModel());
    
    expect(result.current.transactions).toEqual([]);
    expect(result.current.stateStatus).toBe('empty');
    expect(result.current.searchQuery).toBe('');
    expect(result.current.selectedAccountId).toBe('ALL');
  });

  it('should filter transactions by search query', () => {
    const mockTransactions = [
      { id: '1', name: 'Grocery Store', amount: 50, date: '2023-01-01', type: 'EXPENSE' },
      { id: '2', payee: { name: 'Salary' }, amount: 2000, date: '2023-01-02', type: 'INCOME' },
    ];
    
    (useFinanceStore as any).mockImplementation((selector: any) => {
      const state = {
        transactions: mockTransactions,
        accounts: [],
        isInitializing: false,
        selectedAccountId: 'ALL',
      };
      return selector(state);
    });

    const { result } = renderHook(() => useTransactionsViewModel());
    
    act(() => {
      result.current.setSearchQuery('grocery');
    });

    expect(result.current.transactions).toHaveLength(1);
    expect(result.current.transactions[0].id).toBe('1');
  });

  it('should group transactions by date', () => {
    const mockTransactions = [
      { id: '1', date: '2023-01-01T10:00:00Z' },
      { id: '2', date: '2023-01-01T15:00:00Z' },
      { id: '3', date: '2023-01-02T10:00:00Z' },
    ];
    
    (useFinanceStore as any).mockImplementation((selector: any) => {
      const state = {
        transactions: mockTransactions,
        accounts: [],
        isInitializing: false,
        selectedAccountId: 'ALL',
      };
      return selector(state);
    });

    const { result } = renderHook(() => useTransactionsViewModel());
    
    expect(result.current.groupDates).toHaveLength(2);
    expect(result.current.groupCounts).toEqual([2, 1]);
  });
});
