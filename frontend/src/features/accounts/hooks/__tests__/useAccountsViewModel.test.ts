import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAccountsViewModel } from '../useAccountsViewModel';
import { useFinanceStore } from '../../../../store/useFinanceStore';
import { useSettingsStore } from '../../../../store/useSettingsStore';

vi.mock('../../../../store/useFinanceStore');
vi.mock('../../../../store/useSettingsStore');
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    invalidateQueries: vi.fn(),
  }),
}));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

describe('useAccountsViewModel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    (useFinanceStore as any).mockImplementation((selector: any) => {
      const state = {
        accounts: [
          { id: '1', name: 'Checking', type: 'CHECKING', balance: 1000, currency: 'USD' },
          { id: '2', name: 'Credit Card', type: 'CREDIT', balance: -500, currency: 'USD' }
        ],
        dashboardData: {
          keyMetrics: {
            totalLiquidity: 1000,
            cashBalance: 1000,
            creditBalance: -500,
          }
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

  it('should initialize correctly', () => {
    const { result } = renderHook(() => useAccountsViewModel());
    
    expect(result.current.accounts).toHaveLength(2);
    expect(result.current.stateStatus).toBe('success');
    expect(result.current.metrics.totalLiquidity).toBe(1000);
  });

  it('should group accounts by type', () => {
    const { result } = renderHook(() => useAccountsViewModel());
    
    expect(result.current.groupedAccounts['CHECKING']).toHaveLength(1);
    expect(result.current.groupedAccounts['CREDIT']).toHaveLength(1);
  });
});
