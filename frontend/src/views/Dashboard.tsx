import { useState } from 'react';
import { Plus, TrendingUp, Wallet, CreditCard, Activity } from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { useDashboardViewModel } from '../viewmodels/DashboardViewModel';
import { AddExpenseDialog } from './AddExpenseDialog';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';

export function Dashboard() {
    const { analytics, expenses, isLoading, addExpense } = useDashboardViewModel();
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const handleSaveExpense = (amount: number, categoryId: string, note: string) => {
        addExpense(amount, categoryId, note);
    };

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center bg-background">
                <div className="animate-pulse flex flex-col items-center">
                    <div className="h-12 w-12 rounded-full border-4 border-accent border-t-transparent animate-spin mb-4"></div>
                    <p className="text-secondary font-medium">Loading Dashboard...</p>
                </div>
            </div>
        );
    }

    const netWorthData = analytics?.netWorth || [];
    const metrics = analytics?.keyMetrics || {};
    
    // Format currency
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(value);
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } }
    };

    return (
        <div className="flex-1 bg-background text-primary p-10 overflow-y-auto">
            <motion.div 
                className="max-w-5xl mx-auto"
                initial="hidden"
                animate="visible"
                variants={containerVariants}
            >
                {/* Header */}
                <motion.div variants={itemVariants} className="flex justify-between items-end mb-8">
                    <div>
                        <p className="text-secondary font-medium mb-1">Overview</p>
                        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                    </div>
                    <button 
                        onClick={() => setIsDialogOpen(true)}
                        className="bg-primary text-background hover:opacity-90 px-4 py-2 rounded-lg font-medium flex items-center transition-opacity shadow-sm"
                    >
                        <Plus size={18} className="mr-2" />
                        Add Transaction
                    </button>
                </motion.div>

                {/* Net Worth Chart Card */}
                <motion.div variants={itemVariants} className="glass-panel p-6 mb-6">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h2 className="text-lg font-semibold mb-1">Net Worth</h2>
                            <p className="text-sm text-secondary">Past 12 months</p>
                        </div>
                        <div className="text-right">
                            <div className="text-2xl font-bold tracking-tight">
                                {formatCurrency(metrics.cashBalance - metrics.creditBalance)}
                            </div>
                            <div className="text-sm font-medium text-emerald-500 flex items-center justify-end mt-1">
                                <TrendingUp size={14} className="mr-1" />
                                +12.4%
                            </div>
                        </div>
                    </div>
                    
                    <div className="h-[240px] w-full mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={netWorthData.length > 0 ? netWorthData : [{month: 'Jan', balance: 0}, {month: 'Feb', balance: 1000}]} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="var(--accent-blue)" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="var(--accent-blue)" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <XAxis 
                                    dataKey="month" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
                                    dy={10}
                                />
                                <YAxis 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
                                    tickFormatter={(value) => `$${value / 1000}k`}
                                    dx={-10}
                                />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)', borderRadius: '8px', boxShadow: 'var(--shadow-surface)' }}
                                    itemStyle={{ color: 'var(--text-primary)' }}
                                    formatter={(value: any) => [formatCurrency(value), 'Balance']}
                                />
                                <Area 
                                    type="monotone" 
                                    dataKey="balance" 
                                    stroke="var(--accent-blue)" 
                                    strokeWidth={3}
                                    fillOpacity={1} 
                                    fill="url(#colorBalance)" 
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                {/* Metric Cards Row */}
                <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="glass-panel p-5">
                        <div className="flex items-center text-secondary mb-3">
                            <Wallet size={16} className="mr-2" />
                            <span className="text-sm font-medium">Total Assets</span>
                        </div>
                        <div className="text-2xl font-bold">{formatCurrency(metrics.cashBalance || 310150)}</div>
                    </div>
                    <div className="glass-panel p-5">
                        <div className="flex items-center text-secondary mb-3">
                            <CreditCard size={16} className="mr-2" />
                            <span className="text-sm font-medium">Total Liabilities</span>
                        </div>
                        <div className="text-2xl font-bold">{formatCurrency(metrics.creditBalance || 44740)}</div>
                    </div>
                    <div className="glass-panel p-5">
                        <div className="flex items-center text-secondary mb-3">
                            <Activity size={16} className="mr-2" />
                            <span className="text-sm font-medium">Monthly Cash Flow</span>
                        </div>
                        <div className="text-2xl font-bold text-emerald-500">+{formatCurrency(4505)}</div>
                    </div>
                </motion.div>

                {/* Recent Transactions */}
                <motion.div variants={itemVariants} className="glass-panel overflow-hidden">
                    <div className="px-6 py-4 border-b border-border bg-black/5 dark:bg-white/5">
                        <h3 className="font-semibold">Recent Transactions</h3>
                    </div>
                    
                    <div className="divide-y divide-border">
                        {expenses.length === 0 ? (
                            <div className="p-8 text-center text-secondary">
                                No recent transactions.
                            </div>
                        ) : (
                            expenses.map((expense: any) => (
                                <div key={expense.id} className="px-6 py-4 flex items-center hover:bg-black/[0.02] dark:hover:bg-white [0.02] transition-colors">
                                    <div className="w-10 h-10 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center mr-4">
                                        <span className="text-lg font-medium">{expense.note?.charAt(0) || 'E'}</span>
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-medium text-[15px]">{expense.note || 'Unnamed Expense'}</div>
                                        <div className="text-sm text-secondary mt-0.5">Category</div>
                                    </div>
                                    <div className="font-medium tabular-nums text-primary">
                                        -{formatCurrency(expense.amount || 0)}
                                    </div>
                                </div>
                            ))
                        )}
                        {/* Demo static transaction to make it look full if there are none */}
                        {expenses.length < 3 && (
                            <>
                                <div className="px-6 py-4 flex items-center hover:bg-black/[0.02] dark:hover:bg-white [0.02] transition-colors">
                                    <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center mr-4">
                                        W
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-medium text-[15px]">Whole Foods</div>
                                        <div className="text-sm text-secondary mt-0.5">Groceries</div>
                                    </div>
                                    <div className="font-medium tabular-nums">
                                        -{formatCurrency(245.50)}
                                    </div>
                                </div>
                                <div className="px-6 py-4 flex items-center hover:bg-black/[0.02] dark:hover:bg-white [0.02] transition-colors">
                                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mr-4">
                                        P
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-medium text-[15px]">Paycheck</div>
                                        <div className="text-sm text-secondary mt-0.5">Income</div>
                                    </div>
                                    <div className="font-medium tabular-nums text-emerald-500">
                                        +{formatCurrency(4910.00)}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </motion.div>

                <AddExpenseDialog 
                    isOpen={isDialogOpen} 
                    onClose={() => setIsDialogOpen(false)} 
                    onSave={handleSaveExpense} 
                />
            </motion.div>
        </div>
    );
}
