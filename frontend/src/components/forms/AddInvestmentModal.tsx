import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '../ui/Modal';
import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useAccounts } from '../../features/accounts/hooks/useAccounts';
import { useCreateInvestment } from '../../features/investments/hooks/useInvestments';
import { useCreateTransaction } from '../../features/transactions/hooks/useTransactions';
import { useSettingsStore, getCurrencySymbol } from '../../store/useSettingsStore';

interface AddInvestmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
}

const investmentSchema = z.object({
  name: z.string().min(1, "Asset name is required"),
  ticker: z.string().min(1, "Ticker is required"),
  assetClass: z.string().default('STOCK'),
  quantity: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, "Quantity must be greater than 0"),
  currentPrice: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, "Price must be greater than 0"),
  enableSIP: z.boolean().default(false),
  sourceAccountId: z.string().optional(),
  sipAmount: z.string().optional(),
  sipFrequency: z.string().default('MONTHLY'),
});

type InvestmentFormValues = z.infer<typeof investmentSchema>;

// million-ignore
export function AddInvestmentModal({ isOpen, onClose, workspaceId }: AddInvestmentModalProps) {
  const { data: accounts = [] } = useAccounts(workspaceId);
  const currency = useSettingsStore(state => state.settings.currency);
  const createInvestment = useCreateInvestment();
  const createTransaction = useCreateTransaction();

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<InvestmentFormValues>({
    // @ts-ignore
    resolver: zodResolver(investmentSchema as any) as any,
    defaultValues: {
      name: '',
      ticker: '',
      assetClass: 'STOCK',
      quantity: '',
      currentPrice: '',
      enableSIP: false,
      sourceAccountId: '',
      sipAmount: '',
      sipFrequency: 'MONTHLY'
    }
  });

  const enableSIP = watch('enableSIP');

  useEffect(() => {
    if (isOpen && accounts.length > 0 && !watch('sourceAccountId')) {
      setValue('sourceAccountId', accounts[0].id);
    }
  }, [isOpen, accounts, setValue, watch]);

  const onSubmit = async (data: InvestmentFormValues) => {
    try {
      const priceInCents = Math.round(parseFloat(data.currentPrice) * 100);
      const qty = parseFloat(data.quantity);

      const payload = {
        workspace: { id: workspaceId },
        name: data.name.trim(),
        ticker: data.ticker.trim(),
        assetClass: data.assetClass,
        quantity: Math.round(qty * 100),
        currentPrice: priceInCents,
        currency: 'USD'
      };

      await createInvestment.mutateAsync({ workspaceId, investment: payload });

      if (data.enableSIP && data.sourceAccountId && qty > 0) {
        const transferPayload = {
          account: { id: data.sourceAccountId },
          workspace: { id: workspaceId },
          amount: Math.round(priceInCents * qty),
          type: 'INVESTMENT',
          date: new Date().toISOString().split('T')[0],
          payee: { name: `Investment: ${data.ticker}` },
          status: 'CLEARED',
          currency: 'USD'
        };
        await createTransaction.mutateAsync({ workspaceId, payload: transferPayload });
      }

      reset();
      onClose();
    } catch (err: any) {
      console.error(err);
    }
  };

  const isPending = createInvestment.isPending || createTransaction.isPending;
  const submitError = createInvestment.error || createTransaction.error;

  return (
    <Modal isOpen={isOpen} onClose={() => { reset(); onClose(); }} title="Add Investment Asset">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {submitError && (
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl text-sm font-bold border border-rose-100">
            {submitError.message || 'Failed to save investment'}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">Asset Name</label>
            <input 
              {...register('name')}
              placeholder="e.g. Apple Inc."
              className={cn("w-full px-4 py-3 bg-gray-50 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-gray-900 transition-shadow focus:bg-white", errors.name ? "border-rose-500" : "border-gray-200")} 
            />
            {errors.name && <p className="text-xs text-rose-500">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">Ticker / Symbol</label>
            <input 
              {...register('ticker')}
              placeholder="e.g. AAPL"
              className={cn("w-full px-4 py-3 bg-gray-50 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-gray-900 transition-shadow focus:bg-white uppercase", errors.ticker ? "border-rose-500" : "border-gray-200")} 
            />
            {errors.ticker && <p className="text-xs text-rose-500">{errors.ticker.message}</p>}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">Asset Class</label>
            <select 
              {...register('assetClass')}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-gray-900 transition-shadow focus:bg-white"
            >
              <option value="STOCK">Stock</option>
              <option value="CRYPTO">Crypto</option>
              <option value="REAL_ESTATE">Real Estate</option>
              <option value="ETF">ETF / Fund</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">Quantity</label>
            <input 
              {...register('quantity')}
              type="number" step="0.0001" placeholder="0.00"
              className={cn("w-full px-4 py-3 bg-gray-50 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-gray-900 transition-shadow focus:bg-white", errors.quantity ? "border-rose-500" : "border-gray-200")} 
            />
            {errors.quantity && <p className="text-xs text-rose-500">{errors.quantity.message}</p>}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">Current Price</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">{getCurrencySymbol(currency)}</span>
              <input 
                {...register('currentPrice')}
                type="number" step="0.01" placeholder="0.00"
                className={cn("w-full pl-7 pr-3 py-3 bg-gray-50 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-gray-900 transition-shadow focus:bg-white", errors.currentPrice ? "border-rose-500" : "border-gray-200")} 
              />
            </div>
            {errors.currentPrice && <p className="text-xs text-rose-500">{errors.currentPrice.message}</p>}
          </div>
        </div>

        <div className="border-t border-gray-100 pt-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-gray-900">Funding & SIP</h4>
              <p className="text-xs text-gray-500">Deduct funds from checking/savings</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" {...register('enableSIP')} />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className={cn("space-y-4 transition-all overflow-hidden", enableSIP ? "max-h-60 opacity-100" : "max-h-0 opacity-0")}>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Source Account</label>
              <select 
                {...register('sourceAccountId')}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-gray-900"
              >
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({a.type})</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Recurring SIP Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">{getCurrencySymbol(currency)}</span>
                  <input 
                    {...register('sipAmount')}
                    type="number" step="0.01" placeholder="0.00"
                    className="w-full pl-7 pr-3 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-gray-900"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Frequency</label>
                <select 
                  {...register('sipFrequency')}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-gray-900"
                >
                  <option value="MONTHLY">Monthly</option>
                  <option value="WEEKLY">Weekly</option>
                  <option value="BIWEEKLY">Bi-Weekly</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-4 flex justify-end gap-3">
          <button type="button" onClick={() => { reset(); onClose(); }} className="px-5 py-2.5 text-sm font-bold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={isPending} className="px-6 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-all shadow-[0_4px_14px_rgba(37,99,235,0.3)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.4)] hover:-translate-y-0.5 disabled:opacity-50 flex items-center gap-2">
            {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            {isPending ? 'Saving...' : 'Add Investment'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
