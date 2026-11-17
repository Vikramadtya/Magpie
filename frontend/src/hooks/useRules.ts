import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { rulesApi } from '../api/endpoints';
import type { RuleInput } from '../api/types';
import { useWorkspace } from '../auth/AuthProvider';
import { invalidateMoney } from './keys';

const key = (ws: string) => ['ws', ws, 'rules'] as const;

export function useRules() {
  const { id } = useWorkspace();
  return useQuery({ queryKey: key(id), queryFn: () => rulesApi.list(id) });
}

export function useRuleActions() {
  const { id } = useWorkspace();
  const qc = useQueryClient();
  const refresh = () => void qc.invalidateQueries({ queryKey: key(id) });
  return {
    save: useMutation({ mutationFn: (a: { id?: string; body: RuleInput }) => (a.id ? rulesApi.update(id, a.id, a.body) : rulesApi.create(id, a.body)), onSuccess: refresh }),
    remove: useMutation({ mutationFn: (ruleId: string) => rulesApi.remove(id, ruleId), onSuccess: refresh }),
    order: useMutation({ mutationFn: (ids: string[]) => rulesApi.order(id, ids), onSuccess: refresh }),
    test: useMutation({ mutationFn: (b: RuleInput) => rulesApi.test(id, b) }),
    // filing past entries changes categories everywhere, so the money views refresh too
    apply: useMutation({ mutationFn: (ruleId?: string) => rulesApi.apply(id, ruleId), onSuccess: () => void invalidateMoney(qc, id) }),
  };
}
