import { cn } from '../../../utils/cn';

interface TransactionTypeSelectorProps {
  type: 'expense' | 'income' | 'transfer';
  onChange: (type: 'expense' | 'income' | 'transfer') => void;
}

export function TransactionTypeSelector({ type, onChange }: TransactionTypeSelectorProps) {
  const types = ['expense', 'income', 'transfer'] as const;

  return (
    <div className="flex p-1 bg-gray-100/80 rounded-xl gap-1">
      {types.map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => onChange(t)}
          className={cn(
            "flex-1 py-1.5 text-sm font-medium rounded-lg capitalize transition-all duration-200",
            type === t 
              ? "bg-white text-gray-900 shadow-sm ring-1 ring-gray-900/5" 
              : "text-gray-500 hover:text-gray-700"
          )}
        >
          {t}
        </button>
      ))}
    </div>
  );
}
