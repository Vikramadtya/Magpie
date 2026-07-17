import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useSubscriptionsViewModel } from '../useSubscriptionsViewModel';
import { useSubscriptions } from '../useSubscriptions';
import { useSettingsStore } from '../../../../store/useSettingsStore';

vi.mock('../useSubscriptions');
vi.mock('../../../../store/useSettingsStore');

describe('useSubscriptionsViewModel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    (useSubscriptions as any).mockReturnValue({
      data: [
        { id: '1', name: 'Netflix', amount: 15, nextBillingDate: '2023-12-01' },
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
    const { result } = renderHook(() => useSubscriptionsViewModel());
    
    expect(result.current.subscriptions).toHaveLength(1);
    expect(result.current.stateStatus).toBe('success');
  });
});
