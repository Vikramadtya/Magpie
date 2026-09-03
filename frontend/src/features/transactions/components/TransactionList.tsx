import { GroupedVirtuoso } from 'react-virtuoso';
import { ArrowUpRight, ArrowDownRight, ArrowRightLeft, Pencil, Trash2, MessageSquare } from 'lucide-react';
import { cn } from '../../../utils/cn';
import type { Transaction } from '../../../types/models';

interface TransactionListProps {
  grouped: Record<string, Transaction[]>;
  groupDates: string[];
  groupCounts: number[];
  formatCurrency: (val: number, currency: string) => string;
  onEdit: (tx: Transaction) => void;
  onDelete: (tx: Transaction) => void;
  onComments: (tx: Transaction) => void;
}

export const TransactionList = ({
  grouped,
  groupDates,
  groupCounts,
  formatCurrency,
  onEdit,
  onDelete,
  onComments
}: TransactionListProps) => {
  return (
    <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden h-[600px]">
      <GroupedVirtuoso
        groupCounts={groupCounts}
        groupContent={(index: number) => {
          const date = groupDates[index];
          return (
            <div className="px-6 py-3 bg-gray-50/80 border-b border-gray-100/50 backdrop-blur-sm sticky top-0 z-10">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">{date}</h3>
            </div>
          );
        }}
        itemContent={(index: number, groupIndex: number) => {
          const date = groupDates[groupIndex];
          const tx = grouped[date][index - groupCounts.slice(0, groupIndex).reduce((a, b) => a + b, 0)];
          const isIncome = tx.type === 'INCOME' || tx.type === 'TRANSFER_IN';
          const isExpense = tx.type === 'EXPENSE' || tx.type === 'TRANSFER_OUT';
          const sign = isIncome ? '+' : isExpense ? '-' : '';
          
          return (
            <div className="px-6 py-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors group cursor-pointer border-b border-gray-100 last:border-b-0">
              <div className="flex items-center gap-4">
                <div className={cn("w-10 h-10 rounded-full flex items-center justify-center transition-colors shadow-sm", isIncome ? "bg-emerald-50 text-emerald-600" : isExpense ? "bg-rose-50 text-rose-600" : "bg-gray-50 text-gray-600")}>
                  {isIncome ? <ArrowDownRight className="w-5 h-5" /> : isExpense ? <ArrowUpRight className="w-5 h-5" /> : <ArrowRightLeft className="w-5 h-5" />}
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900 line-clamp-1">{tx.name || tx.payee?.name || 'Unnamed Transaction'}</p>
                  <p className="text-xs font-semibold text-gray-400 mt-0.5">
                    {tx.categoryName ? tx.categoryName : ''}
                    {tx.categoryName && tx.notes ? ` • ` : ''}
                    {tx.notes ? tx.notes : ''}
                    {tx.status && tx.status !== 'CLEARED' ? ` • ${tx.status}` : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className={cn("text-base font-extrabold tracking-tight", isIncome ? "text-emerald-600" : "text-rose-600")}>
                  {sign}{formatCurrency(tx.amount, tx.currency)}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => onComments(tx)}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors relative"
                  >
                    <MessageSquare className="w-4 h-4" />
                    {tx.comments && tx.comments.length > 0 && (
                      <span className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full border border-white"></span>
                    )}
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); onEdit(tx); }}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); onDelete(tx); }}
                    className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        }}
      />
    </div>
  );
};
