import React from 'react';
import { ErrorBoundary as ReactErrorBoundary } from 'react-error-boundary';
import type { FallbackProps } from 'react-error-boundary';
import { AlertTriangle, RefreshCcw } from 'lucide-react';
import { cn } from '../../utils/cn';

// million-ignore
function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 bg-rose-50/50 rounded-3xl border border-rose-100 min-h-[300px] text-center w-full">
      <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mb-6 shadow-sm">
        <AlertTriangle className="w-8 h-8" />
      </div>
      <h2 className="text-xl font-extrabold text-gray-900 mb-2">Something went wrong</h2>
      <p className="text-sm font-medium text-gray-500 max-w-md mb-8">
        {error instanceof Error ? error.message : "An unexpected error occurred in this component."}
      </p>
      <button 
        onClick={resetErrorBoundary}
        className="flex items-center gap-2 px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold rounded-xl transition-all shadow-[0_4px_14px_rgba(225,29,72,0.3)] hover:shadow-[0_6px_20px_rgba(225,29,72,0.4)] hover:-translate-y-0.5"
      >
        <RefreshCcw className="w-4 h-4" />
        Try Again
      </button>
    </div>
  );
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  className?: string;
  onReset?: () => void;
}

// million-ignore
export function ErrorBoundary({ children, className, onReset }: ErrorBoundaryProps) {
  return (
    <div className={cn("w-full", className)}>
      <ReactErrorBoundary
        FallbackComponent={ErrorFallback}
        onReset={onReset}
      >
        {children}
      </ReactErrorBoundary>
    </div>
  );
}
