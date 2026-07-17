import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useSettingsViewModel } from '../useSettingsViewModel';
import { useSettings, useUpdateSettings } from '../useSettings';

vi.mock('../useSettings');
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

describe('useSettingsViewModel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    (useSettings as any).mockReturnValue({
      data: {
        userId: '1',
        theme: 'system',
        currency: 'USD',
        emailNotifications: true,
        pushNotifications: false,
        twoFactorEnabled: false
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    (useUpdateSettings as any).mockReturnValue({
      mutateAsync: vi.fn(),
    });
  });

  it('should initialize correctly', () => {
    const { result } = renderHook(() => useSettingsViewModel());
    
    expect(result.current.settings?.currency).toBe('USD');
    expect(result.current.stateStatus).toBe('success');
    expect(result.current.activeTab).toBe('profile');
  });
});
