import { Plus } from 'lucide-react';
import { StateView } from '../../components/ui/StateView';
import { AddInvestmentModal } from '../../components/forms/AddInvestmentModal';
import { useInvestmentsViewModel } from '../../features/investments/hooks/useInvestmentsViewModel';
import { InvestmentCard } from '../../features/investments/components/InvestmentCard';

export default function InvestmentsPage() {
  const vm = useInvestmentsViewModel();

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Investments</h1>
          <p className="text-gray-500 mt-1 font-medium">Track your portfolios and assets.</p>
        </div>
        <button onClick={() => vm.setIsModalOpen(true)} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-all shadow-[0_4px_14px_rgba(37,99,235,0.3)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.4)] hover:-translate-y-0.5">
          <Plus className="w-4 h-4" />
          Add Asset
        </button>
      </header>

      <StateView 
        state={vm.stateStatus} 
        error={vm.error?.message || null} 
        onRetry={() => vm.refetch()}
        title={vm.error ? "Investments Unavailable" : "Portfolio Empty"}
        description={vm.error ? undefined : "Add stocks, crypto, or real estate assets to begin."}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(vm.investments as any[]).map((i: any) => (
            <InvestmentCard 
              key={i.id} 
              investment={i as any} 
              formatCurrency={vm.formatCurrency} 
            />
          ))}
        </div>
      </StateView>

      <AddInvestmentModal 
        isOpen={vm.isModalOpen}
        onClose={() => vm.setIsModalOpen(false)}
        workspaceId={vm.workspaceId}
      />
    </div>
  );
}
