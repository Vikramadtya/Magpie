import { Plus } from 'lucide-react';
import { StateView } from '../../components/ui/StateView';
import { AddGoalModal } from '../../components/forms/AddGoalModal';
import { FundGoalModal } from '../../components/forms/FundGoalModal';
import { useGoalsViewModel } from '../../features/goals/hooks/useGoalsViewModel';
import { GoalCard } from '../../features/goals/components/GoalCard';

export default function GoalsPage() {
  const vm = useGoalsViewModel();

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Savings Goals</h1>
          <p className="text-gray-500 mt-1 font-medium">Track your progress towards major purchases.</p>
        </div>
        <button onClick={() => { vm.setGoalToEdit(null); vm.setIsModalOpen(true); }} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-all shadow-[0_4px_14px_rgba(37,99,235,0.3)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.4)] hover:-translate-y-0.5">
          <Plus className="w-4 h-4" />
          Create Goal
        </button>
      </header>

      <StateView 
        state={vm.stateStatus} 
        error={vm.error?.message || null} 
        onRetry={() => vm.refetch()}
        title={vm.error ? "Goals Unavailable" : "No Goals Active"}
        description={vm.error ? undefined : "Create your first savings goal to start tracking your progress."}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vm.goals.map((g) => (
            <GoalCard 
              key={g.id} 
              goal={g as any} 
              formatCurrency={vm.formatCurrency} 
              onEdit={vm.handleEdit}
              onDelete={vm.handleDelete}
              onFund={vm.handleFund}
            />
          ))}
        </div>
      </StateView>

      <AddGoalModal 
        isOpen={vm.isModalOpen}
        onClose={() => { vm.setIsModalOpen(false); vm.setGoalToEdit(null); }}
        workspaceId={vm.workspaceId}
        goalToEdit={vm.goalToEdit}
      />

      <FundGoalModal 
        isOpen={vm.isFundModalOpen}
        onClose={() => { vm.setIsFundModalOpen(false); vm.setGoalToFund(null); }}
        workspaceId={vm.workspaceId}
        goal={vm.goalToFund}
      />
    </div>
  );
}
