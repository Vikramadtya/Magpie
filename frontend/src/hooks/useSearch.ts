import { useQuery } from '@tanstack/react-query';
import { useDebounce } from 'use-debounce';
import { transactionsApi } from '../api/endpoints';
import { useWorkspace } from '../auth/AuthProvider';

/** One search across transactions, accounts, payees, categories, tags, trips, loans, goals and holdings. */
export function useGlobalSearch(text: string) {
  const { id } = useWorkspace();
  const [q] = useDebounce(text.trim(), 250);
  return useQuery({
    queryKey: ['ws', id, 'search', q],
    queryFn: () => transactionsApi.search(id, q),
    enabled: q.length >= 2,
    staleTime: 30_000,
    retry: 0,
  });
}
