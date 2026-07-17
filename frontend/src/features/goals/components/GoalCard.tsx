import { Calendar, Target, Edit2, Trash2, Plus } from 'lucide-react';
import type { Goal } from '../api/types';

interface GoalCardProps {
  goal: Goal;
  formatCurrency: (val: number, currency?: string) => string;
  onEdit?: (goal: Goal) => void;
  onDelete?: (goalId: string) => void;
  onFund?: (goal: Goal) => void;
}

export const GoalCard = ({ goal, formatCurrency, onEdit, onDelete, onFund }: GoalCardProps) => {
  const saved = goal.savedAmount || 0;
  const percent = Math.min((saved / goal.targetAmount) * 100, 100) || 0;
  
  return (
    <div className="bg-white rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all group">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="font-bold text-gray-900 text-lg tracking-tight">{goal.name}</h3>
          {goal.dueDate && (
            <div className="flex items-center gap-1.5 mt-1 text-sm font-medium text-gray-500">
              <Calendar className="w-3.5 h-3.5" />
              {new Date(goal.dueDate).toLocaleDateString()}
            </div>
          )}
        </div>
        <div className="relative">
          <div className="flex items-center gap-2 absolute -top-4 -right-4 opacity-0 group-hover:opacity-100 transition-opacity">
            {onEdit && (
              <button onClick={(e) => { e.stopPropagation(); onEdit(goal); }} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                <Edit2 className="w-4 h-4" />
              </button>
            )}
            {onDelete && (
              <button onClick={(e) => { e.stopPropagation(); onDelete(goal.id); }} className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mt-2 mr-2 group-hover:scale-110 transition-transform relative cursor-pointer" onClick={(e) => { e.stopPropagation(); onFund?.(goal); }}>
            <Target className="w-5 h-5 absolute inset-0 m-auto group-hover:opacity-0 transition-opacity" />
            <Plus className="w-5 h-5 absolute inset-0 m-auto opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-baseline">
          <span className="font-extrabold text-2xl tracking-tight text-gray-900">{formatCurrency(saved, goal.currency)}</span>
          <span className="text-sm font-semibold text-gray-400">of {formatCurrency(goal.targetAmount, goal.currency)}</span>
        </div>
        <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden">
          <div 
            className="h-full rounded-full transition-all duration-1000 bg-blue-600" 
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    </div>
  );
};
