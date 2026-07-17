import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '../ui/Modal';
import { Loader2, ArrowDownRight, ArrowUpRight, RefreshCw } from 'lucide-react';
import { useSettingsStore, SUPPORTED_CURRENCIES } from '../../store/useSettingsStore';
import { cn } from '../../utils/cn';
import { apiClient } from '../../utils/api';
import { useUpdateTransaction } from '../../features/transactions/hooks/useTransactions';
import { useAccounts } from '../../features/accounts/hooks/useAccounts';
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
  payeeType: z.string().default('MERCHANT'),
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

export function EditTransactionModal({ isOpen, onClose, workspaceId, transaction }: EditTransactionModalProps) {
  const { data: accounts = [], isLoading: fetchingAccounts } = useAccounts(workspaceId);
  const [payeesList, setPayeesList] = useState<any[]>([]);
  const [showPayeeDropdown, setShowPayeeDropdown] = useState(false);
  const currency = useSettingsStore(state => state.settings.currency);
  const updateMutation = useUpdateTransaction();

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<EditTransactionFormValues>({
    // @ts-ignore
    resolver: zodResolver(editTransactionSchema as any) as any,
    defaultValues: {
      type: 'EXPENSE',
      amount: '',
      date: '',
      transactionName: '',
      payeeName: '',
      payeeType: 'MERCHANT',
      categoryId: '',
      notes: '',
      txCurrency: currency || 'USD',
      accountId: '',
      toAccountId: '',
    }
  });

  const type = watch('type');
  const payeeName = watch('payeeName');
  const isTransfer = type === 'TRANSFER';

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
          payeeType: 'MERCHANT', // Simplified for edit
          categoryId: initCategoryId,
          notes: transaction.notes || '',
          txCurrency: transaction.currency || currency || 'USD',
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
            {updateMutation.error.message}
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
              <label className="text-sm font-bold text-gray-700">Amount</label>
            <div className="flex rounded-xl border border-gray-200 bg-gray-50 focus-within:ring-2 focus-within:ring-blue-500 transition-shadow overflow-hidden">
              <select 
                {...register('txCurrency')}
                className="bg-gray-100/50 text-gray-600 font-bold text-base px-3 py-3 border-r border-gray-200 focus:outline-none cursor-pointer"
              >
                {SUPPORTED_CURRENCIES.map(c => (
                  <option key={c.code} value={c.code}>{c.symbol}</option>
                ))}
              </select>
              <input 
                {...register('amount')}
                type="number" step="0.01" 
                className="w-full px-4 py-3 bg-transparent text-sm focus:outline-none font-medium text-gray-900"
              />
            </div>
              {errors.amount && <p className="text-xs text-rose-500">{errors.amount.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Date</label>
              <input 
                {...register('date')}
                type="date" 
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-gray-900 transition-shadow focus:bg-white"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">Transaction Name</label>
            <input 
              {...register('transactionName')}
              placeholder="e.g. Weekly Groceries" 
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-gray-900 transition-shadow focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">{isTransfer ? 'From Account' : 'Account'}</label>
              <select 
                {...register('accountId')}
                disabled={fetchingAccounts}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-gray-900 transition-shadow focus:bg-white disabled:opacity-50"
              >
                <option value="">Select account...</option>
                {(Array.isArray(accounts) ? accounts : []).filter((a: any) => !['INCOME', 'EXPENSE', 'SYSTEM', 'OTHER'].includes(a.type)).map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            {isTransfer && (
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">To Account</label>
                <select 
                  {...register('toAccountId')}
                  disabled={fetchingAccounts}
                  className={cn("w-full px-4 py-3 bg-gray-50 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-gray-900 transition-shadow focus:bg-white disabled:opacity-50", errors.toAccountId ? "border-rose-500" : "border-gray-200")}
                >
                  <option value="">Select account...</option>
                  {(Array.isArray(accounts) ? accounts : []).filter((a: any) => !['INCOME', 'EXPENSE', 'SYSTEM', 'OTHER'].includes(a.type)).map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
                {errors.toAccountId && <p className="text-xs text-rose-500">{errors.toAccountId.message}</p>}
              </div>
            )}
          </div>

          {!isTransfer && (
            <div className="grid grid-cols-2 gap-4">
              <div className="relative space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-bold text-gray-700">{type === 'INCOME' ? 'Paid By' : 'Merchant / Payee'}</label>
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
                <input 
                  {...register('payeeName', {
                    onChange: () => setShowPayeeDropdown(true),
                    onBlur: () => setTimeout(() => setShowPayeeDropdown(false), 200)
                  })}
                  onFocus={() => setShowPayeeDropdown(true)}
                  placeholder={type === 'INCOME' ? "e.g. Employer, John Doe" : "e.g. Amazon, Whole Foods"} 
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-gray-900 transition-shadow focus:bg-white"
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
                <label className="text-sm font-bold text-gray-700">Category</label>
                <select 
                  {...register('categoryId')}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-gray-900 transition-shadow focus:bg-white focus:shadow-[0_8px_30px_rgb(37,99,235,0.08)]" 
                >
                  <option value="">Select a Category...</option>
                  {(() => {
                    const targetType = type === 'INCOME' ? 'INCOME' : 'EXPENSE';
                    const cats = accounts.filter((a: any) => a.type === targetType);
                    const roots = cats.filter((c: any) => !c.parentId);
                    return roots.map((root: any) => {
                      const children = cats.filter((c: any) => c.parentId === root.id);
                      return (
                        <optgroup key={root.id} label={root.name}>
                          <option value={root.id}>{root.icon ? `${root.icon} ` : ''}{root.name}</option>
                          {children.map((child: any) => <option key={child.id} value={child.id}>↳ {child.icon ? `${child.icon} ` : ''}{child.name}</option>)}
                        </optgroup>
                      );
                    });
                  })()}
                </select>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">Notes / Comments</label>
            <input 
              {...register('notes')}
              placeholder="Optional notes about this transaction" 
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-gray-900 transition-shadow focus:bg-white"
            />
          </div>
        </div>

        <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
          <button 
            type="button" 
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-bold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            disabled={updateMutation.isPending}
            className="px-6 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-all shadow-[0_4px_14px_rgba(37,99,235,0.3)] flex items-center gap-2"
          >
            {updateMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
