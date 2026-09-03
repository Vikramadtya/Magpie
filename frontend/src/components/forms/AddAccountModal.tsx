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
import { useSettingsStore } from '../../store/useSettingsStore';
import { useCreateAccount } from '../../features/accounts/hooks/useAccounts';

interface AddAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  workspaceId: string;
}

const accountSchema = z.object({
  name: z.string().min(1, "Account name is required"),
  type: z.string().min(1, "Type is required"),
  currency: z.string().min(1, "Currency is required"),
  initialBalance: z.string().refine(val => !isNaN(parseFloat(val)), "Invalid balance amount"),
});

type AccountFormValues = z.infer<typeof accountSchema>;

// million-ignore
export function AddAccountModal({ isOpen, onClose, onSuccess, workspaceId }: AddAccountModalProps) {
  const defaultCurrency = useSettingsStore(state => state.settings.currency) || 'USD';
  const createMutation = useCreateAccount();

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<AccountFormValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      name: '',
      type: 'ASSET',
      currency: defaultCurrency,
      initialBalance: ''
    }
  });

  const watchType = watch('type');

  useEffect(() => {
    if (isOpen) {
      reset({
        name: '',
        type: 'ASSET',
        currency: defaultCurrency,
        initialBalance: ''
      });
    }
  }, [isOpen, defaultCurrency, reset]);

  useEffect(() => {
    if (watchType === 'LIABILITY') {
      setValue('initialBalance', '0.00');
    } else {
      setValue('initialBalance', '');
    }
  }, [watchType, setValue]);

  const onSubmit = async (data: AccountFormValues) => {
    try {
      const accountClass = data.type === 'CASH' ? 'ASSET' : data.type;
      const subType = data.type === 'CASH' ? 'CASH' : data.type;

      const payload = {
        name: data.name.trim(),
        type: accountClass as any,
        subType: subType,
        currency: data.currency,
        initialBalance: data.initialBalance ? Math.round(parseFloat(data.initialBalance) * 100) : 0
      };

      await createMutation.mutateAsync({ workspaceId, account: payload as any });

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Account">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {createMutation.isError && (
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl text-sm font-bold border border-rose-100">
            {createMutation.error?.message || 'Failed to create account'}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="name">Account Name</Label>
          <Input 
            id="name"
            {...register('name')}
            placeholder="e.g. Chase Sapphire"
            className={errors.name ? "border-red-500 focus-visible:ring-red-500" : ""}
          />
          {errors.name && <p className="text-xs text-rose-500">{errors.name.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="type">Account Type</Label>
            <Select 
              id="type"
              {...register('type')}
              error={!!errors.type}
            >
              <option value="ASSET">Checking / Savings (Asset)</option>
              <option value="CASH">Cash (Asset)</option>
              <option value="LIABILITY">Credit Card / Loan (Liability)</option>
              <option value="EQUITY">Equity / Investment</option>
            </Select>
            {errors.type && <p className="text-xs text-rose-500">{errors.type.message}</p>}
          </div>

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
            </Select>
            {errors.currency && <p className="text-xs text-rose-500">{errors.currency.message}</p>}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="initialBalance">Initial Balance</Label>
          <div className="relative">
            <Input 
              id="initialBalance"
              type="number" 
              step="0.01"
              {...register('initialBalance')}
              placeholder="0.00"
              className={errors.initialBalance ? "border-red-500 focus-visible:ring-red-500" : ""}
            />
          </div>
          {errors.initialBalance && <p className="text-xs text-rose-500">{errors.initialBalance.message}</p>}
        </div>

        <div className="pt-4 flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            variant="default"
            disabled={createMutation.isPending}
            className="flex items-center gap-2"
          >
            {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            {createMutation.isPending ? 'Creating...' : 'Create Account'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
