import { motion } from 'framer-motion';
import { Receipt } from 'lucide-react';
import { cn } from '../../../utils/cn';

import type { DashboardData } from '../types';

interface RecentTransactionsProps {
  transactions: DashboardData['recentTransactions'];
  formatCurrency: (val: number, currency?: string) => string;
}

export const RecentTransactions = ({ transactions, formatCurrency }: RecentTransactionsProps) => {
  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.2 }}
      className="glass-panel p-6 flex flex-col"
    >
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-[15px] font-semibold text-secondary uppercase tracking-wider">Recent Transactions</h2>
      </div>
      <div className="flex-1 overflow-y-auto space-y-1 pr-2 -mr-2">
        {transactions.length === 0 ? (
            <div className="px-6 py-8 text-center">
              <p className="text-sm font-medium text-gray-500">No recent transactions</p>
            </div>
        ) : (
          transactions.map((tx) => {
            const Icon = tx.icon || Receipt;
            const isIncome = tx.amount > 0;
            return (
              <div key={tx.id} className="flex items-center justify-between group cursor-pointer p-2 -mx-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center text-primary">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[14px] font-semibold text-primary">{typeof tx.payee === 'string' ? tx.payee : tx.payee?.name}</p>
                    <p className="text-[12px] text-secondary font-medium mt-0.5">{tx.date}</p>
                  </div>
                </div>
                <div className={cn("text-[14px] font-bold tracking-tight", isIncome ? "text-emerald-500" : "text-primary")}>
                  {isIncome ? '+' : ''}{formatCurrency(tx.amount, tx.currency)}
                </div>
              </div>
            );
          })
        )}
      </div>
    </motion.div>
  );
};
