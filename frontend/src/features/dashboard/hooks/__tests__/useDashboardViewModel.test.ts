import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useDashboardViewModel } from '../useDashboardViewModel';
import { useFinanceStore } from '../../../../store/useFinanceStore';
import { useSettingsStore } from '../../../../store/useSettingsStore';

vi.mock('../../../../store/useFinanceStore');
vi.mock('../../../../store/useSettingsStore');

describe('useDashboardViewModel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    (useFinanceStore as any).mockImplementation((selector: any) => {
      const state = {
        dashboardData: {
          keyMetrics: { netWorth: 1000, monthlyIncome: 5000, monthlyExpense: 2000 },
          netWorth: [{ date: '2023-01-01', balance: 900 }, { date: '2023-02-01', balance: 1000 }],
          cashFlow: [{ month: 'Jan', income: 5000, expense: 2000 }],
          recentTransactions: [],
        },
        isInitializing: false,
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

  it('should initialize and compute data correctly', () => {
    const { result } = renderHook(() => useDashboardViewModel());
    
    expect(result.current.dashboard).toBeDefined();
    expect(result.current.data?.netWorth).toBe(1000);
    expect(result.current.netWorthChange).toBeGreaterThan(0);
    expect(result.current.isPositiveChange).toBe(true);
  });

  it('should handle missing dashboard data gracefully', () => {
    (useFinanceStore as any).mockImplementation((selector: any) => {
      const state = {
        dashboardData: null,
        isInitializing: true,
      };
      return selector(state);
    });

    const { result } = renderHook(() => useDashboardViewModel());
    
    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(true);
  });
});
