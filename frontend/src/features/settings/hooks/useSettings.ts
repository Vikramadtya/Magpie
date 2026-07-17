import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SettingsService } from '../api/SettingsService';
import type { UserSettings } from '../api/types';

export const useSettings = (userId: string) => {
  return useQuery({
    queryKey: ['settings', userId],
    queryFn: () => SettingsService.get(userId),
    enabled: !!userId,
  });
};

export const useUpdateSettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, settings }: { userId: string, settings: UserSettings }) => 
      SettingsService.update(userId, settings),
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ['settings', userId] });
      import('../../../store/useSettingsStore').then(({ useSettingsStore }) => {
        useSettingsStore.getState().fetchSettings(userId);
      });
    }
  });
};
