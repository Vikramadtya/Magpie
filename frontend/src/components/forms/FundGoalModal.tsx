import { useForm } from 'react-hook-form';
import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '../ui/Modal';
import { Loader2 } from 'lucide-react';
import { useFundGoal } from '../../features/goals/hooks/useGoals';
import type { Goal } from '../../features/goals/api/types';
import { useSettingsStore, getCurrencySymbol } from '../../store/useSettingsStore';
import { useFinanceStore } from '../../store/useFinanceStore';
import { cn } from '../../utils/cn';

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

export function FundGoalModal({ isOpen, onClose, workspaceId, goal }: FundGoalModalProps) {
  const fundMutation = useFundGoal();
  const currency = useSettingsStore(state => state.settings.currency);
  const accounts = useFinanceStore(state => state.accounts).filter(a => a.type === 'ASSET' || a.type === 'EQUITY');

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FundFormValues>({
    // @ts-ignore
    resolver: zodResolver(fundSchema as any) as any,
    defaultValues: {
      amount: '',
      sourceAccountId: ''
    }
  });

  useEffect(() => {
    if (isOpen && accounts.length > 0 && !watch('sourceAccountId')) {
      setValue('sourceAccountId', accounts[0].id);
    }
    if (!isOpen) {
      reset({ amount: '', sourceAccountId: '' });
    }
  }, [isOpen, accounts, setValue, watch, reset]);

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
          <label className="text-sm font-bold text-gray-700">Source Account</label>
          <select 
            {...register('sourceAccountId')}
            className={cn("w-full px-4 py-3 bg-gray-50 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-gray-900", errors.sourceAccountId ? "border-rose-500" : "border-gray-200")}
          >
            {accounts.map(acc => (
              <option key={acc.id} value={acc.id}>{acc.name} ({getCurrencySymbol(acc.currency || currency)})</option>
            ))}
          </select>
          {errors.sourceAccountId && <p className="text-xs text-rose-500">{errors.sourceAccountId.message}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-700">Amount to Transfer</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">{getCurrencySymbol(goal?.currency || currency)}</span>
            <input 
              {...register('amount')}
              type="number" step="0.01" placeholder="0.00"
              className={cn("w-full pl-7 pr-3 py-3 bg-gray-50 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-gray-900", errors.amount ? "border-rose-500" : "border-gray-200")} 
            />
          </div>
          {errors.amount && <p className="text-xs text-rose-500">{errors.amount.message}</p>}
        </div>

        <div className="pt-4 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={fundMutation.isPending} className="px-6 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-all shadow-[0_4px_14px_rgba(37,99,235,0.3)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.4)] hover:-translate-y-0.5 disabled:opacity-50 flex items-center gap-2">
            {fundMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            {fundMutation.isPending ? 'Processing...' : 'Transfer Funds'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
