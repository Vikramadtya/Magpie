import { QueryClient, MutationCache, QueryCache } from '@tanstack/react-query';
import { toast } from 'sonner';
import log from '../utils/logger';

// Create a client with global error handling and robust debugging logs
export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      log.error(`[Query Error] ${query.queryKey.join(' - ')}:`, error);
    },
    onSuccess: (data, query) => {
      log.debug(`[Query Success] ${query.queryKey.join(' - ')}`);
    }
  }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      const mutationName = mutation.options.mutationKey ? mutation.options.mutationKey.join(' - ') : 'Unknown Mutation';
      log.error(`[Mutation Error] ${mutationName}:`, error);
      toast.error(`Action failed: ${error.message}`);
    },
    onSuccess: (data, _variables, _context, mutation) => {
      const mutationName = mutation.options.mutationKey ? mutation.options.mutationKey.join(' - ') : 'Unknown Mutation';
      log.debug(`[Mutation Success] ${mutationName}`);
    }
  }),
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
