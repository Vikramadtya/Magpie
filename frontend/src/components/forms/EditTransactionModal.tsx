import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Label } from '../ui/Label';
import { Button } from '../ui/Button';
import { Loader2, ArrowDownRight, ArrowUpRight, RefreshCw } from 'lucide-react';
import { useSettingsStore, SUPPORTED_CURRENCIES } from '../../store/useSettingsStore';
import { cn } from '../../utils/cn';
import { useUpdateTransaction } from '../../features/transactions/hooks/useTransactions';
import { useAccounts } from '../../features/accounts/hooks/useAccounts';
import { useCategoryTree } from '../../features/categories/hooks/useCategories';
import { PayeeService } from '../../features/payees/api/PayeeService';

interface EditTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  transaction: any;
}

const editTransactionSchema = z.object({
  type: z.enum(['EXPENSE', 'INCOME', 'TRANSFER']),
  transactionName: z.string().optional(),
  amount: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, "Amount must be greater than 0"),
  date: z.string().min(1, "Date is required"),
  accountId: z.string().min(1, "Account is required"),
  toAccountId: z.string().optional(),
  payeeName: z.string().optional(),
  payeeType: z.string(),
  categoryId: z.string().optional(),
  notes: z.string().optional(),
  txCurrency: z.string().min(1, "Currency is required"),
}).refine(data => {
  if (data.type === 'TRANSFER') {
    return data.accountId !== data.toAccountId;
  }
  return true;
}, {
  message: "Cannot transfer to the same account",
  path: ["toAccountId"],
});

type EditTransactionFormValues = z.infer<typeof editTransactionSchema>;

