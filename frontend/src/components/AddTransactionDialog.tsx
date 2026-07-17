import { X, Calendar, DollarSign, ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../utils/cn';

export default function AddTransactionDialog({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [type, setType] = useState<'expense' | 'income' | 'transfer'>('expense');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
      <div 
        className="absolute inset-0 bg-gray-900/30 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Add Transaction</h2>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Type Selector (Segmented Control style) */}
        <div className="px-6 pt-6 pb-2">
          <div className="flex p-1 bg-gray-100/80 rounded-xl gap-1">
            {(['expense', 'income', 'transfer'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={cn(
                  "flex-1 py-1.5 text-sm font-medium rounded-lg capitalize transition-all duration-200",
                  type === t 
                    ? "bg-white text-gray-900 shadow-sm ring-1 ring-gray-900/5" 
                    : "text-gray-500 hover:text-gray-700"
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Form Body */}
        <div className="px-6 py-4 space-y-5">
          
          {/* Amount (Big Hero input) */}
          <div className="relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition-colors">
              <DollarSign className="w-8 h-8" />
            </div>
            <input 
              type="number" 
              placeholder="0.00"
              className={cn(
                "w-full pl-14 pr-4 py-4 text-4xl font-bold bg-transparent border-0 border-b-2 rounded-none transition-colors",
                type === 'expense' ? "text-gray-900 border-gray-200 focus:border-red-500" :
                type === 'income' ? "text-gray-900 border-gray-200 focus:border-green-500" :
                "text-gray-900 border-gray-200 focus:border-blue-500"
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">Account</label>
              <select className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all">
                <option>Main Checking</option>
                <option>Chase Credit</option>
              </select>
            </div>
            
            {type === 'transfer' ? (
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500">To Account</label>
                <select className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all">
                  <option>Savings</option>
                </select>
              </div>
            ) : (
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500">Category</label>
                <select className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all">
                  <option>Food & Dining</option>
                  <option>Shopping</option>
                </select>
              </div>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500">Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="date" 
                defaultValue={new Date().toISOString().split('T')[0]}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500">Notes</label>
            <textarea 
              placeholder="Add details, tags, etc..."
              rows={2}
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all resize-none"
            />
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50/80 border-t border-gray-100 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shadow-sm">
            Cancel
          </button>
          <button 
            className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-black transition-colors shadow-sm"
          >
            Save Transaction
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
