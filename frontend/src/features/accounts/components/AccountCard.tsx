import React from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import type { Account } from '../../../types/models';

interface AccountCardProps {
  account: Account;
  formatCurrency: (val: number, currency: string) => string;
  onEdit: (account: Account) => void;
  onDelete: (account: Account) => void;
}

export const AccountCard = ({ account, formatCurrency, onEdit, onDelete }: AccountCardProps) => {
  return (
    <div 
      className="relative rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_12px_40px_rgb(0,0,0,0.16)] transition-all hover:-translate-y-1 text-white bg-gradient-to-br from-blue-600 to-indigo-700 overflow-hidden group cursor-pointer"
    >
      <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity" />
      <div className="absolute -right-10 -top-10 w-40 h-40 bg-white opacity-10 rounded-full blur-2xl group-hover:opacity-20 transition-opacity" />
      
      <div className="relative z-10 flex flex-col h-full justify-between min-h-[160px]">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-bold text-lg tracking-tight shadow-sm opacity-90">{account.name}</h3>
            <p className="text-xs font-semibold uppercase tracking-wider opacity-70 mt-1">{(account.type || '').replace('_', ' ')}</p>
          </div>
          <div className="flex items-center gap-2 relative z-20">
            <button 
              onClick={(e) => { e.stopPropagation(); onEdit(account); }}
              className="p-1.5 hover:bg-white/20 rounded-lg transition-colors opacity-80 hover:opacity-100"
              title="Edit Account"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onDelete(account); }}
              className="p-1.5 hover:bg-white/20 rounded-lg transition-colors opacity-80 hover:opacity-100"
              title="Delete Account"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        <div className="mt-8">
          <p className="text-xs font-semibold uppercase tracking-wider opacity-70 mb-1">
            {account.type === 'LIABILITY' ? 'Pending Balance' : 'Available Balance'}
          </p>
          <div className="text-3xl font-extrabold tracking-tight drop-shadow-sm">
            {formatCurrency(account.balance, account.currency)}
          </div>
        </div>
      </div>
    </div>
  );
};
