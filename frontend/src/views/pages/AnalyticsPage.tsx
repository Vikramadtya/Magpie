import { useState } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, 
  Bar, Legend, PieChart, Pie, Cell, ComposedChart, Line
} from 'recharts';
import { Download, TrendingUp, TrendingDown, Target, Wallet } from 'lucide-react';
import { cn } from '../../utils/cn';
import { StateView } from '../../components/ui/StateView';
import { useSettingsStore, formatCurrencyGlobal } from '../../store/useSettingsStore';

import { useDashboard } from '../../features/dashboard/hooks/useDashboard';


export default function AnalyticsPage() {
  const workspaceId = localStorage.getItem('workspaceId') || '';
  const { data, isLoading: loading, error } = useDashboard(workspaceId, 12);

  const getState = () => {
    if (loading) return 'loading';
    if (error) return 'error';
    if (!data) return 'empty';
    return 'success';
  };

  const currency = useSettingsStore(state => state.settings.currency);
  const formatCurrency = (val: any, sourceCurrency = currency) => formatCurrencyGlobal(Number(val), currency, sourceCurrency);
  const formatCompact = (val: any) => new Intl.NumberFormat(undefined, { notation: 'compact', compactDisplay: 'short', style: 'currency', currency: currency || 'USD' }).format(Number(val) / 100);

  return (
    <div className="w-full space-y-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Analytics Dashboard</h1>
          <p className="text-gray-500 mt-1 font-medium">Deep insights into your financial health.</p>
        </div>
        <button className="flex items-center px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 shadow-[0_2px_10px_rgb(0,0,0,0.02)] transition-colors">
          <Download className="h-4 w-4 mr-2 text-gray-500" />
          Export PDF
        </button>
      </div>

      <StateView 
        state={getState()} 
        error={error?.message} 
        onRetry={() => {}}
        title="Analytics Unavailable"
      >
        {data && (
          <div className="space-y-6">

      {/* Key Metrics Pulse Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Savings Rate" value={`${data.keyMetrics.savingsRate}%`} icon={Target} trend="+2.4%" />
        <MetricCard title="Avg Daily Spend" value={formatCurrency(data.keyMetrics.avgDailySpend)} icon={Wallet} trend="-5.2%" isGood={true} />
        <MetricCard title="Top Category" value={data.categorySpending?.[0]?.name || 'None'} icon={TrendingDown} />
        <MetricCard title="Net Worth" value={formatCurrency(data.netWorth[0]?.balance || 0)} icon={TrendingUp} trend="+12.5%" isGood={true} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Net Worth Trajectory (Span 2 columns) */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6 tracking-tight">Net Worth Trajectory</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.netWorth} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} dy={10} />
                <YAxis tickFormatter={formatCompact} axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                <RechartsTooltip formatter={(value: any) => [formatCurrency(value), 'Net Worth']} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Area type="monotone" dataKey="balance" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorBalance)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Spending by Category (Donut) */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 flex flex-col">
          <h3 className="text-lg font-semibold text-gray-900 mb-6 tracking-tight">Spending by Category</h3>
          <div className="flex-1 min-h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.categorySpending || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="amount"
                  stroke="none"
                >
                  {(data.categorySpending || []).map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color || '#3b82f6'} />
                  ))}
                </Pie>
                <RechartsTooltip formatter={(value: any) => formatCurrency(value)} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
            {(data.categorySpending || []).slice(0, 3).map((cat: any) => (
              <div key={cat.name} className="flex justify-between items-center text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color || '#3b82f6' }} />
                  <span className="text-gray-600">{cat.name}</span>
                </div>
                <span className="font-medium text-gray-900">{formatCurrency(cat.amount)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Cashflow Composite Chart (Span 3) */}
        <div className="lg:col-span-3 bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6 tracking-tight">Cashflow & Savings Trend</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data.cashFlow || []} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} dy={10} />
                <YAxis yAxisId="left" tickFormatter={formatCompact} axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                <YAxis yAxisId="right" orientation="right" tickFormatter={(v: any) => `${v}%`} axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                <RechartsTooltip formatter={(value: any, name: any) => name === 'Savings Rate' ? [`${value}%`, name] : [formatCurrency(value), name]} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                <Bar yAxisId="left" dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar yAxisId="left" dataKey="expense" name="Expense" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Line yAxisId="right" type="monotone" dataKey={(d: any) => d.income ? Math.round(((d.income - d.expense) / d.income) * 100) : 0} name="Savings Rate" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
        </div>
          </div>
        )}
      </StateView>
    </div>
  );
}

function MetricCard({ title, value, icon: Icon, trend, isGood }: any) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <h4 className="text-2xl font-bold text-gray-900 mt-1 tracking-tight">{value}</h4>
        </div>
        <div className="p-2 bg-gray-50 rounded-lg">
          <Icon className="h-5 w-5 text-gray-400" />
        </div>
      </div>
      {trend && (
        <div className="mt-4 flex items-center text-sm">
          <span className={cn("font-medium", isGood ? "text-emerald-600" : "text-rose-600")}>
            {trend}
          </span>
          <span className="text-gray-400 ml-2">vs last month</span>
        </div>
      )}
    </div>
  );
}
