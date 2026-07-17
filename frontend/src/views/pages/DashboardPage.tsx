import { motion } from 'framer-motion';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer
} from 'recharts';
import { Wallet, Receipt, Plus, TrendingUp } from 'lucide-react';
import { cn } from '../../utils/cn';
import { StateView } from '../../components/ui/StateView';
import { AddTransactionModal } from '../../components/forms/AddTransactionModal';
import { useDashboardViewModel } from '../../features/dashboard/hooks/useDashboardViewModel';
import { MetricCard } from '../../features/dashboard/components/MetricCard';
import { RecentTransactions } from '../../features/dashboard/components/RecentTransactions';

export default function DashboardPage() {
  const vm = useDashboardViewModel();

  let renderedNetWorth: React.ReactNode;
  let renderedIncome: React.ReactNode;
  let renderedExpense: React.ReactNode;

  if (vm.displayMode === 'COMMON' || !vm.showDropdown || !vm.data) {
    renderedNetWorth = <div className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight drop-shadow-sm">{vm.formatCurrency(vm.data?.netWorth || 0)}</div>;
    renderedIncome = <div className="text-2xl font-bold text-gray-900">{vm.formatCurrency(vm.data?.monthlyIncome || 0)}</div>;
    renderedExpense = <div className="text-2xl font-bold text-rose-600">{vm.formatCurrency(vm.data?.monthlyExpense || 0)}</div>;
  } else if (vm.displayMode === 'ALL') {
    renderedNetWorth = (
      <div className="flex flex-col gap-1">
        {Object.entries(vm.data.nativeNetWorth).map(([curr, val]: [string, any]) => (
          <div key={curr} className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight drop-shadow-sm">{vm.formatCurrency(val, curr)}</div>
        ))}
      </div>
    );
    renderedIncome = (
      <div className="flex flex-col gap-1">
        {Object.entries(vm.data.nativeMonthlyIncome).map(([curr, val]: [string, any]) => (
          <div key={curr} className="text-lg font-bold text-gray-900">{vm.formatCurrency(val, curr)}</div>
        ))}
      </div>
    );
    renderedExpense = (
      <div className="flex flex-col gap-1">
        {Object.entries(vm.data.nativeMonthlyExpense).map(([curr, val]: [string, any]) => (
          <div key={curr} className="text-lg font-bold text-rose-600">{vm.formatCurrency(val, curr)}</div>
        ))}
      </div>
    );
  } else {
    renderedNetWorth = <div className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight drop-shadow-sm">{vm.formatCurrency(vm.data.nativeNetWorth[vm.displayMode] || 0, vm.displayMode)}</div>;
    renderedIncome = <div className="text-2xl font-bold text-gray-900">{vm.formatCurrency(vm.data.nativeMonthlyIncome[vm.displayMode] || 0, vm.displayMode)}</div>;
    renderedExpense = <div className="text-2xl font-bold text-rose-600">{vm.formatCurrency(vm.data.nativeMonthlyExpense[vm.displayMode] || 0, vm.displayMode)}</div>;
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="w-full space-y-8"
    >
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary tracking-tight">Dashboard</h1>
          <p className="text-secondary mt-1 font-medium text-[15px]">Welcome back! Here's your financial overview.</p>
        </div>
        <motion.button 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => vm.setIsModalOpen(true)} 
          className="flex items-center gap-2 px-4 py-2 bg-accent text-white text-[14px] font-semibold rounded-lg transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add Transaction
        </motion.button>
      </header>

      <StateView 
        state={vm.loading ? 'loading' : !vm.dashboard ? 'empty' : 'success'} 
        error={undefined} 
        onRetry={() => {}}
        title="Dashboard Unavailable"
      >
        {vm.data && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                className="lg:col-span-2 glass-panel p-6 flex flex-col"
              >
                <div className="flex justify-between items-end mb-8">
                  <div>
                    <h2 className="text-[15px] font-semibold text-secondary uppercase tracking-wider mb-1">Net Worth</h2>
                    <div className="flex items-center gap-3">
                      <span className="text-3xl font-bold text-primary tracking-tight">{vm.formatCurrency(vm.data.netWorth)}</span>
                    </div>
                  </div>
                  <div className={cn("text-sm font-semibold px-2.5 py-1 rounded-md", vm.isPositiveChange ? "text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10" : "text-rose-500 bg-rose-50 dark:bg-rose-500/10")}>
                    {vm.changeFormatted}
                  </div>
                </div>
                <div className="h-[280px] w-full flex-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={vm.data.cashFlow} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--accent-blue)" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="var(--accent-blue)" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: 'var(--text-secondary)', fontSize: 12, fontWeight: 500}} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: 'var(--text-secondary)', fontSize: 12, fontWeight: 500}} tickFormatter={vm.formatCompact} />
                      <RechartsTooltip 
                        formatter={(value: any) => [vm.formatCurrency(value), 'Balance']} 
                        contentStyle={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)', borderRadius: '12px', boxShadow: 'var(--shadow-surface)', color: 'var(--text-primary)', fontWeight: 600 }} 
                      />
                      <Area 
                        type="monotone" 
                        dataKey="amount" 
                        stroke="var(--accent-blue)" 
                        strokeWidth={3} 
                        fillOpacity={1} 
                        fill="url(#colorAmount)"
                        activeDot={{ r: 6, strokeWidth: 0, fill: 'var(--accent-blue)' }}
                        dot={{ r: 0 }} 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>

              <RecentTransactions 
                transactions={vm.data.recentTransactions} 
                formatCurrency={vm.formatCurrency} 
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <MetricCard 
                title="Total Assets" 
                icon={<Wallet className="w-4 h-4" />} 
                content={renderedNetWorth} 
              />
              <MetricCard 
                title="Income (This Month)" 
                icon={<TrendingUp className="w-4 h-4" />} 
                content={renderedIncome} 
              />
              <MetricCard 
                title="Expenses (This Month)" 
                icon={<Receipt className="w-4 h-4" />} 
                content={renderedExpense} 
              />
            </div>
          </div>
        )}
      </StateView>
      
      <AddTransactionModal 
        isOpen={vm.isModalOpen}
        onClose={() => vm.setIsModalOpen(false)}
        workspaceId={vm.workspaceId}
      />
    </motion.div>
  );
}