// million-ignore
export function EditTransactionModal({ isOpen, onClose, workspaceId, transaction }: EditTransactionModalProps) {
  const { data: accounts = [], isLoading: fetchingAccounts } = useAccounts(workspaceId);
  const [payeesList, setPayeesList] = useState<any[]>([]);
  const [showPayeeDropdown, setShowPayeeDropdown] = useState(false);
  const currency = useSettingsStore(state => state.settings.currency) || 'USD';
  const updateMutation = useUpdateTransaction();

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<EditTransactionFormValues>({
    resolver: zodResolver(editTransactionSchema),
    defaultValues: {
      type: 'EXPENSE',
      amount: '',
      date: '',
      transactionName: '',
      payeeName: '',
      payeeType: 'MERCHANT',
      categoryId: '',
      notes: '',
      txCurrency: currency,
      accountId: '',
      toAccountId: '',
    }
  });

  const type = watch('type');
  const payeeName = watch('payeeName');
  const isTransfer = type === 'TRANSFER';
  const targetCategoryType = type === 'INCOME' ? 'INCOME' : 'EXPENSE';
  
  const { data: categoryTree = [] } = useCategoryTree(workspaceId, targetCategoryType);

  useEffect(() => {
    if (isOpen) {
      PayeeService.getAll(workspaceId)
        .then(res => setPayeesList(Array.isArray(res) ? res : []))
        .catch(console.error);

      if (transaction && accounts.length > 0) {
        const isTransferType = transaction.type === 'TRANSFER_IN' || transaction.type === 'TRANSFER_OUT';
        const debit = transaction.entries.find((e: any) => e.amount > 0);
        const credit = transaction.entries.find((e: any) => e.amount < 0);
        
        let initType: 'EXPENSE' | 'INCOME' | 'TRANSFER' = 'EXPENSE';
        let initAccountId = '';
        let initToAccountId = '';
        let initCategoryId = '';
        let initPayeeName = transaction.payee?.name || '';
        
        if (debit && credit) {
          const debitAcc = accounts.find((a: any) => a.id === debit.account.id);
          const creditAcc = accounts.find((a: any) => a.id === credit.account.id);
          
          if (debitAcc?.type === 'EXPENSE' || debitAcc?.type === 'ASSET' || creditAcc?.type === 'LIABILITY') {
            initType = 'EXPENSE';
            initAccountId = credit.account.id;
            initCategoryId = debit.account.id;
          } else if (creditAcc?.type === 'INCOME') {
            initType = 'INCOME';
            initAccountId = debit.account.id;
            initCategoryId = credit.account.id;
          } else {
            initType = 'TRANSFER';
            initAccountId = credit.account.id;
            initToAccountId = debit.account.id;
          }
        }

        reset({
          type: initType,
          amount: (transaction.amount / 100).toString(),
          date: transaction.date.split('T')[0],
          transactionName: transaction.name || '',
          payeeName: initPayeeName,
          payeeType: 'MERCHANT',
          categoryId: initCategoryId,
          notes: transaction.notes || '',
          txCurrency: transaction.currency || currency,
          accountId: initAccountId,
          toAccountId: initToAccountId,
        });
      }
    }
  }, [isOpen, workspaceId, transaction, accounts, currency, reset]);

  const onSubmit = async (data: EditTransactionFormValues) => {
    try {
      const amountInCents = Math.round(parseFloat(data.amount) * 100);

      if (isTransfer) {
        const payload = {
          type: 'TRANSFER_OUT',
          account: { id: data.accountId },
          payee: { name: 'Transfer' },
          amount: amountInCents,
          currency: data.txCurrency,
          date: data.date,
          fromAccountId: data.accountId,
          toAccountId: data.toAccountId,
          notes: data.notes
        };
        await updateMutation.mutateAsync({ workspaceId, id: transaction.id, tx: payload });
      } else {
        const existingPayee = payeesList.find(p => p.name.toLowerCase() === (data.payeeName || '').trim().toLowerCase());
        const payeePayload = existingPayee 
          ? { id: existingPayee.id, name: existingPayee.name, type: existingPayee.type || data.payeeType } 
          : { name: (data.payeeName || '').trim(), type: data.payeeType };

        const payload = {
          account: { id: data.accountId },
          amount: amountInCents,
          type: data.type,
          name: (data.transactionName || '').trim(),
          date: data.date,
          payee: payeePayload,
          category: data.categoryId ? { id: data.categoryId } : undefined,
          currency: data.txCurrency,
          notes: data.notes
        };
        await updateMutation.mutateAsync({ workspaceId, id: transaction.id, tx: payload });
      }

      onClose();
    } catch (err: any) {
      console.error(err);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Transaction">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pt-2">
        {updateMutation.isError && (
          <div className="p-4 bg-rose-50 text-rose-700 rounded-xl text-sm font-bold border border-rose-100 flex items-center gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            {updateMutation.error?.message}
          </div>
        )}

        <div className="flex p-1 bg-gray-100/80 backdrop-blur-sm rounded-xl">
          <button type="button" onClick={() => setValue('type', 'EXPENSE')} className={cn("flex-1 py-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2", type === 'EXPENSE' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700")}>
            <ArrowUpRight className="w-4 h-4" /> Expense
          </button>
          <button type="button" onClick={() => setValue('type', 'INCOME')} className={cn("flex-1 py-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2", type === 'INCOME' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700")}>
            <ArrowDownRight className="w-4 h-4" /> Income
          </button>
          <button type="button" onClick={() => setValue('type', 'TRANSFER')} className={cn("flex-1 py-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2", type === 'TRANSFER' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700")}>
            <RefreshCw className="w-4 h-4" /> Transfer
          </button>
        </div>

        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <div className="flex gap-2">
                <div className="w-1/3">
                  <Select 
                    {...register('txCurrency')}
                    error={!!errors.txCurrency}
                  >
                    {SUPPORTED_CURRENCIES.map(c => (
                      <option key={c.code} value={c.code}>{c.code}</option>
                    ))}
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
            
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input 
                id="date"
                {...register('date')}
                type="date"
                className={errors.date ? "border-red-500 focus-visible:ring-red-500" : ""}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="transactionName">Transaction Name</Label>
            <Input 
              id="transactionName"
              {...register('transactionName')}
              placeholder="e.g. Weekly Groceries" 
              className={errors.transactionName ? "border-red-500 focus-visible:ring-red-500" : ""}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="accountId">{isTransfer ? 'From Account' : 'Account'}</Label>
              <Select 
                id="accountId"
                {...register('accountId')}
                disabled={fetchingAccounts}
                error={!!errors.accountId}
              >
                <option value="">Select account...</option>
                {(Array.isArray(accounts) ? accounts : []).filter((a: any) => !['INCOME', 'EXPENSE', 'SYSTEM', 'OTHER'].includes(a.type)).map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </Select>
            </div>
            {isTransfer && (
              <div className="space-y-2">
                <Label htmlFor="toAccountId">To Account</Label>
                <Select 
                  id="toAccountId"
                  {...register('toAccountId')}
                  disabled={fetchingAccounts}
                  error={!!errors.toAccountId}
                >
                  <option value="">Select account...</option>
                  {(Array.isArray(accounts) ? accounts : []).filter((a: any) => !['INCOME', 'EXPENSE', 'SYSTEM', 'OTHER'].includes(a.type)).map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </Select>
                {errors.toAccountId && <p className="text-xs text-rose-500">{errors.toAccountId.message}</p>}
              </div>
            )}
          </div>

          {!isTransfer && (
            <div className="grid grid-cols-2 gap-4">
              <div className="relative space-y-2">
                <div className="flex justify-between items-center mb-1">
                  <Label htmlFor="payeeName">{type === 'INCOME' ? 'Paid By' : 'Merchant / Payee'}</Label>
                  {(!payeesList.find(p => p.name.toLowerCase() === (payeeName || '').trim().toLowerCase()) && (payeeName || '').trim() !== '') && (
                    <select 
                      {...register('payeeType')}
                      className="text-xs font-bold text-blue-600 bg-blue-50 border-0 rounded-md py-1 px-2 cursor-pointer focus:ring-0"
                    >
                      <option value="MERCHANT">Organisation / Merchant</option>
                      <option value="PERSON">Person</option>
                    </select>
                  )}
                </div>
                <Input 
                  id="payeeName"
                  {...register('payeeName', {
                    onChange: () => setShowPayeeDropdown(true),
                    onBlur: () => setTimeout(() => setShowPayeeDropdown(false), 200)
                  })}
                  onFocus={() => setShowPayeeDropdown(true)}
                  placeholder={type === 'INCOME' ? "e.g. Employer, John Doe" : "e.g. Amazon, Whole Foods"} 
                  className={errors.payeeName ? "border-red-500 focus-visible:ring-red-500" : ""}
                />
                {showPayeeDropdown && payeesList.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                    {payeesList.filter(p => p.name.toLowerCase().includes((payeeName || '').toLowerCase())).map(p => (
                      <div 
                        key={p.id}
                        className="px-4 py-3 hover:bg-blue-50 cursor-pointer flex items-center gap-2 border-b border-gray-50 last:border-0"
                        onClick={() => { setValue('payeeName', p.name); setShowPayeeDropdown(false); }}
                      >
                        <span className="text-xl">{p.icon || '🏪'}</span>
                        <span className="font-medium text-gray-900 text-sm">{p.name}</span>
                      </div>
                    ))}
                  </div>
                )}
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
                {errors.categoryId && <p className="text-xs text-rose-500">{errors.categoryId.message}</p>}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Notes / Comments</Label>
            <Input 
              id="notes"
              {...register('notes')}
              placeholder="Optional notes about this transaction" 
              className={errors.notes ? "border-red-500 focus-visible:ring-red-500" : ""}
            />
          </div>
        </div>

        <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
          <Button 
            type="button" 
            variant="outline"
            onClick={onClose}
          >
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
