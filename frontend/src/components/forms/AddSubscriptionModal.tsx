import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Label } from '../ui/Label';
import { Button } from '../ui/Button';
import { Loader2 } from 'lucide-react';
import { useAccounts } from '../../features/accounts/hooks/useAccounts';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useCreateSubscription } from '../../features/subscriptions/hooks/useSubscriptions';
import { useCategoryTree } from '../../features/categories/hooks/useCategories';

interface AddSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
}

const subscriptionSchema = z.object({
  name: z.string().min(1, "Name is required"),
  amount: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, "Amount must be greater than 0"),
  nextBillingDate: z.string().min(1, "Billing date is required"),
  categoryId: z.string().optional(),
  accountId: z.string().min(1, "Account is required"),
  currency: z.string().min(1, "Currency is required"),
});

type SubscriptionFormValues = z.infer<typeof subscriptionSchema>;

// million-ignore
export function AddSubscriptionModal({ isOpen, onClose, workspaceId }: AddSubscriptionModalProps) {
  const { data: accounts = [] } = useAccounts(workspaceId);
  const createMutation = useCreateSubscription();
  const currency = useSettingsStore(state => state.settings.currency) || 'USD';
  
  const { data: categoryTree = [] } = useCategoryTree(workspaceId, 'EXPENSE');

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<SubscriptionFormValues>({
    resolver: zodResolver(subscriptionSchema),
    defaultValues: {
      name: '',
      amount: '',
      nextBillingDate: '',
      categoryId: '',
      accountId: '',
      currency: currency
    }
  });

  const watchAccountId = watch('accountId');

  useEffect(() => {
    if (isOpen && accounts.length > 0 && !watchAccountId) {
      setValue('accountId', accounts.filter(a => a.type !== 'EXPENSE')[0]?.id || accounts[0].id);
    }
  }, [isOpen, accounts, setValue, watchAccountId]);

  const onSubmit = async (data: SubscriptionFormValues) => {
    try {
      const amountInCents = Math.round(parseFloat(data.amount) * 100);

      const payload = {
        name: data.name.trim(),
        amount: amountInCents,
        billingCycle: 'MONTHLY' as any,
        nextBillingDate: data.nextBillingDate,
        accountId: data.accountId,
        categoryId: data.categoryId,
        currency: data.currency,
      };

      await createMutation.mutateAsync({ workspaceId, subscription: payload as any });
      reset();
      onClose();
    } catch (err: any) {
      console.error(err);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={() => { reset(); onClose(); }} title="Add Subscription">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {createMutation.isError && (
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl text-sm font-bold border border-rose-100">
            {createMutation.error?.message || 'Failed to save subscription'}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Subscription Name</Label>
            <Input 
              id="name"
              {...register('name')}
              placeholder="e.g. Netflix"
              className={errors.name ? "border-red-500 focus-visible:ring-red-500" : ""}
            />
            {errors.name && <p className="text-xs text-rose-500">{errors.name.message}</p>}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <div className="flex gap-2">
              <div className="w-1/3">
                <Select 
                  {...register('currency')}
                  error={!!errors.currency}
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="INR">INR</option>
                  <option value="AUD">AUD</option>
                  <option value="CAD">CAD</option>
                  <option value="SGD">SGD</option>
                </Select>
              </div>
              <div className="relative w-2/3">
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
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="accountId">Source Account</Label>
            <Select 
              id="accountId"
              {...register('accountId')}
              error={!!errors.accountId}
            >
              {accounts.filter(a => a.type !== 'EXPENSE').map(a => <option key={a.id} value={a.id}>{a.name} ({a.type})</option>)}
            </Select>
            {errors.accountId && <p className="text-xs text-rose-500">{errors.accountId.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="nextBillingDate">Next Billing Date</Label>
            <Input 
              id="nextBillingDate"
              {...register('nextBillingDate')}
              type="date"
              className={errors.nextBillingDate ? "border-red-500 focus-visible:ring-red-500" : ""}
            />
            {errors.nextBillingDate && <p className="text-xs text-rose-500">{errors.nextBillingDate.message}</p>}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="categoryId">Category</Label>
          <Select 
            id="categoryId"
            {...register('categoryId')}
            error={!!errors.categoryId}
          >
            <option value="">Select a Category...</option>
            {categoryTree.map(root => (
              <optgroup key={root.id} label={root.name}>
                <option value={root.id}>{root.icon ? `${root.icon} ` : ''}{root.name}</option>
                {root.children?.map(child => (
                  <option key={child.id} value={child.id}>↳ {child.icon ? `${child.icon} ` : ''}{child.name}</option>
                ))}
              </optgroup>
            ))}
          </Select>
        </div>

        <div className="pt-4 flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => { reset(); onClose(); }}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            variant="default"
            disabled={createMutation.isPending}
            className="flex items-center gap-2"
          >
            {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            {createMutation.isPending ? 'Saving...' : 'Add Subscription'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
