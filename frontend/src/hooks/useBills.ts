import { useQuery } from '@tanstack/react-query';
import { billsApi } from '../api/endpoints';
import { useWorkspace } from '../auth/AuthProvider';
import { qk } from './keys';

export function useBillsCalendar(month: string) {
  const { id } = useWorkspace();
  return useQuery({ queryKey: [...qk.recurring(id), 'calendar', month], queryFn: () => billsApi.calendar(id, month) });
}

export function useSpottedCharges() {
  const { id } = useWorkspace();
  return useQuery({ queryKey: [...qk.recurring(id), 'spotted'], queryFn: () => billsApi.suggestions(id), staleTime: 5 * 60_000 });
}
