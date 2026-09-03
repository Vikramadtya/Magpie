import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { DollarSign, Calendar, ArrowRight } from 'lucide-react';
import { TransactionTypeSelector } from './TransactionTypeSelector';
import { Input } from '../../../components/ui/Input';
import { Label } from '../../../components/ui/Label';
import { Button } from '../../../components/ui/Button';
import { cn } from '../../../utils/cn';

const transactionSchema = z.object({
  type: z.enum(['expense', 'income', 'transfer']),
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  accountId: z.string().min(1, 'Account is required'),
  toAccountId: z.string().optional(),
  categoryId: z.string().optional(),
  date: z.string().min(1, 'Date is required'),
  note: z.string().optional(),
}).refine(data => {
  if (data.type === 'transfer' && !data.toAccountId) {
    return false;
  }
  return true;
}, {
  message: "Destination account is required for transfers",
  path: ["toAccountId"]
});

export type TransactionFormValues = z.infer<typeof transactionSchema>;

interface TransactionFormProps {
  onSubmit: (data: TransactionFormValues) => void;
  onCancel: () => void;
}

export function TransactionForm({ onSubmit, onCancel }: TransactionFormProps) {
  const { register, handleSubmit, control, watch, setValue, formState: { errors } } = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type: 'expense',
      amount: undefined,
      accountId: 'main-checking',
      categoryId: 'food',
      date: new Date().toISOString().split('T')[0],
      note: '',
    }
  });

  const currentType = watch('type');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <TransactionTypeSelector 
        type={currentType} 
        onChange={(type) => setValue('type', type)} 
      />

      <div className="relative group">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition-colors">
          <DollarSign className="w-8 h-8" />
        </div>
        <Controller
          name="amount"
          control={control}
          render={({ field }) => (
            <input 
              {...field}
              type="number"
              step="0.01"
              value={field.value ?? ''}
              onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
              placeholder="0.00"
              className={cn(
                "w-full pl-14 pr-4 py-4 text-4xl font-bold bg-transparent border-0 border-b-2 rounded-none transition-colors",
                currentType === 'expense' ? "text-gray-900 border-gray-200 focus:border-red-500" :
                currentType === 'income' ? "text-gray-900 border-gray-200 focus:border-green-500" :
                "text-gray-900 border-gray-200 focus:border-blue-500"
              )}
            />
          )}
        />
        {errors.amount && <p className="text-red-500 text-sm mt-1">{errors.amount.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>Account</Label>
          <select 
            {...register('accountId')}
            className="flex h-10 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <option value="main-checking">Main Checking</option>
            <option value="chase-credit">Chase Credit</option>
          </select>
        </div>
        
        {currentType === 'transfer' ? (
          <div className="space-y-1">
            <Label>To Account</Label>
            <select 
              {...register('toAccountId')}
              className="flex h-10 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <option value="savings">Savings</option>
            </select>
            {errors.toAccountId && <p className="text-red-500 text-sm">{errors.toAccountId.message}</p>}
          </div>
        ) : (
          <div className="space-y-1">
            <Label>Category</Label>
            <select 
              {...register('categoryId')}
              className="flex h-10 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <option value="food">Food & Dining</option>
              <option value="shopping">Shopping</option>
            </select>
          </div>
        )}
      </div>

      <div className="space-y-1">
        <Label>Date</Label>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input 
            type="date" 
            {...register('date')}
            className="pl-10"
          />
        </div>
        {errors.date && <p className="text-red-500 text-sm">{errors.date.message}</p>}
      </div>

      <div className="space-y-1">
        <Label>Notes</Label>
        <Input 
          {...register('note')}
          placeholder="Add details, tags, etc..."
        />
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" className="flex items-center gap-2">
          Save Transaction
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </form>
  );
}
