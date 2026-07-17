import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Loader2 } from 'lucide-react';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useCreateAccount } from '../../features/accounts/hooks/useAccounts';
interface AddAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  workspaceId: string;
}

export function AddAccountModal({ isOpen, onClose, onSuccess, workspaceId }: AddAccountModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const defaultCurrency = useSettingsStore(state => state.settings.currency) || 'USD';

  const [name, setName] = useState('');
  const [type, setType] = useState('ASSET');
  const [currency, setCurrency] = useState(defaultCurrency);
  const [initialBalance, setInitialBalance] = useState('');

  // Update default currency if it changes
  useEffect(() => {
    if (isOpen) {
      setCurrency(defaultCurrency);
    }
  }, [isOpen, defaultCurrency]);

  useEffect(() => {
    // LIABILITY accounts (credit cards, loans) typically start at 0
    if (type === 'LIABILITY') {
      setInitialBalance('0.00');
    } else {
      setInitialBalance('');
    }
  }, [type]);
  const createMutation = useCreateAccount();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const accountClass = type === 'CASH' ? 'ASSET' : type;
      const subType = type === 'CASH' ? 'CASH' : type;

      const payload = {
        name: name.trim(),
        type: accountClass as any,
        subType: subType,
        currency: currency,
        initialBalance: initialBalance ? Math.round(parseFloat(initialBalance) * 100) : 0
      };

      await createMutation.mutateAsync({ workspaceId, account: payload as any });

      onSuccess();
      onClose();
      // Reset form
      setName('');
      setType('ASSET');
      setCurrency(defaultCurrency);
      setInitialBalance('');
    } catch (err: any) {
      setError(err.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Account">
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

        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-700">Initial Balance</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">
              {currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '₹'}
            </span>
            <input 
              type="number" 
              step="0.01"
              required
              placeholder="0.00"
              value={initialBalance}
              onChange={e => setInitialBalance(e.target.value)}
              className="w-full pl-8 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-gray-900 transition-shadow focus:bg-white focus:shadow-[0_8px_30px_rgb(37,99,235,0.08)]" 
            />
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
            {loading ? 'Creating...' : 'Create Account'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
