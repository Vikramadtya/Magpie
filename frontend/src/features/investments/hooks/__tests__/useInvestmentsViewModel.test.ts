import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useInvestmentsViewModel } from '../useInvestmentsViewModel';
import { useInvestments } from '../useInvestments';
import { useSettingsStore } from '../../../../store/useSettingsStore';

vi.mock('../useInvestments');
vi.mock('../../../../store/useSettingsStore');

describe('useInvestmentsViewModel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    (useInvestments as any).mockReturnValue({
      data: [
        { id: '1', name: 'Apple', ticker: 'AAPL', assetClass: 'STOCK', currentPrice: 15000, quantity: 10 },
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

  it('should initialize correctly', () => {
    const { result } = renderHook(() => useInvestmentsViewModel());
    
    expect(result.current.investments).toHaveLength(1);
    expect(result.current.stateStatus).toBe('success');
  });
});
