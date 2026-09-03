import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';

interface RecentTransactionsProps {
  transactions: any[];
  formatCurrency: (value: number, sourceCurrency?: string) => string;
}

export function RecentTransactions({ transactions, formatCurrency }: RecentTransactionsProps) {
  const displayTransactions = transactions || [];

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-black/5 dark:bg-white/5 border-b border-border py-4">
        <CardTitle className="text-base">Recent Transactions</CardTitle>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="divide-y divide-border">
          {displayTransactions.length === 0 ? (
            <div className="p-8 text-center text-secondary">
              No recent transactions.
            </div>
          ) : (
            displayTransactions.map((tx: any) => (
              <div key={tx.id} className="px-6 py-4 flex items-center hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors">
                <div className="w-10 h-10 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center mr-4">
                  <span className="text-lg font-medium">{tx.note?.charAt(0) || 'T'}</span>
                </div>
                <div className="flex-1">
                  <div className="font-medium text-[15px]">{tx.note || 'Unnamed'}</div>
                  <div className="text-sm text-secondary mt-0.5">{tx.categoryName || 'Category'}</div>
                </div>
                <div className="font-medium tabular-nums text-primary">
                  {formatCurrency(tx.amount || 0, tx.currency)}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
