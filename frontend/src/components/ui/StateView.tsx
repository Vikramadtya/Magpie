import { AlertCircle, RefreshCw, Loader2, FileX } from 'lucide-react';
import { cn } from '../../utils/cn';

interface StateViewProps {
  state: string;
  error?: string | null;
  onRetry?: () => void;
  title?: string;
  description?: string;
  className?: string;
  children?: React.ReactNode;
}

export function StateView({ state, error, onRetry, title, description, className, children }: StateViewProps) {
  if (state === 'success') {
    return <>{children}</>;
  }

  if (state === 'loading') {
    return (
      <div className={cn("w-full h-96 flex flex-col items-center justify-center bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.02)] border border-gray-100", className)}>
        <Loader2 className="w-10 h-10 animate-spin text-blue-500 mb-4" />
        <h3 className="text-lg font-bold text-gray-900 tracking-tight">Loading data...</h3>
        <p className="text-gray-500 mt-1 font-medium text-sm">Please wait while we fetch the latest information.</p>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className={cn("w-full h-96 flex flex-col items-center justify-center bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.02)] border border-gray-100 p-8 text-center", className)}>
        <div className="w-16 h-16 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-500 mb-6 shadow-inner">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 tracking-tight mb-2">{title || 'Connection Failed'}</h3>
        <p className="text-gray-500 font-medium max-w-md mx-auto mb-8">
          {description || error || 'We were unable to securely connect to the backend server. Please verify your connection or try again.'}
        </p>
        
        {onRetry && (
          <button 
            onClick={onRetry}
            className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-[0_4px_14px_rgba(37,99,235,0.3)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.4)] hover:-translate-y-0.5 flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Retry Connection
          </button>
        )}
      </div>
    );
  }

  // empty state
  return (
    <div className={cn("w-full h-96 flex flex-col items-center justify-center bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.02)] border border-gray-100 p-8 text-center", className)}>
      <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 mb-6 shadow-inner">
        <FileX className="w-8 h-8" />
      </div>
      <h3 className="text-xl font-bold text-gray-900 tracking-tight mb-2">{title || 'No Data Found'}</h3>
      <p className="text-gray-500 font-medium max-w-md mx-auto">
        {description || "There is no information to display here yet."}
      </p>
    </div>
  );
}
