import { Trash2, Loader2, Store, User } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import { StateView } from '../../components/ui/StateView';
import { Modal } from '../../components/ui/Modal';
import { usePayeesViewModel } from '../../features/payees/hooks/usePayeesViewModel';
import { cn } from '../../utils/cn';

export default function PayeesPage() {
  const vm = usePayeesViewModel();

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 w-full space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Payees & Contacts</h1>
          <p className="text-gray-500 mt-1 font-medium">Manage your organisations and personal contacts.</p>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex bg-gray-100 p-1.5 rounded-2xl w-fit mb-6">
        <button
          onClick={() => vm.setActiveTab('MERCHANT')}
          className={cn(
            "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
            vm.activeTab === 'MERCHANT' ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-900"
          )}
        >
          <Store className="w-4 h-4" />
          Organisations
        </button>
        <button
          onClick={() => vm.setActiveTab('PERSON')}
          className={cn(
            "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
            vm.activeTab === 'PERSON' ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-900"
          )}
        >
          <User className="w-4 h-4" />
          Persons
        </button>
        <button
          onClick={() => vm.setActiveTab('ORGANIZATION')}
          className={cn(
            "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
            vm.activeTab === 'ORGANIZATION' ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-900"
          )}
        >
          <Store className="w-4 h-4" />
          Organizations
        </button>
      </div>

      <StateView 
        state={vm.stateStatus} 
        error={vm.error?.message || null} 
        onRetry={() => vm.refetch()}
        title={vm.error ? "Failed to Load" : `No ${vm.activeTab === 'MERCHANT' ? 'Organisations' : 'Persons'} Found`}
        description={vm.error ? undefined : "Payees are created automatically when you type a new name during a transaction."}
        className="mt-8"
      >
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 max-w-4xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {vm.payees.map((payee: any) => (
              <div key={payee.id} className="group flex items-center justify-between p-4 border border-gray-100 rounded-2xl hover:border-blue-200 hover:shadow-md transition-all cursor-pointer bg-gray-50 hover:bg-white" onClick={() => vm.handleEdit(payee)}>
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-xl shrink-0">
                    {payee.icon || (payee.type === 'PERSON' ? '👤' : '🏪')}
                  </div>
                  <span className="font-bold text-gray-900 truncate">{payee.name}</span>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); vm.handleDelete(payee.id); }}
                  className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 shrink-0"
                  title="Delete Payee"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </StateView>

      <Modal isOpen={!!vm.editingPayee} onClose={() => vm.setEditingPayee(null)} title="Edit Payee">
        <form onSubmit={vm.handleUpdate} className="space-y-5">
          <div className="space-y-2 relative">
            <label className="text-sm font-bold text-gray-700">Icon & Name</label>
            <div className="flex gap-2">
              <button 
                type="button"
                onClick={() => vm.setShowEmojiPicker(!vm.showEmojiPicker)}
                className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xl hover:bg-gray-100 transition-colors"
              >
                {vm.editIcon}
              </button>
              <input type="text" required value={vm.editName} onChange={e => vm.setEditName(e.target.value)} placeholder="Payee Name" className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500" />
            </div>
            {vm.showEmojiPicker && (
              <div className="absolute top-full left-0 mt-2 z-50 shadow-xl rounded-xl">
                <EmojiPicker 
                  onEmojiClick={(e) => { vm.setEditIcon(e.emoji); vm.setShowEmojiPicker(false); }}
                  autoFocusSearch={false}
                />
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">Type</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={vm.editType === 'MERCHANT'} onChange={() => vm.setEditType('MERCHANT')} className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300" />
                <span className="text-sm font-medium text-gray-700">Organisation (Merchant)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={vm.editType === 'PERSON'} onChange={() => vm.setEditType('PERSON')} className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300" />
                <span className="text-sm font-medium text-gray-700">Person</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={vm.editType === 'ORGANIZATION'} onChange={() => vm.setEditType('ORGANIZATION')} className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300" />
                <span className="text-sm font-medium text-gray-700">Organisation</span>
              </label>
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={() => vm.setEditingPayee(null)} className="px-5 py-2.5 font-bold text-gray-700 border rounded-xl hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={vm.saving} className="px-6 py-2.5 font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 flex items-center gap-2">
              {vm.saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Save Changes
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
