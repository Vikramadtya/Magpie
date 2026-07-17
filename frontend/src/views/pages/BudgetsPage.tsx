import { Plus, Target, TrendingUp } from 'lucide-react';
import { StateView } from '../../components/ui/StateView';
import { AddBudgetModal } from '../../components/forms/AddBudgetModal';
import { useBudgetsViewModel } from '../../features/budgets/hooks/useBudgetsViewModel';
import { BudgetCard } from '../../features/budgets/components/BudgetCard';

export default function BudgetsPage() {
  const vm = useBudgetsViewModel();

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Budgets</h1>
          <p className="text-gray-500 mt-1 font-medium">Track your spending limits for the month.</p>
        </div>
        <button onClick={() => { vm.setBudgetToEdit(null); vm.setIsModalOpen(true); }} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-all shadow-[0_4px_14px_rgba(37,99,235,0.3)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.4)] hover:-translate-y-0.5">
          <Plus className="w-4 h-4" />
          Create Budget
        </button>
      </header>

      <StateView 
        state={vm.stateStatus} 
        error={vm.error?.message || null} 
        onRetry={() => vm.refetch()}
        title={vm.error ? "Budgets Unavailable" : "No Budgets Yet"}
        description={vm.error ? undefined : "Create your first budget to start tracking your spending."}
      >
        <div className="space-y-8">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-center gap-5">
              <div className="w-14 h-14 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                <Target className="w-7 h-7" />
              </div>
              <div>
                <div className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-1">Total Budgeted</div>
                <div className="text-3xl font-extrabold text-gray-900 tracking-tight">{vm.formatCurrency(vm.totalBudgeted)}</div>
              </div>
            </div>
            
            <div className="bg-white rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-center gap-5">
              <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <TrendingUp className="w-7 h-7" />
              </div>
              <div>
                <div className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-1">Total Spent</div>
                <div className="text-3xl font-extrabold text-gray-900 tracking-tight">{vm.formatCurrency(vm.totalSpent)}</div>
              </div>
            </div>
          </div>

          {/* Budget List */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {vm.budgets.map((b) => (
              <BudgetCard 
                key={b.id} 
                budget={b as any} 
                formatCurrency={vm.formatCurrency} 
                onEdit={vm.handleEdit}
                onDelete={vm.handleDelete}
              />
            ))}
          </div>
        </div>
      </StateView>

      <AddBudgetModal 
        isOpen={vm.isModalOpen}
        onClose={() => { vm.setIsModalOpen(false); vm.setBudgetToEdit(null); }}
        workspaceId={vm.workspaceId}
        budgetToEdit={vm.budgetToEdit}
      />
    </div>
  );
}
