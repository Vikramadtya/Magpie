import { useForm } from 'react-hook-form';
import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Label } from '../ui/Label';
import { Button } from '../ui/Button';
import { Loader2 } from 'lucide-react';
import { useFundGoal } from '../../features/goals/hooks/useGoals';
import type { Goal } from '../../features/goals/api/types';
import { useSettingsStore, getCurrencySymbol } from '../../store/useSettingsStore';
import { useAccounts } from '../../features/accounts/hooks/useAccounts';

interface FundGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  goal: Goal | null;
}

const fundSchema = z.object({
  amount: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, "Amount must be greater than 0"),
  sourceAccountId: z.string().min(1, "Source Account is required"),
});

type FundFormValues = z.infer<typeof fundSchema>;

// million-ignore
export function FundGoalModal({ isOpen, onClose, workspaceId, goal }: FundGoalModalProps) {
  const fundMutation = useFundGoal();
  const currency = useSettingsStore(state => state.settings.currency) || 'USD';
  const { data: allAccounts = [] } = useAccounts(workspaceId);
  const accounts = allAccounts.filter((a: any) => a.type === 'ASSET' || a.type === 'EQUITY');

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FundFormValues>({
    resolver: zodResolver(fundSchema),
    defaultValues: {
      amount: '',
      sourceAccountId: ''
    }
  });

  const watchSourceAccountId = watch('sourceAccountId');

  useEffect(() => {
    if (isOpen && accounts.length > 0 && !watchSourceAccountId) {
      setValue('sourceAccountId', accounts[0].id);
    }
    if (!isOpen) {
      reset({ amount: '', sourceAccountId: '' });
    }
  }, [isOpen, accounts, setValue, watchSourceAccountId, reset]);

  const onSubmit = async (data: FundFormValues) => {
    if (!goal) return;
    try {
      const amountInCents = Math.round(parseFloat(data.amount) * 100);

      await fundMutation.mutateAsync({ 
        workspaceId, 
        goalId: goal.id, 
        payload: {
          amount: amountInCents.toString(),
          sourceAccountId: data.sourceAccountId
        } 
      });
      onClose();
    } catch (err: any) {
      console.error(err);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Fund Goal: ${goal?.name || ''}`}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {fundMutation.isError && (
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl text-sm font-bold border border-rose-100">
            {fundMutation.error?.message || 'Failed to fund goal'}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="sourceAccountId">Source Account</Label>
          <Select 
            id="sourceAccountId"
            {...register('sourceAccountId')}
            error={!!errors.sourceAccountId}
          >
            {accounts.map(acc => (
              <option key={acc.id} value={acc.id}>{acc.name} ({getCurrencySymbol(acc.currency || currency)})</option>
            ))}
          </Select>
          {errors.sourceAccountId && <p className="text-xs text-rose-500">{errors.sourceAccountId.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="amount">Amount to Transfer</Label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">{getCurrencySymbol(goal?.currency || currency)}</span>
            <Input 
              id="amount"
              {...register('amount')}
              type="number" step="0.01" placeholder="0.00"
              className={errors.amount ? "pl-7 border-red-500 focus-visible:ring-red-500" : "pl-7"}
            />
          </div>
          {errors.amount && <p className="text-xs text-rose-500">{errors.amount.message}</p>}
        </div>

        <div className="pt-4 flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            variant="default"
            disabled={fundMutation.isPending}
            className="flex items-center gap-2"
          >
            {fundMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            {fundMutation.isPending ? 'Processing...' : 'Transfer Funds'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
