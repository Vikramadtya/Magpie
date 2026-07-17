import { Plus } from 'lucide-react';
import { StateView } from '../../components/ui/StateView';
import { AddAccountModal } from '../../components/forms/AddAccountModal';
import { EditAccountModal } from '../../components/forms/EditAccountModal';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { useAccountsViewModel } from '../../features/accounts/hooks/useAccountsViewModel';
import { AccountCard } from '../../features/accounts/components/AccountCard';

export default function AccountsPage() {
  const vm = useAccountsViewModel();

  let renderedTotalLiquidity: React.ReactNode;
  let renderedCash: React.ReactNode;
  let renderedSavings: React.ReactNode;
  let renderedCredit: React.ReactNode;
  let renderedUpcoming: React.ReactNode;

  if (vm.showDropdown && vm.displayMode === 'COMMON') {
    const wsBase = vm.metrics.baseCurrency || vm.currency;
    renderedTotalLiquidity = <div className="text-4xl font-extrabold text-gray-900 tracking-tight">{vm.formatCurrency(vm.metrics.totalLiquidity || 0, wsBase)}</div>;
    renderedCash = <div className="text-lg font-bold text-gray-900">{vm.formatCurrency(vm.metrics.cashBalance || 0, wsBase)}</div>;
    renderedSavings = <div className="text-lg font-bold text-gray-900">{vm.formatCurrency((vm.metrics.savingsBalance || 0) + (vm.metrics.checkingBalance || 0), wsBase)}</div>;
    renderedCredit = <div className="text-lg font-bold text-rose-600">{vm.formatCurrency(Math.abs(vm.metrics.creditBalance || 0), wsBase)}</div>;
    renderedUpcoming = <div className="text-lg font-bold text-orange-500">{vm.formatCurrency(vm.metrics.upcomingCharges || 0, wsBase)}</div>;
  } else if (vm.showDropdown && vm.displayMode === 'ALL') {
    const byCurrency = vm.metrics.nativeCashBalances || {};
    renderedTotalLiquidity = (
      <div className="flex flex-col gap-1">
        {Object.keys(byCurrency).map((curr) => (
          <div key={curr} className="text-2xl font-bold text-gray-900 tracking-tight">{vm.formatCurrency(vm.metrics.nativeLiquidity?.[curr] || 0, curr)}</div>
        ))}
      </div>
    );
    renderedCash = (
      <div className="flex flex-col gap-1">
        {Object.keys(byCurrency).map((curr) => (
          <div key={curr} className="text-sm font-bold text-gray-900">{vm.formatCurrency(vm.metrics.nativeCashBalances?.[curr] || 0, curr)}</div>
        ))}
      </div>
    );
    renderedSavings = (
      <div className="flex flex-col gap-1">
        {Object.keys(byCurrency).map((curr) => (
          <div key={curr} className="text-sm font-bold text-gray-900">{vm.formatCurrency((vm.metrics.nativeSavingsBalances?.[curr] || 0) + (vm.metrics.nativeCheckingBalances?.[curr] || 0), curr)}</div>
        ))}
      </div>
    );
    renderedCredit = (
      <div className="flex flex-col gap-1">
        {Object.keys(byCurrency).map((curr) => (
          <div key={curr} className="text-sm font-bold text-rose-600">{vm.formatCurrency(Math.abs(vm.metrics.nativeCreditBalances?.[curr] || 0), curr)}</div>
        ))}
      </div>
    );
    renderedUpcoming = (
      <div className="flex flex-col gap-1">
        {Object.keys(byCurrency).map((curr) => (
          <div key={curr} className="text-sm font-bold text-orange-500">{vm.formatCurrency(vm.metrics.nativeUpcomingCharges?.[curr] || 0, curr)}</div>
        ))}
      </div>
    );
  } else {
    const activeCurrency = vm.showDropdown ? vm.displayMode : (vm.availableCurrencies[0] || vm.currency);
    
    renderedTotalLiquidity = <div className="text-4xl font-extrabold text-gray-900 tracking-tight">{vm.formatCurrency(vm.metrics.nativeLiquidity?.[activeCurrency] || 0, activeCurrency)}</div>;
    renderedCash = <div className="text-lg font-bold text-gray-900">{vm.formatCurrency(vm.metrics.nativeCashBalances?.[activeCurrency] || 0, activeCurrency)}</div>;
    renderedSavings = <div className="text-lg font-bold text-gray-900">{vm.formatCurrency((vm.metrics.nativeSavingsBalances?.[activeCurrency] || 0) + (vm.metrics.nativeCheckingBalances?.[activeCurrency] || 0), activeCurrency)}</div>;
    renderedCredit = <div className="text-lg font-bold text-rose-600">{vm.formatCurrency(Math.abs(vm.metrics.nativeCreditBalances?.[activeCurrency] || 0), activeCurrency)}</div>;
    renderedUpcoming = <div className="text-lg font-bold text-orange-500">{vm.formatCurrency(vm.metrics.nativeUpcomingCharges?.[activeCurrency] || 0, activeCurrency)}</div>;
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Accounts</h1>
          <p className="text-gray-500 mt-1 font-medium">Manage your bank accounts and credit cards.</p>
        </div>
        <div className="flex items-center gap-3">
          {vm.showDropdown && (
            <div className="relative group">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <svg className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <select 
                value={vm.displayMode} 
                onChange={(e) => vm.setDisplayMode(e.target.value)}
                className="pl-9 pr-10 py-2.5 bg-white border border-gray-200 hover:border-gray-300 text-gray-700 text-sm font-bold rounded-xl shadow-[0_2px_10px_rgb(0,0,0,0.02)] focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all cursor-pointer appearance-none"
              >
                <option value="COMMON">Normalized ({vm.metrics?.baseCurrency || vm.currency})</option>
                <option value="ALL">All Currencies</option>
                {vm.availableCurrencies.map((c: string) => <option key={c} value={c}>{c} Only</option>)}
              </select>
              <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                <svg className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          )}
          <button onClick={() => vm.setIsModalOpen(true)} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-all shadow-[0_4px_14px_rgba(37,99,235,0.3)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.4)] hover:-translate-y-0.5">
            <Plus className="w-4 h-4" />
            Link Account
          </button>
        </div>
      </header>

      <StateView 
        state={vm.stateStatus} 
        error={undefined} 
        onRetry={() => {}}
        title="No Accounts Found"
        description="Link your first checking or credit card account to get started."
        className="mt-8"
      >
        <div className="space-y-8">
          <div className="bg-white rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center bg-gradient-to-br from-white to-gray-50/50 gap-6">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Total Liquidity</h2>
              </div>
              {renderedTotalLiquidity}
            </div>
            <div className="hidden md:flex gap-4 min-w-max items-start">
              <div className="px-5 py-3 bg-white rounded-2xl shadow-sm border border-gray-100">
                <div className="text-xs font-bold text-gray-400 uppercase mb-1">Cash</div>
                {renderedCash}
              </div>
              <div className="px-5 py-3 bg-white rounded-2xl shadow-sm border border-gray-100">
                <div className="text-xs font-bold text-gray-400 uppercase mb-1">Saving</div>
                {renderedSavings}
              </div>
              <div className="px-5 py-3 bg-white rounded-2xl shadow-sm border border-gray-100">
                <div className="text-xs font-bold text-gray-400 uppercase mb-1">Credit Debt</div>
                {renderedCredit}
              </div>
              <div className="px-5 py-3 bg-white rounded-2xl shadow-sm border border-orange-100">
                <div className="text-xs font-bold text-orange-400 uppercase mb-1">Upcoming (30d)</div>
                {renderedUpcoming}
              </div>
            </div>
          </div>

          {Object.entries(vm.groupedAccounts)
           .filter(([type]) => !['SYSTEM', 'INCOME', 'EXPENSE', 'OTHER'].includes(type))
           .sort(([typeA], [typeB]) => typeA.localeCompare(typeB))
           .map(([type, typeAccounts]) => (
            <div key={type} className="space-y-4 mt-8">
              <h3 className="text-xl font-bold text-gray-900 tracking-tight capitalize border-b border-gray-100 pb-2">
                {type.replace('_', ' ').toLowerCase()} Accounts
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {typeAccounts.map((account: any) => (
                  <AccountCard 
                    key={account.id}
                    account={account}
                    formatCurrency={vm.formatCurrency}
                    onEdit={(acc) => { vm.setAccountToEdit(acc); vm.setIsEditModalOpen(true); }}
                    onDelete={(acc) => { vm.setAccountToDelete(acc); vm.setIsDeleteModalOpen(true); }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </StateView>

      <AddAccountModal 
        isOpen={vm.isModalOpen}
        onClose={() => vm.setIsModalOpen(false)}
        onSuccess={() => {
          vm.queryClient.invalidateQueries({ queryKey: ['accounts', vm.workspaceId] });
          vm.queryClient.invalidateQueries({ queryKey: ['dashboard', vm.workspaceId] });
        }}
        workspaceId={vm.workspaceId}
      />
      
      {vm.accountToEdit && (
        <EditAccountModal
          isOpen={vm.isEditModalOpen}
          onClose={() => vm.setIsEditModalOpen(false)}
          onSuccess={() => { 
            vm.queryClient.invalidateQueries({ queryKey: ['accounts', vm.workspaceId] }); 
            vm.queryClient.invalidateQueries({ queryKey: ['dashboard', vm.workspaceId] });
            vm.setAccountToEdit(null); 
            vm.setIsEditModalOpen(false); 
          }}
          workspaceId={vm.workspaceId}
          account={vm.accountToEdit as any}
        />
      )}
      
      <ConfirmModal
        isOpen={vm.isDeleteModalOpen}
        onClose={() => vm.setIsDeleteModalOpen(false)}
        onConfirm={vm.handleDelete}
        title="Delete Account"
        message={`Are you sure you want to delete the account "${vm.accountToDelete?.name}"? This action cannot be undone and will hide it from active views.`}
        confirmText="Delete Account"
        isDestructive={true}
        isLoading={vm.isDeleting}
      />
    </div>
  );
}
