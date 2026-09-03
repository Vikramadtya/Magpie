import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/Card';
import { TrendingUp } from 'lucide-react';

interface NetWorthChartProps {
  data: any[];
  currentBalance: number;
}

export function NetWorthChart({ data, currentBalance }: NetWorthChartProps) {
  const chartData = data.length > 0 ? data : [{ month: 'Jan', balance: 0 }, { month: 'Feb', balance: 1000 }];
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Card className="mb-6">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="space-y-1">
          <CardTitle>Net Worth</CardTitle>
          <CardDescription>Past 12 months</CardDescription>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold tracking-tight">
            {formatCurrency(currentBalance)}
          </div>
          <div className="text-sm font-medium text-emerald-500 flex items-center justify-end mt-1">
            <TrendingUp size={14} className="mr-1" />
            +12.4%
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[240px] w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--accent-blue)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--accent-blue)" stopOpacity={0} />
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
      </CardContent>
    </Card>
  );
}
