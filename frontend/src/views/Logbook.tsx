import { BookOpen } from 'lucide-react';
import { format } from 'date-fns';
import { useDashboardViewModel } from '../viewmodels/DashboardViewModel';

export function Logbook() {
    const { expenses, isLoading } = useDashboardViewModel();

    return (
        <div className="main-content">
            <div className="header-title">
                <BookOpen className="header-icon" size={28} />
                Logbook
            </div>

            {isLoading && <p style={{ color: 'var(--text-secondary)' }}>Loading history...</p>}

            {!isLoading && expenses.length === 0 && (
                <p style={{ color: 'var(--text-secondary)' }}>No expenses in the logbook yet.</p>
            )}

            {!isLoading && expenses.length > 0 && (
                <div className="list-group">
                    <div className="list-group-title">All Transactions</div>
                    
                    {expenses.map((expense: any) => (
                        <div key={expense.id} className="list-item">
                            <div className="checkbox-circle logbook-check">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                            </div>
                            <div className="item-title" style={{ color: 'var(--text-secondary)', textDecoration: 'line-through' }}>
                                {expense.note || 'Unnamed Expense'}
                            </div>
                            <div className="item-meta">
                                ${expense.amount?.toFixed(2) || '0.00'}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
