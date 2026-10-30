import { Plane, Plus } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Trip } from '../api/types';
import { useWorkspace } from '../auth/AuthProvider';
import { Button } from '../components/ui/Button';
import { PageHeader } from '../components/ui/PageHeader';
import { ProgressBar } from '../components/ui/ProgressBar';
import { StateView } from '../components/ui/StateView';
import { TripForm } from '../features/trips/TripForm';
import { useTrips } from '../hooks/useTrips';
import { cn } from '../lib/cn';
import { shortDate } from '../lib/dates';
import { formatMoney } from '../lib/money';

const STATUS: Record<Trip['status'], string> = { UPCOMING: 'Upcoming', ONGOING: 'On now', PAST: 'Past' };

export default function TripsPage() {
  const { canEdit, baseCurrency } = useWorkspace();
  const trips = useTrips();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const list = trips.data ?? [];

  return (
    <>
      <PageHeader
        title="Trips"
        subtitle="What a trip really cost you, across all your accounts, in your main currency"
        actions={canEdit && <Button onClick={() => setCreating(true)}><Plus className="w-4 h-4 mr-2" />New trip</Button>}
      />
      <StateView
        isLoading={trips.isLoading}
        error={trips.error}
        onRetry={() => void trips.refetch()}
        isEmpty={list.length === 0}
        emptyTitle="No trips yet"
        emptyHint="Create a trip, then add the expenses that belong to it. You'll see the real total, cost per day compared with a normal day, and where the money went."
        emptyAction={canEdit && <Button onClick={() => setCreating(true)}>Plan a trip</Button>}
      >
        <ul className="grid md:grid-cols-2 gap-4">
          {list.map((t) => (
            <li key={t.id}>
              <Link to={`/trips/${t.id}`} className="glass-panel p-5 block hover:border-accent transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold flex items-center gap-2"><Plane className="w-4 h-4 text-accent" />{t.name}</p>
                    <p className="text-xs text-secondary mt-0.5">{shortDate(t.startDate)} – {shortDate(t.endDate)} · {t.totalDays} day{t.totalDays === 1 ? '' : 's'}</p>
                  </div>
                  <span className={cn('text-xs px-2 py-0.5 rounded-full', t.status === 'ONGOING' ? 'bg-green-500/15 text-green-600 dark:text-green-400' : 'bg-black/5 dark:bg-white/10 text-secondary')}>{STATUS[t.status]}</span>
                </div>
                <p className="text-2xl font-bold mt-3 tabular-nums">{formatMoney(t.spentMinor, baseCurrency)}</p>
                <p className="text-xs text-secondary">{t.expenseCount} expense{t.expenseCount === 1 ? '' : 's'}{t.perDayMinor > 0 ? ` · ${formatMoney(t.perDayMinor, baseCurrency)} a day` : ''}</p>
                {t.budgetMinor && (
                  <div className="mt-3">
                    <ProgressBar value={(t.spentMinor / t.budgetMinor) * 100} label={`${t.name} budget`} />
                    <p className="text-xs text-secondary mt-1 tabular-nums">of {formatMoney(t.budgetMinor, baseCurrency)} budget</p>
                  </div>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </StateView>
      {creating && <TripForm onClose={() => setCreating(false)} onSaved={(t) => navigate(`/trips/${t.id}`)} />}
    </>
  );
}
