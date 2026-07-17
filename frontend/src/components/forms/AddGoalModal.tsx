import { useForm } from 'react-hook-form';
import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '../ui/Modal';
import { Loader2 } from 'lucide-react';
import { useCreateGoal, useUpdateGoal } from '../../features/goals/hooks/useGoals';
import type { Goal } from '../../features/goals/api/types';
import { useSettingsStore, getCurrencySymbol } from '../../store/useSettingsStore';
import { useFinanceStore } from '../../store/useFinanceStore';
import { cn } from '../../utils/cn';

interface AddGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  goalToEdit?: Goal | null;
}

const goalSchema = z.object({
  name: z.string().min(1, "Name is required"),
  targetAmount: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, "Amount must be greater than 0"),
  dueDate: z.string().optional(),
  priority: z.string().default('0'),
  accountId: z.string().min(1, "Linked Account is required"),
  currency: z.string().min(3, "Currency is required"),
});

type GoalFormValues = z.infer<typeof goalSchema>;

export function AddGoalModal({ isOpen, onClose, workspaceId, goalToEdit }: AddGoalModalProps) {
  const createMutation = useCreateGoal();
  const updateMutation = useUpdateGoal();
  const currency = useSettingsStore(state => state.settings.currency);
  const accounts = useFinanceStore(state => state.accounts).filter(a => a.type === 'ASSET' || a.type === 'EQUITY');

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<GoalFormValues>({
    // @ts-ignore
    resolver: zodResolver(goalSchema as any) as any,
    defaultValues: {
      name: '',
      targetAmount: '',
      dueDate: '',
      priority: '0',
      accountId: '',
      currency: currency
    }
  });

  useEffect(() => {
    if (!goalToEdit && isOpen && accounts.length > 0 && !watch('accountId')) {
      setValue('accountId', accounts[0].id);
    }
  }, [isOpen, accounts, setValue, watch, goalToEdit]);

  useEffect(() => {
    if (goalToEdit && isOpen) {
      let d = '';
      if (goalToEdit.dueDate) {
        const parsed = new Date(goalToEdit.dueDate);
        if (!isNaN(parsed.getTime())) d = parsed.toISOString().split('T')[0];
      }
      reset({
        name: goalToEdit.name,
        targetAmount: (goalToEdit.targetAmount / 100).toString(),
        dueDate: d,
        priority: '0',
        accountId: goalToEdit.accountId || '',
        currency: goalToEdit.currency || currency
      });
    } else if (!isOpen) {
      reset({ name: '', targetAmount: '', dueDate: '', priority: '0', accountId: '', currency: currency });
    }
  }, [goalToEdit, isOpen, reset, currency]);

  const onSubmit = async (data: GoalFormValues) => {
    try {
      const amountInCents = Math.round(parseFloat(data.targetAmount) * 100);

      const payload = {
        name: data.name.trim(),
        targetAmount: amountInCents,
        deadline: data.dueDate || null,
        currentAmount: 0,
        accountId: data.accountId,
        currency: data.currency
      };

      if (goalToEdit) {
        await updateMutation.mutateAsync({ workspaceId, goalId: goalToEdit.id, goal: payload });
      } else {
        await createMutation.mutateAsync({ workspaceId, goal: payload });
      }
      onClose();
    } catch (err: any) {
      console.error(err);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={goalToEdit ? "Edit Savings Goal" : "Create Savings Goal"}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {(createMutation.isError || updateMutation.isError) && (
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl text-sm font-bold border border-rose-100">
            {createMutation.error?.message || updateMutation.error?.message || 'Failed to save goal'}
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-700">Goal Name</label>
          <input 
            {...register('name')}
            placeholder="e.g. New Car Fund"
            className={cn("w-full px-4 py-3 bg-gray-50 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-gray-900", errors.name ? "border-rose-500" : "border-gray-200")} 
          />
          {errors.name && <p className="text-xs text-rose-500">{errors.name.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">Target Amount</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">{getCurrencySymbol(currency)}</span>
              <input 
                {...register('targetAmount')}
                type="number" step="0.01" placeholder="0.00"
                className={cn("w-full pl-7 pr-3 py-3 bg-gray-50 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-gray-900", errors.targetAmount ? "border-rose-500" : "border-gray-200")} 
              />
            </div>
            {errors.targetAmount && <p className="text-xs text-rose-500">{errors.targetAmount.message}</p>}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">Target Date</label>
            <input 
              {...register('dueDate')}
              type="date"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-gray-900"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">Currency</label>
            <select 
              {...register('currency')}
              className={cn("w-full px-4 py-3 bg-gray-50 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-gray-900", errors.currency ? "border-rose-500" : "border-gray-200")}
            >
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="INR">INR (₹)</option>
              <option value="JPY">JPY (¥)</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">Priority</label>
            <select 
              {...register('priority')}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-gray-900"
            >
              <option value="0">Normal</option>
              <option value="1">High</option>
              <option value="2">Critical</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">Linked Account</label>
            <select 
              {...register('accountId')}
              className={cn("w-full px-4 py-3 bg-gray-50 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-gray-900", errors.accountId ? "border-rose-500" : "border-gray-200")}
            >
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>{acc.name} ({getCurrencySymbol(acc.currency || currency)})</option>
              ))}
            </select>
            {errors.accountId && <p className="text-xs text-rose-500">{errors.accountId.message}</p>}
          </div>
        </div>

        <div className="pt-4 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="px-6 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-all shadow-[0_4px_14px_rgba(37,99,235,0.3)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.4)] hover:-translate-y-0.5 disabled:opacity-50 flex items-center gap-2">
            {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="w-4 h-4 animate-spin" />}
            {createMutation.isPending || updateMutation.isPending ? 'Saving...' : goalToEdit ? 'Save Changes' : 'Create Goal'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
