import { useForm } from 'react-hook-form';
import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '../ui/Modal';
import { Loader2 } from 'lucide-react';
import { useCreateBudget, useUpdateBudget } from '../../features/budgets/hooks/useBudgets';
import type { Budget } from '../../features/budgets/api/types';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useSettingsStore, getCurrencySymbol } from '../../store/useSettingsStore';
import { cn } from '../../utils/cn';

interface AddBudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  budgetToEdit?: Budget | null;
}

const budgetSchema = z.object({
  categoryId: z.string().min(1, "Category is required"),
  amount: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, "Amount must be greater than 0"),
  currency: z.string().min(1, "Currency is required"),
  period: z.string().default('MONTHLY'),
});

type BudgetFormValues = z.infer<typeof budgetSchema>;

export function AddBudgetModal({ isOpen, onClose, workspaceId, budgetToEdit }: AddBudgetModalProps) {
  const createMutation = useCreateBudget();
  const updateMutation = useUpdateBudget();
  const accounts = useFinanceStore(state => state.accounts);
  const currency = useSettingsStore(state => state.settings.currency);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<BudgetFormValues>({
    // @ts-ignore
    resolver: zodResolver(budgetSchema as any) as any,
    defaultValues: {
      categoryId: '',
      amount: '',
      currency: currency || 'USD',
      period: 'MONTHLY'
    }
  });

  useEffect(() => {
    if (budgetToEdit && isOpen) {
      reset({
        categoryId: (budgetToEdit as any).categoryId || '',
        amount: (budgetToEdit.amount / 100).toString(),
        currency: (budgetToEdit as any).currency || currency || 'USD',
        period: budgetToEdit.period || 'MONTHLY',
      });
    } else if (!isOpen) {
      reset({ categoryId: '', amount: '', currency: currency || 'USD', period: 'MONTHLY' });
    }
  }, [budgetToEdit, isOpen, reset, currency]);

  const onSubmit = async (data: BudgetFormValues) => {
    try {
      const amountInCents = Math.round(parseFloat(data.amount) * 100);

      const payload = {
        categoryId: data.categoryId,
        name: accounts.find(a => a.id === data.categoryId)?.name || '',
        amount: amountInCents,
        currency: data.currency,
        period: data.period,
      };

      if (budgetToEdit) {
        await updateMutation.mutateAsync({ workspaceId, budgetId: budgetToEdit.id, budget: payload });
      } else {
        await createMutation.mutateAsync({ workspaceId, budget: payload });
      }
      onClose();
    } catch (err: any) {
      console.error(err);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={budgetToEdit ? "Edit Budget" : "Create Budget"}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {(createMutation.isError || updateMutation.isError) && (
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl text-sm font-bold border border-rose-100">
            {createMutation.error?.message || updateMutation.error?.message || 'Failed to save budget'}
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-700">Category</label>
          <select 
            {...register('categoryId')}
            className={cn("w-full px-4 py-3 bg-gray-50 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-gray-900 transition-shadow focus:bg-white", errors.categoryId ? "border-rose-500" : "border-gray-200")}
          >
            <option value="">Select a Category...</option>
            {(() => {
              const cats = accounts.filter(a => a.type === 'EXPENSE');
              const roots = cats.filter(c => !c.parentId);
              return roots.map(root => {
                const children = cats.filter(c => c.parentId === root.id);
                return (
                  <optgroup key={root.id} label={root.name}>
                    <option value={root.id}>{root.icon ? `${root.icon} ` : ''}{root.name}</option>
                    {children.map(child => <option key={child.id} value={child.id}>↳ {child.icon ? `${child.icon} ` : ''}{child.name}</option>)}
                  </optgroup>
                );
              });
            })()}
          </select>
          {errors.categoryId && <p className="text-xs text-rose-500">{errors.categoryId.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">Amount Limit</label>
            <div className="flex gap-2">
              <div className="w-1/3">
                <select 
                  {...register('currency')}
                  className={cn("w-full px-4 py-3 bg-gray-50 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-gray-900 transition-shadow focus:bg-white", errors.currency ? "border-rose-500" : "border-gray-200")}
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="INR">INR</option>
                  <option value="AUD">AUD</option>
                  <option value="CAD">CAD</option>
                  <option value="SGD">SGD</option>
                </select>
              </div>
              <div className="relative w-2/3">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold"></span>
                <input 
                  {...register('amount')}
                  type="number" step="0.01" placeholder="0.00"
                  className={cn("w-full pl-6 pr-4 py-3 bg-gray-50 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-gray-900 transition-shadow focus:bg-white", errors.amount ? "border-rose-500" : "border-gray-200")} 
                />
              </div>
            </div>
            {errors.amount && <p className="text-xs text-rose-500">{errors.amount.message}</p>}
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">Period</label>
            <select 
              {...register('period')}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-gray-900 transition-shadow focus:bg-white"
            >
              <option value="MONTHLY">Monthly</option>
              <option value="YEARLY">Yearly</option>
              <option value="WEEKLY">Weekly</option>
            </select>
          </div>
        </div>

        <div className="pt-4 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="px-6 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-all shadow-[0_4px_14px_rgba(37,99,235,0.3)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.4)] hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none flex items-center gap-2">
            {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="w-4 h-4 animate-spin" />}
            {createMutation.isPending || updateMutation.isPending ? 'Saving...' : budgetToEdit ? 'Save Changes' : 'Save Budget'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
