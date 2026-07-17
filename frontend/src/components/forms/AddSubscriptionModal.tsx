import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '../ui/Modal';
import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useAccounts } from '../../features/accounts/hooks/useAccounts';
import { useCreateSubscription } from '../../features/subscriptions/hooks/useSubscriptions';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useSettingsStore, getCurrencySymbol } from '../../store/useSettingsStore';

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

export function AddSubscriptionModal({ isOpen, onClose, workspaceId }: AddSubscriptionModalProps) {
  const accounts = useFinanceStore(state => state.accounts);
  const createMutation = useCreateSubscription();
  const currency = useSettingsStore(state => state.settings.currency);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<SubscriptionFormValues>({
    // @ts-ignore
    resolver: zodResolver(subscriptionSchema as any) as any,
    defaultValues: {
      name: '',
      amount: '',
      nextBillingDate: '',
      categoryId: '',
      accountId: '',
      currency: currency || 'USD'
    }
  });

  useEffect(() => {
    if (isOpen && accounts.length > 0 && !watch('accountId')) {
      setValue('accountId', accounts.filter(a => a.type !== 'EXPENSE')[0]?.id || accounts[0].id);
    }
  }, [isOpen, accounts, setValue, watch]);

  const onSubmit = async (data: SubscriptionFormValues) => {
    try {
      const amountInCents = Math.round(parseFloat(data.amount) * 100);

      const payload = {
        name: data.name.trim(),
        amount: amountInCents,
        billingCycle: 'MONTHLY',
        nextBillingDate: data.nextBillingDate,
        accountId: data.accountId,
        categoryId: data.categoryId,
        currency: data.currency,
      };

      await createMutation.mutateAsync({ workspaceId, subscription: payload });
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
            {createMutation.error.message || 'Failed to save subscription'}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">Subscription Name</label>
            <input 
              {...register('name')}
              placeholder="e.g. Netflix"
              className={cn("w-full px-4 py-3 bg-gray-50 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-gray-900", errors.name ? "border-rose-500" : "border-gray-200")} 
            />
            {errors.name && <p className="text-xs text-rose-500">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">Amount</label>
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
                  className={cn("w-full pl-6 pr-3 py-3 bg-gray-50 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-gray-900", errors.amount ? "border-rose-500" : "border-gray-200")} 
                />
              </div>
            </div>
            {errors.amount && <p className="text-xs text-rose-500">{errors.amount.message}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">Source Account</label>
            <select 
              {...register('accountId')}
              className={cn("w-full px-4 py-3 bg-gray-50 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-gray-900", errors.accountId ? "border-rose-500" : "border-gray-200")}
            >
              {accounts.filter(a => a.type !== 'EXPENSE').map(a => <option key={a.id} value={a.id}>{a.name} ({a.type})</option>)}
            </select>
            {errors.accountId && <p className="text-xs text-rose-500">{errors.accountId.message}</p>}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">Next Billing Date</label>
            <input 
              {...register('nextBillingDate')}
              type="date"
              className={cn("w-full px-4 py-3 bg-gray-50 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-gray-900", errors.nextBillingDate ? "border-rose-500" : "border-gray-200")} 
            />
            {errors.nextBillingDate && <p className="text-xs text-rose-500">{errors.nextBillingDate.message}</p>}
          </div>
        </div>

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
        </div>

        <div className="pt-4 flex justify-end gap-3">
          <button type="button" onClick={() => { reset(); onClose(); }} className="px-5 py-2.5 text-sm font-bold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={createMutation.isPending} className="px-6 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-all shadow-[0_4px_14px_rgba(37,99,235,0.3)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.4)] hover:-translate-y-0.5 disabled:opacity-50 flex items-center gap-2">
            {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            {createMutation.isPending ? 'Saving...' : 'Add Subscription'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
