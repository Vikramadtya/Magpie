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
import { useCreateGoal, useUpdateGoal } from '../../features/goals/hooks/useGoals';
import type { Goal } from '../../features/goals/api/types';
import { useSettingsStore, getCurrencySymbol } from '../../store/useSettingsStore';
import { useAccounts } from '../../features/accounts/hooks/useAccounts';

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
  priority: z.string(),
  accountId: z.string().min(1, "Linked Account is required"),
  currency: z.string().min(3, "Currency is required"),
});

type GoalFormValues = z.infer<typeof goalSchema>;

// million-ignore
export function AddGoalModal({ isOpen, onClose, workspaceId, goalToEdit }: AddGoalModalProps) {
  const createMutation = useCreateGoal();
  const updateMutation = useUpdateGoal();
  const currency = useSettingsStore(state => state.settings.currency) || 'USD';
  const { data: allAccounts = [] } = useAccounts(workspaceId);
  const accounts = allAccounts.filter((a: any) => a.type === 'ASSET' || a.type === 'EQUITY');

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<GoalFormValues>({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      name: '',
      targetAmount: '',
      dueDate: '',
      priority: '0',
      accountId: '',
      currency: currency
    }
  });

  const watchAccountId = watch('accountId');

  useEffect(() => {
    if (!goalToEdit && isOpen && accounts.length > 0 && !watchAccountId) {
      setValue('accountId', accounts[0].id);
    }
  }, [isOpen, accounts, setValue, watchAccountId, goalToEdit]);

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
          <Label htmlFor="name">Goal Name</Label>
          <Input 
            id="name"
            {...register('name')}
            placeholder="e.g. New Car Fund"
            className={errors.name ? "border-red-500 focus-visible:ring-red-500" : ""}
          />
          {errors.name && <p className="text-xs text-rose-500">{errors.name.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="targetAmount">Target Amount</Label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">{getCurrencySymbol(currency)}</span>
              <Input 
                id="targetAmount"
                {...register('targetAmount')}
                type="number" step="0.01" placeholder="0.00"
                className={errors.targetAmount ? "pl-7 border-red-500 focus-visible:ring-red-500" : "pl-7"}
              />
            </div>
            {errors.targetAmount && <p className="text-xs text-rose-500">{errors.targetAmount.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="dueDate">Target Date</Label>
            <Input 
              id="dueDate"
              {...register('dueDate')}
              type="date"
              className={errors.dueDate ? "border-red-500 focus-visible:ring-red-500" : ""}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="currency">Currency</Label>
            <Select 
              id="currency"
              {...register('currency')}
              error={!!errors.currency}
            >
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="INR">INR (₹)</option>
              <option value="JPY">JPY (¥)</option>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <Select 
              id="priority"
              {...register('priority')}
              error={!!errors.priority}
            >
              <option value="0">Normal</option>
              <option value="1">High</option>
              <option value="2">Critical</option>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="accountId">Linked Account</Label>
            <Select 
              id="accountId"
              {...register('accountId')}
              error={!!errors.accountId}
            >
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>{acc.name} ({getCurrencySymbol(acc.currency || currency)})</option>
              ))}
            </Select>
            {errors.accountId && <p className="text-xs text-rose-500">{errors.accountId.message}</p>}
          </div>
        </div>

        <div className="pt-4 flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            variant="default"
            disabled={createMutation.isPending || updateMutation.isPending}
            className="flex items-center gap-2"
          >
            {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="w-4 h-4 animate-spin" />}
            {createMutation.isPending || updateMutation.isPending ? 'Saving...' : goalToEdit ? 'Save Changes' : 'Create Goal'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
