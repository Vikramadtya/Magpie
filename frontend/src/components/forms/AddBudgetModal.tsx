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
import { useCreateBudget, useUpdateBudget } from '../../features/budgets/hooks/useBudgets';
import { useCategoryTree } from '../../features/categories/hooks/useCategories';
import type { Budget } from '../../features/budgets/api/types';
import { useSettingsStore } from '../../store/useSettingsStore';

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

// million-ignore
export function AddBudgetModal({ isOpen, onClose, workspaceId, budgetToEdit }: AddBudgetModalProps) {
  const createMutation = useCreateBudget();
  const updateMutation = useUpdateBudget();
  const currency = useSettingsStore(state => state.settings.currency);
  const { data: categoryTree = [] } = useCategoryTree(workspaceId, 'EXPENSE');

  const { register, handleSubmit, reset, formState: { errors } } = useForm<BudgetFormValues>({
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

  const getCategoryName = (id: string, nodes: any[]): string => {
    for (const node of nodes) {
      if (node.id === id) return node.name;
      if (node.children) {
        const found = getCategoryName(id, node.children);
        if (found) return found;
      }
    }
    return '';
  };

  const onSubmit = async (data: BudgetFormValues) => {
    try {
      const amountInCents = Math.round(parseFloat(data.amount) * 100);

      const payload = {
        categoryId: data.categoryId,
        name: getCategoryName(data.categoryId, categoryTree),
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
          <Label htmlFor="categoryId">Category</Label>
          <Select 
            id="categoryId"
            {...register('categoryId')}
            error={!!errors.categoryId}
          >
            <option value="">Select a Category...</option>
            {categoryTree.map((root: any) => (
              <optgroup key={root.id} label={root.name}>
                <option value={root.id}>{root.icon ? `${root.icon} ` : ''}{root.name}</option>
                {root.children?.map((child: any) => (
                  <option key={child.id} value={child.id}>↳ {child.icon ? `${child.icon} ` : ''}{child.name}</option>
                ))}
              </optgroup>
            ))}
          </Select>
          {errors.categoryId && <p className="text-xs text-rose-500">{errors.categoryId.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount Limit</Label>
            <div className="flex gap-2">
              <div className="w-1/3">
                <Select id="currency" {...register('currency')} error={!!errors.currency}>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="INR">INR</option>
                  <option value="AUD">AUD</option>
                  <option value="CAD">CAD</option>
                  <option value="SGD">SGD</option>
                </Select>
              </div>
              <div className="w-2/3">
                <Input 
                  id="amount"
                  {...register('amount')}
                  type="number" step="0.01" placeholder="0.00"
                  className={errors.amount ? "border-red-500 focus-visible:ring-red-500" : ""}
                />
              </div>
            </div>
            {errors.amount && <p className="text-xs text-rose-500">{errors.amount.message}</p>}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="period">Period</Label>
            <Select id="period" {...register('period')}>
              <option value="MONTHLY">Monthly</option>
              <option value="YEARLY">Yearly</option>
              <option value="WEEKLY">Weekly</option>
            </Select>
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
            {createMutation.isPending || updateMutation.isPending ? 'Saving...' : budgetToEdit ? 'Save Changes' : 'Save Budget'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
