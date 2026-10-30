import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { tripsApi } from '../api/endpoints';
import type { TripInput } from '../api/types';
import { useWorkspace } from '../auth/AuthProvider';
import { invalidateMoney, qk } from './keys';

export function useTrips() {
  const { id } = useWorkspace();
  return useQuery({ queryKey: qk.trips(id), queryFn: () => tripsApi.list(id) });
}

export function useTrip(tripId: string | undefined) {
  const { id } = useWorkspace();
  return useQuery({ queryKey: [...qk.trips(id), tripId], queryFn: () => tripsApi.detail(id, tripId!), enabled: !!tripId });
}

function useTripMutation<TArgs, TOut>(fn: (ws: string, args: TArgs) => Promise<TOut>) {
  const { id } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({ mutationFn: (args: TArgs) => fn(id, args), onSettled: () => void invalidateMoney(qc, id) });
}

export const useSaveTrip = () => useTripMutation((ws, a: { id?: string; body: TripInput }) => (a.id ? tripsApi.update(ws, a.id, a.body) : tripsApi.create(ws, a.body)));
export const useDeleteTrip = () => useTripMutation((ws, id: string) => tripsApi.remove(ws, id));
export const useAssignRange = () => useTripMutation((ws, id: string) => tripsApi.assignRange(ws, id));
export const useClearTrip = () => useTripMutation((ws, id: string) => tripsApi.clear(ws, id));

/** Attach expenses to a trip, or detach them when tripId is null. */
export function useAssignToTrip() {
  const { id: ws } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ids, tripId }: { ids: string[]; tripId: string | null }) =>
      tripId ? tripsApi.assign(ws, tripId, ids) : tripsApi.unassign(ws, ids),
    onSuccess: (r, { tripId }) => toast.success(tripId ? `Added ${r.affected} to the trip` : `Removed ${r.affected} from the trip`),
    onSettled: () => void invalidateMoney(qc, ws),
  });
}
