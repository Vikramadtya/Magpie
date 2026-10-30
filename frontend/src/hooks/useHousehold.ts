import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { householdsApi } from '../api/endpoints';
import { useAuth } from '../auth/AuthProvider';

/** Households are tied to the person, not to a ledger, so the keys start with the user. */
const key = (userId: string | undefined, ...rest: unknown[]) => ['household', userId, ...rest] as const;

export function useHouseholds() {
  const { user } = useAuth();
  return useQuery({ queryKey: key(user?.id), queryFn: householdsApi.list, enabled: !!user, refetchInterval: 120_000 });
}

export function useHouseholdSummary(id: string, month: string) {
  const { user } = useAuth();
  return useQuery({ queryKey: key(user?.id, id, 'summary', month), queryFn: () => householdsApi.summary(id, month) });
}

export function useHouseholdTrips(id: string) {
  const { user } = useAuth();
  return useQuery({ queryKey: key(user?.id, id, 'trips'), queryFn: () => householdsApi.trips(id) });
}

export function useHouseholdWealth(id: string) {
  const { user } = useAuth();
  return useQuery({ queryKey: key(user?.id, id, 'wealth'), queryFn: () => householdsApi.wealth(id) });
}

/** Any household change can alter every figure on the page, so everything is refreshed. */
export function useHouseholdAction<TArgs>(fn: (args: TArgs) => Promise<unknown>) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSettled: () => void qc.invalidateQueries({ queryKey: ['household', user?.id] }),
  });
}

export const householdActions = {
  create: (name: string) => householdsApi.create(name),
  invite: (a: { id: string; email: string }) => householdsApi.invite(a.id, a.email),
  accept: (id: string) => householdsApi.accept(id),
  leave: (id: string) => householdsApi.leave(id),
  remove: (a: { id: string; memberId: string }) => householdsApi.remove(a.id, a.memberId),
  sharing: (a: { id: string; spending: boolean; netWorth: boolean; investments: boolean }) =>
    householdsApi.sharing(a.id, { spending: a.spending, netWorth: a.netWorth, investments: a.investments }),
  setBudget: (a: { id: string; categoryName: string; amountMinor: number }) => householdsApi.setBudget(a.id, a.categoryName, a.amountMinor),
  removeBudget: (a: { id: string; categoryName: string }) => householdsApi.removeBudget(a.id, a.categoryName),
};
