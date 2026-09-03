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
import { useUpdateAccount } from '../../features/accounts/hooks/useAccounts';

interface EditAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  workspaceId: string;
  account: { id: string; name: string; type: string; subType?: string; currency: string } | null;
}

const editAccountSchema = z.object({
  name: z.string().min(1, "Account name is required"),
  type: z.string().min(1, "Type is required"),
  currency: z.string().min(1, "Currency is required"),
});

type EditAccountFormValues = z.infer<typeof editAccountSchema>;

// million-ignore
export function EditAccountModal({ isOpen, onClose, onSuccess, workspaceId, account }: EditAccountModalProps) {
  const updateMutation = useUpdateAccount();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<EditAccountFormValues>({
    resolver: zodResolver(editAccountSchema),
    defaultValues: {
      name: '',
      type: 'ASSET',
      currency: 'USD',
    }
  });

  useEffect(() => {
    if (account && isOpen) {
      reset({
        name: account.name,
        type: account.subType === 'CASH' ? 'CASH' : account.type,
        currency: account.currency,
      });
    }
  }, [account, isOpen, reset]);

  const onSubmit = async (data: EditAccountFormValues) => {
    if (!account) return;

    try {
      const payload = {
        name: data.name.trim(),
        type: data.type,
        currency: data.currency
      };

      await updateMutation.mutateAsync({ workspaceId, accountId: account.id, account: payload as any });

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Account">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {updateMutation.isError && (
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl text-sm font-bold border border-rose-100">
            {updateMutation.error?.message || 'Failed to update account'}
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

        <div className="pt-4 flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            variant="default"
            disabled={updateMutation.isPending}
            className="flex items-center gap-2"
          >
            {updateMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
