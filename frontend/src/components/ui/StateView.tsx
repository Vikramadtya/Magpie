import { AlertCircle, FileX, RefreshCw } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from './Button';
import { cn } from '../../lib/cn';

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton rounded-2xl', className)} />;
}

/** Placeholder rows shaped like a real list row (round badge, two lines, an amount). */
export function SkeletonRows({ rows = 6 }: { rows?: number }) {
  return (
    <div className="glass-panel divide-y divide-border/60" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3.5 px-5 py-3.5">
          <Skeleton className="w-9 h-9 !rounded-full shrink-0" />
          <div className="flex-1 space-y-2"><Skeleton className="h-3.5 w-1/3 !rounded-md" /><Skeleton className="h-3 w-1/2 !rounded-md" /></div>
          <Skeleton className="h-4 w-16 !rounded-md" />
        </div>
      ))}
    </div>
  );
}

/** A card-shaped placeholder with a heading line and a few body lines. */
export function SkeletonCard({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('glass-panel p-5 space-y-3', className)} aria-busy="true" aria-label="Loading">
      <Skeleton className="h-4 w-1/3 !rounded-md" />
      {Array.from({ length: lines }, (_, i) => <Skeleton key={i} className="h-3 !rounded-md" />)}
    </div>
  );
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
          <SkeletonRows rows={5} />
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
