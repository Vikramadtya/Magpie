import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useBudgetsViewModel } from '../useBudgetsViewModel';
import { useBudgets } from '../useBudgets';
import { useSettingsStore } from '../../../../store/useSettingsStore';

vi.mock('../useBudgets');
vi.mock('../../../../store/useSettingsStore');

describe('useBudgetsViewModel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    (useBudgets as any).mockReturnValue({
      data: [
        { id: '1', categoryName: 'Food', amount: 500, spent: 300, period: 'MONTHLY' },
        { id: '2', categoryName: 'Transport', amount: 200, spent: 250, period: 'MONTHLY' }
      ],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    (useSettingsStore as any).mockImplementation((selector: any) => {
      const state = {
        settings: { currency: 'USD' }
      };
      return selector(state);
    });
  });

  it('should compute total budgeted and spent correctly', () => {
    const { result } = renderHook(() => useBudgetsViewModel());
    
    expect(result.current.totalBudgeted).toBe(700);
    expect(result.current.totalSpent).toBe(550);
    expect(result.current.stateStatus).toBe('success');
  });

  it('should return loading state', () => {
    (useBudgets as any).mockReturnValue({
      data: [],
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    });

    const { result } = renderHook(() => useBudgetsViewModel());
    expect(result.current.stateStatus).toBe('loading');
  });
});
