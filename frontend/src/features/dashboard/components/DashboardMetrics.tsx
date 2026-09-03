import { Wallet, CreditCard, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';

interface DashboardMetricsProps {
  metrics: any;
}

export function DashboardMetrics({ metrics }: DashboardMetricsProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-secondary">
            Total Assets
          </CardTitle>
          <Wallet size={16} className="text-secondary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(metrics.cashBalance || 310150)}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-secondary">
            Total Liabilities
          </CardTitle>
          <CreditCard size={16} className="text-secondary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(metrics.creditBalance || 44740)}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-secondary">
            Monthly Cash Flow
          </CardTitle>
          <Activity size={16} className="text-secondary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-emerald-500">+{formatCurrency(4505)}</div>
        </CardContent>
      </Card>
    </div>
  );
}
