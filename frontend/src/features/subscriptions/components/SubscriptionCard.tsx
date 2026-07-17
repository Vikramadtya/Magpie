import { Repeat, Calendar, MoreVertical, Edit2, Trash2 } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import type { Subscription } from '../api/types';

interface SubscriptionCardProps {
  subscription: Subscription;
  formatCurrency: (val: number, currency?: string) => string;
  onEdit?: (sub: Subscription) => void;
  onDelete?: (sub: Subscription) => void;
}

export const SubscriptionCard = ({ subscription, formatCurrency, onEdit, onDelete }: SubscriptionCardProps) => {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="bg-white rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all group relative">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="font-bold text-gray-900 text-lg tracking-tight">{subscription.name}</h3>
          <div className="flex items-center gap-1.5 mt-1 text-sm font-medium text-gray-500">
            <Calendar className="w-3.5 h-3.5" />
            Next: {new Date(subscription.nextBillingDate).toLocaleDateString()}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Repeat className="w-5 h-5" />
          </div>
          <div className="relative" ref={menuRef}>
            <button 
              onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <MoreVertical className="w-5 h-5" />
            </button>
            
            {showMenu && (
              <div className="absolute right-0 mt-1 w-36 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-10">
                <button 
                  onClick={() => { setShowMenu(false); onEdit?.(subscription); }}
                  className="w-full px-4 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <Edit2 className="w-4 h-4" /> Edit
                </button>
                <button 
                  onClick={() => { setShowMenu(false); onDelete?.(subscription); }}
                  className="w-full px-4 py-2 text-left text-sm font-medium text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" /> Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="flex justify-between items-end pt-2 border-t border-gray-50">
        <div className="text-sm font-semibold text-gray-500">Amount</div>
        <div className="text-2xl font-extrabold text-gray-900">{formatCurrency(subscription.amount, subscription.currency)}</div>
      </div>
    </div>
  );
};
