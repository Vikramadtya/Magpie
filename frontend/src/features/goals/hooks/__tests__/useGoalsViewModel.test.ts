import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useGoalsViewModel } from '../useGoalsViewModel';
import { useGoals } from '../useGoals';
import { useSettingsStore } from '../../../../store/useSettingsStore';

vi.mock('../useGoals');
vi.mock('../../../../store/useSettingsStore');

describe('useGoalsViewModel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    (useGoals as any).mockReturnValue({
      data: [
        { id: '1', name: 'Car', targetAmount: 5000, savedAmount: 1000 },
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
    const { result } = renderHook(() => useGoalsViewModel());
    
    expect(result.current.goals).toHaveLength(1);
    expect(result.current.stateStatus).toBe('success');
  });
});
