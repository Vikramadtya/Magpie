import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Loader2 } from 'lucide-react';
import { useUpdateAccount } from '../../features/accounts/hooks/useAccounts';
interface EditAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  workspaceId: string;
  account: { id: string; name: string; type: string; subType?: string; currency: string } | null;
}

export function EditAccountModal({ isOpen, onClose, onSuccess, workspaceId, account }: EditAccountModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [type, setType] = useState('ASSET');
  const [currency, setCurrency] = useState('USD');

  useEffect(() => {
    if (account) {
      setName(account.name);
      setType(account.subType === 'CASH' ? 'CASH' : account.type);
      setCurrency(account.currency);
    }
  }, [account]);

  const updateMutation = useUpdateAccount();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account) return;
    
    setLoading(true);
    setError(null);

    try {
      const payload = {
        name: name.trim(),
        type: type,
        currency: currency
      };

      await updateMutation.mutateAsync({ workspaceId, accountId: account.id, account: payload });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Account">
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl text-sm font-bold border border-rose-100">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-700">Account Name</label>
          <input 
            type="text" 
            required
            placeholder="e.g. Chase Sapphire"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-gray-900 transition-shadow focus:bg-white focus:shadow-[0_8px_30px_rgb(37,99,235,0.08)]" 
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">Account Type</label>
            <select 
              value={type}
              onChange={e => setType(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-gray-900 transition-shadow focus:bg-white"
            >
              <option value="ASSET">Checking / Savings (Asset)</option>
              <option value="CASH">Cash (Asset)</option>
              <option value="LIABILITY">Credit Card / Loan (Liability)</option>
              <option value="EQUITY">Equity / Investment</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">Currency</label>
            <select 
              value={currency}
              onChange={e => setCurrency(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-gray-900 transition-shadow focus:bg-white"
            >
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="INR">INR (₹)</option>
            </select>
          </div>
        </div>

        <div className="pt-4 flex justify-end gap-3">
          <button 
            type="button" 
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-bold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            disabled={loading}
            className="px-6 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-all shadow-[0_4px_14px_rgba(37,99,235,0.3)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.4)] hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none flex items-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
