import { Plane, Plus } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Trip } from '../api/types';
import { useWorkspace } from '../auth/AuthProvider';
import { Badge } from '../components/ui/Badge';
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
          {list.map((t) => {
            const pct = t.budgetMinor ? (t.spentMinor / t.budgetMinor) * 100 : 0;
            return (
              <li key={t.id}>
                <Link to={`/trips/${t.id}`} className="glass-panel p-5 block">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-10 h-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center shrink-0"><Plane className="w-5 h-5" /></span>
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{t.name}</p>
                        <p className="text-xs text-secondary mt-0.5">{shortDate(t.startDate)} – {shortDate(t.endDate)} · {t.totalDays} day{t.totalDays === 1 ? '' : 's'}</p>
                      </div>
                    </div>
                    <Badge tone={t.status === 'ONGOING' ? 'good' : t.status === 'UPCOMING' ? 'accent' : 'neutral'}>{STATUS[t.status]}</Badge>
                  </div>
                  <p className="text-[28px] leading-tight font-semibold mt-5 tabular-nums tracking-[-0.025em]">{formatMoney(t.spentMinor, baseCurrency)}</p>
                  <p className="text-xs text-secondary mt-1">{t.expenseCount} expense{t.expenseCount === 1 ? '' : 's'}{t.perDayMinor > 0 ? ` · ${formatMoney(t.perDayMinor, baseCurrency)} a day` : ''}</p>
                  {t.budgetMinor && (
                    <div className="mt-4">
                      <ProgressBar value={pct} label={`${t.name} budget`} />
                      <p className="text-xs text-secondary mt-1.5 tabular-nums flex justify-between"><span>{Math.round(pct)}% of budget</span><span>{formatMoney(t.budgetMinor, baseCurrency)}</span></p>
                    </div>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </StateView>
      {creating && <TripForm onClose={() => setCreating(false)} onSaved={(t) => navigate(`/trips/${t.id}`)} />}
    </>
  );
}
