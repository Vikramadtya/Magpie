import { Plus, Loader2 } from 'lucide-react';
import { StateView } from '../../components/ui/StateView';
import { Modal } from '../../components/ui/Modal';
import { AddSubscriptionModal } from '../../components/forms/AddSubscriptionModal';
import { EditSubscriptionModal } from '../../components/forms/EditSubscriptionModal';
import { useSubscriptionsViewModel } from '../../features/subscriptions/hooks/useSubscriptionsViewModel';
import { SubscriptionCard } from '../../features/subscriptions/components/SubscriptionCard';

export default function SubscriptionsPage() {
  const vm = useSubscriptionsViewModel();

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Subscriptions</h1>
          <p className="text-gray-500 mt-1 font-medium">Manage your recurring expenses.</p>
        </div>
        <button onClick={() => vm.setIsModalOpen(true)} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-all shadow-[0_4px_14px_rgba(37,99,235,0.3)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.4)] hover:-translate-y-0.5">
          <Plus className="w-4 h-4" />
          Add Subscription
        </button>
      </header>

      <StateView 
        state={vm.stateStatus} 
        error={vm.error?.message || null} 
        onRetry={() => vm.refetch()}
        title={vm.error ? "Subscriptions Unavailable" : "No Subscriptions Active"}
        description={vm.error ? undefined : "You don't have any tracked subscriptions yet."}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vm.subscriptions.map((s) => (
            <SubscriptionCard 
              key={s.id} 
              subscription={s as any} 
              formatCurrency={vm.formatCurrency} 
              onEdit={(sub) => {
                vm.setSubscriptionToEdit(sub);
                vm.setIsEditModalOpen(true);
              }}
              onDelete={(sub) => {
                vm.setSubscriptionToDelete(sub);
                vm.setIsDeleteModalOpen(true);
              }}
            />
          ))}
        </div>
      </StateView>

      <AddSubscriptionModal 
        isOpen={vm.isModalOpen}
        onClose={() => vm.setIsModalOpen(false)}
        workspaceId={vm.workspaceId}
      />

      <EditSubscriptionModal
        isOpen={vm.isEditModalOpen}
        onClose={() => {
          vm.setIsEditModalOpen(false);
          vm.setSubscriptionToEdit(null);
        }}
        workspaceId={vm.workspaceId}
        subscription={vm.subscriptionToEdit}
      />

      <Modal isOpen={vm.isDeleteModalOpen} onClose={() => vm.setIsDeleteModalOpen(false)} title="Delete Subscription">
        <div className="space-y-5">
          <p className="text-gray-600 text-sm">
            Are you sure you want to delete <span className="font-bold text-gray-900">{vm.subscriptionToDelete?.name}</span>? 
            This action cannot be undone and no future transactions will be generated.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <button 
              onClick={() => vm.setIsDeleteModalOpen(false)}
              className="px-5 py-2.5 text-sm font-bold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={vm.handleDelete}
              disabled={vm.isDeleting}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-rose-600 rounded-xl hover:bg-rose-700 transition-colors disabled:opacity-50"
            >
              {vm.isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Delete Subscription
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
