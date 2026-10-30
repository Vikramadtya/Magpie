import { AlertCircle, FileX, RefreshCw } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from './Button';
import { cn } from '../../lib/cn';

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-lg bg-black/5 dark:bg-white/10', className)} />;
}

interface Props {
  isLoading: boolean;
  error?: unknown;
  isEmpty?: boolean;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyHint?: string;
  emptyAction?: ReactNode;
  skeleton?: ReactNode;
  children: ReactNode;
}

/** One place for the loading / error / empty / content states every list screen needs. */
export function StateView({ isLoading, error, isEmpty, onRetry, emptyTitle, emptyHint, emptyAction, skeleton, children }: Props) {
  if (isLoading) {
    return (
      <>
        {skeleton ?? (
          <div className="space-y-3" aria-busy="true">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        )}
      </>
    );
  }
  if (error) {
    return (
      <div className="glass-panel p-8 text-center">
        <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-3" />
        <p className="font-medium mb-1">Couldn't load this</p>
        <p className="text-sm text-secondary mb-4">Check your connection and try again.</p>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RefreshCw className="w-4 h-4 mr-2" /> Retry
          </Button>
        )}
      </div>
    );
  }
  if (isEmpty) {
    return (
      <div className="glass-panel p-10 text-center">
        <FileX className="w-8 h-8 text-secondary mx-auto mb-3" />
        <p className="font-medium mb-1">{emptyTitle ?? 'Nothing here yet'}</p>
        {emptyHint && <p className="text-sm text-secondary mb-4">{emptyHint}</p>}
        {emptyAction}
      </div>
    );
  }
  return <>{children}</>;
}
