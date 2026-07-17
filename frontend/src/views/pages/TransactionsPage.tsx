import { Search, Filter, Download } from 'lucide-react';
import { StateView } from '../../components/ui/StateView';
import { AddTransactionModal } from '../../components/forms/AddTransactionModal';
import { EditTransactionModal } from '../../components/forms/EditTransactionModal';
import { DeleteConfirmationModal } from '../../components/ui/DeleteConfirmationModal';
import { TransactionCommentsSidebar } from '../../components/ui/TransactionCommentsSidebar';
import { useTransactionsViewModel } from '../../features/transactions/hooks/useTransactionsViewModel';
import { TransactionList } from '../../features/transactions/components/TransactionList';

export default function TransactionsPage() {
  const vm = useTransactionsViewModel();

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Transactions</h1>
          <p className="text-gray-500 mt-1 font-medium">Your complete financial ledger.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={vm.handleExport} className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 text-sm font-bold rounded-xl shadow-[0_2px_10px_rgb(0,0,0,0.02)] hover:bg-gray-50 transition-colors">
            <Download className="w-4 h-4" />
            Export
          </button>
          <button onClick={() => vm.setIsModalOpen(true)} className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-all shadow-[0_4px_14px_rgba(37,99,235,0.3)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.4)] hover:-translate-y-0.5">
            Add Transaction
          </button>
        </div>
      </header>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search payee, category, or amount..." 
            value={vm.searchQuery}
            onChange={(e) => vm.setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border-0 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none font-medium text-gray-900 placeholder-gray-400 transition-shadow focus:shadow-[0_8px_30px_rgb(37,99,235,0.1)]"
          />
        </div>
        
        <select 
          value={vm.selectedAccountId}
          onChange={(e) => vm.setSelectedAccountId(e.target.value)}
          className="px-4 py-2.5 bg-white border-0 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-xl text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
        >
          <option value="ALL">All Accounts</option>
          {vm.accounts.map(acc => (
            <option key={acc.id} value={acc.id}>{acc.name} ({acc.type})</option>
          ))}
        </select>

        <button className="flex items-center gap-2 px-4 py-2.5 bg-white text-gray-700 text-sm font-bold rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:bg-gray-50 transition-colors">
          <Filter className="w-4 h-4" />
          Filters
        </button>
      </div>

      <StateView 
        state={vm.stateStatus} 
        error={undefined} 
        onRetry={() => {}} 
        title="No Transactions Found"
        description="Add your first transaction to see your ledger here."
      >
        <TransactionList 
          grouped={vm.grouped}
          groupDates={vm.groupDates}
          groupCounts={vm.groupCounts}
          formatCurrency={vm.formatCurrency}
          onEdit={(tx) => vm.setTransactionToEdit(tx)}
          onDelete={(tx) => { vm.setTransactionToDelete(tx); vm.setIsDeleteModalOpen(true); }}
          onComments={(tx) => vm.setSelectedTransactionForComments(tx)}
        />
      </StateView>

      <AddTransactionModal 
        isOpen={vm.isModalOpen}
        onClose={() => vm.setIsModalOpen(false)}
        workspaceId={vm.workspaceId}
      />

      {vm.transactionToEdit && (
        <EditTransactionModal 
          isOpen={true}
          onClose={() => vm.setTransactionToEdit(null)}
          workspaceId={vm.workspaceId}
          transaction={vm.transactionToEdit}
        />
      )}

      <DeleteConfirmationModal 
        isOpen={vm.isDeleteModalOpen}
        onClose={() => vm.setIsDeleteModalOpen(false)}
        onConfirm={vm.handleDelete}
        loading={vm.isDeleting}
        title="Delete Transaction"
        message={`Are you sure you want to delete this transaction for ${vm.transactionToDelete?.payee?.name || 'Unknown'}? This will also remove the corresponding journal entries and update your account balances.`}
      />

      <TransactionCommentsSidebar 
        transaction={vm.selectedTransactionForComments}
        isOpen={vm.selectedTransactionForComments !== null}
        onClose={() => vm.setSelectedTransactionForComments(null)}
      />
    </div>
  );
}
