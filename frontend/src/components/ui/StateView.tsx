import { AlertCircle, FileX, RefreshCw } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from './Button';
import { cn } from '../../lib/cn';

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton rounded-2xl', className)} />;
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
      <div className="glass-panel p-10 text-center">
        <span className="mx-auto mb-4 flex w-12 h-12 items-center justify-center rounded-2xl bg-red-500/10 text-red-500"><AlertCircle className="w-6 h-6" /></span>
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
      <div className="glass-panel px-6 py-14 text-center">
        <span className="mx-auto mb-4 flex w-12 h-12 items-center justify-center rounded-2xl bg-accent/10 text-accent"><FileX className="w-6 h-6" /></span>
        <p className="font-semibold mb-1">{emptyTitle ?? 'Nothing here yet'}</p>
        {emptyHint && <p className="text-sm text-secondary mb-5 max-w-sm mx-auto">{emptyHint}</p>}
        {emptyAction}
      </div>
    );
  }
  return <>{children}</>;
}
