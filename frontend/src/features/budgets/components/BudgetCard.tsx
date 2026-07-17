import { AlertCircle, Edit2, Trash2 } from 'lucide-react';
import { cn } from '../../../utils/cn';
import type { Budget } from '../api/types';

interface BudgetCardProps {
  budget: Budget;
  formatCurrency: (val: number) => string;
  onEdit?: (budget: Budget) => void;
  onDelete?: (budgetId: string) => void;
}

export const BudgetCard = ({ budget, formatCurrency, onEdit, onDelete }: BudgetCardProps) => {
  const percent = Math.min((budget.spent / budget.amount) * 100, 100);
  const isOver = budget.spent > budget.amount;
  
  return (
    <div className="bg-white rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all group">
      <div className="flex justify-between items-center mb-5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center text-xl shadow-sm group-hover:scale-110 transition-transform">
            {budget.categoryName?.charAt(0) || '🏷️'}
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-lg tracking-tight">{budget.categoryName}</h3>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">{budget.period}</p>
          </div>
        </div>
        <div className="text-right relative">
          <div className="flex items-center gap-2 absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            {onEdit && (
              <button onClick={(e) => { e.stopPropagation(); onEdit(budget); }} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                <Edit2 className="w-4 h-4" />
              </button>
            )}
            {onDelete && (
              <button onClick={(e) => { e.stopPropagation(); onDelete(budget.id); }} className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="flex items-baseline gap-1 justify-end mt-6">
            <span className={cn("font-extrabold text-2xl tracking-tight", isOver ? "text-rose-600" : "text-gray-900")}>
              {formatCurrency(budget.spent)}
            </span>
            <span className="text-sm font-semibold text-gray-400">/ {formatCurrency(budget.amount)}</span>
          </div>
        </div>
      </div>
      
      {/* Progress Bar */}
      <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden">
        <div 
          className={cn("h-full rounded-full transition-all duration-1000", isOver ? "bg-rose-500" : "bg-blue-600")} 
          style={{ width: `${percent}%` }}
        />
      </div>
      {isOver && (
        <p className="text-xs text-rose-500 mt-3 font-bold flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5" />
          Over budget by {formatCurrency(budget.spent - budget.amount)}
        </p>
      )}
    </div>
  );
};
