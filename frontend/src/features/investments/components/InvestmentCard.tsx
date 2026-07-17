import { TrendingUp } from 'lucide-react';
import type { Investment } from '../api/types';

interface InvestmentCardProps {
  investment: Investment;
  formatCurrency: (val: number) => string;
}

export const InvestmentCard = ({ investment, formatCurrency }: InvestmentCardProps) => {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all group">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="font-bold text-gray-900 text-lg tracking-tight">{investment.name}</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-bold uppercase">{investment.ticker}</span>
            <span className="text-xs font-semibold text-gray-400 uppercase">{investment.assetClass}</span>
          </div>
        </div>
        <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
          <TrendingUp className="w-5 h-5" />
        </div>
      </div>
      
      <div className="space-y-4">
        <div className="flex justify-between items-end border-b border-gray-50 pb-4">
          <div className="text-sm font-semibold text-gray-500">Holdings</div>
          <div className="text-right">
            <div className="text-xl font-extrabold text-gray-900">{formatCurrency(investment.quantity * investment.currentPrice / 100)}</div>
            <div className="text-xs font-medium text-gray-400 mt-0.5">{investment.quantity} shares</div>
          </div>
        </div>
        <div className="flex justify-between items-center pt-1">
          <div className="text-sm font-semibold text-gray-500">Current Price</div>
          <div className="text-sm font-bold text-gray-900">{formatCurrency(investment.currentPrice)}</div>
        </div>
      </div>
    </div>
  );
};
