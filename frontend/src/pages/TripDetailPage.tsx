import { ArrowLeft } from 'lucide-react';
import { lazy, Suspense, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useWorkspace } from '../auth/AuthProvider';
import { FxWarning } from '../components/FxWarning';
import { Button } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { PageHeader } from '../components/ui/PageHeader';
import { ProgressBar } from '../components/ui/ProgressBar';
import { Skeleton, StateView } from '../components/ui/StateView';
import { Stat } from '../components/ui/Stat';
import { TripForm } from '../features/trips/TripForm';
import { useAssignRange, useClearTrip, useDeleteTrip, useTrip } from '../hooks/useTrips';
import { cn } from '../lib/cn';
import { prettyDate, shortDate } from '../lib/dates';
import { formatMoney } from '../lib/money';

const SimpleBars = lazy(() => import('../components/charts/SimpleBars'));

export default function TripDetailPage() {
  const { id } = useParams();
  const { canEdit } = useWorkspace();
  const navigate = useNavigate();
  const detail = useTrip(id);
  const addRange = useAssignRange();
  const clear = useClearTrip();
  const del = useDeleteTrip();
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState<'clear' | 'delete' | null>(null);
  const d = detail.data;
  const t = d?.trip;

  return (
    <>
      <p className="text-sm mb-3"><Link to="/trips" className="text-secondary hover:text-primary inline-flex items-center gap-1"><ArrowLeft className="w-4 h-4" />All trips</Link></p>
      <PageHeader
        title={t?.name ?? 'Trip'}
        subtitle={t ? `${prettyDate(t.startDate)} – ${prettyDate(t.endDate)} · ${t.totalDays} day${t.totalDays === 1 ? '' : 's'}` : undefined}
        actions={t && canEdit && <><Button variant="outline" size="sm" onClick={() => setEditing(true)}>Edit</Button><Button variant="outline" size="sm" onClick={() => setConfirm('delete')}>Delete</Button></>}
      />
      <StateView isLoading={detail.isLoading} error={detail.error} onRetry={() => void detail.refetch()} skeleton={<Skeleton className="h-40" />}>
        {d && t && (
          <div className="space-y-6">
            <FxWarning currencies={d.missingCurrencies} base={d.currency} />

            {canEdit && d.unassignedInRange > 0 && (
              <div className="glass-panel p-4 flex flex-wrap items-center justify-between gap-3 border-accent/40">
                <p className="text-sm">{d.unassignedInRange} expense{d.unassignedInRange === 1 ? ' is' : 's are'} dated within this trip but not added to it yet. Recurring bills like rent are left out.</p>
                <Button size="sm" disabled={addRange.isPending} onClick={() => addRange.mutate(t.id, { onSuccess: (r) => toast.success(`Added ${r.affected} expenses`) })}>Add them</Button>
              </div>
            )}

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="hero-card p-6 col-span-2 flex flex-col justify-between gap-5">
                <div>
                  <p className="text-[13px] font-medium text-white/60">Total cost</p>
                  <p className="text-4xl font-semibold mt-1.5 tabular-nums tracking-[-0.03em]">{formatMoney(t.spentMinor, d.currency)}</p>
                </div>
                <p className="text-xs text-white/60">{t.expenseCount} expense{t.expenseCount === 1 ? '' : 's'} · {formatMoney(t.perDayMinor, d.currency)} a day{d.normalDailyMinor > 0 ? `, ${(t.perDayMinor / d.normalDailyMinor).toFixed(1)}× your normal ${formatMoney(d.normalDailyMinor, d.currency)}` : ''}</p>
              </div>
              <Stat label={t.status === 'ONGOING' ? 'On track for' : 'Final'} value={formatMoney(d.projectedMinor, d.currency)} footer={t.status === 'ONGOING' ? `day ${t.daysSoFar} of ${t.totalDays}` : t.status === 'UPCOMING' ? 'not started' : 'trip finished'} />
              <Stat
                label="Budget"
                value={t.budgetMinor && d.budgetRemainingMinor != null ? (d.budgetRemainingMinor < 0 ? `${formatMoney(-d.budgetRemainingMinor, d.currency)} over` : `${formatMoney(d.budgetRemainingMinor, d.currency)} left`) : 'None'}
                tone={d.budgetRemainingMinor != null && d.budgetRemainingMinor < 0 ? 'expense' : undefined}
                footer={t.budgetMinor ? <div className="w-full"><ProgressBar value={(t.spentMinor / t.budgetMinor) * 100} label="Budget used" /></div> : 'No budget set'}
              />
            </div>

            {t.expenseCount === 0 ? (
              <div className="glass-panel p-8 text-center text-sm text-secondary">
                Nothing on this trip yet. Pick the trip when you add an expense, use the plane icon on a transaction, or select several on the Transactions page and choose “Add to trip”.
              </div>
            ) : (
              <>
                <section className="glass-panel p-5">
                  <h2 className="font-semibold mb-1">Spending by day</h2>
                  <Suspense fallback={<Skeleton className="h-56" />}>
                    <SimpleBars data={d.days.map((x) => ({ label: shortDate(x.date), value: x.totalMinor }))} currency={d.currency} label="Spent" />
                  </Suspense>
                </section>

                <div className="grid lg:grid-cols-2 gap-6">
                  <section className="glass-panel p-5">
                    <h2 className="font-semibold mb-3">Where it went</h2>
                    <ul className="space-y-3">
                      {d.categories.map((c) => (
                        <li key={c.name}>
                          <div className="flex justify-between text-sm mb-1"><span>{c.name}</span><span className="tabular-nums">{formatMoney(c.totalMinor, d.currency)} · {c.percent}%</span></div>
                          <ProgressBar tone="accent" value={c.percent} label={c.name} />
                        </li>
                      ))}
                    </ul>
                  </section>
                  <section className="glass-panel p-5">
                    <h2 className="font-semibold mb-1">By currency</h2>
                    <p className="text-xs text-secondary mb-3">What you paid locally, and what it was worth at home</p>
                    <ul className="divide-y divide-border text-sm">
                      {d.currencies.map((c) => (
                        <li key={c.currency} className="py-2 flex justify-between gap-3">
                          <span>{c.currency} <span className="text-xs text-secondary">· {c.count} expense{c.count === 1 ? '' : 's'}</span></span>
                          <span className="tabular-nums text-right">{formatMoney(c.localMinor, c.currency)}{c.currency !== d.currency && <span className="text-xs text-secondary"> ≈ {formatMoney(c.baseMinor, d.currency)}</span>}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                </div>

                <section className="glass-panel p-5">
                  <div className="flex justify-between items-center mb-3">
                    <h2 className="font-semibold">Biggest purchases</h2>
                    <Link to={`/transactions?trip=${t.id}`} className="text-sm text-accent">View all</Link>
                  </div>
                  <ul className="divide-y divide-border text-sm">
                    {d.largest.map((p) => (
                      <li key={p.id} className="py-2 flex justify-between gap-3">
                        <span>{p.name} <span className="text-xs text-secondary">· {p.category} · {shortDate(p.date)}</span></span>
                        <span className="tabular-nums text-right">{formatMoney(p.baseMinor, d.currency)}{p.localCurrency !== d.currency && <span className="text-xs text-secondary"> ({formatMoney(p.localMinor, p.localCurrency)})</span>}</span>
                      </li>
                    ))}
                  </ul>
                </section>

                {canEdit && <div><Button variant="ghost" size="sm" onClick={() => setConfirm('clear')}>Remove all expenses from this trip</Button></div>}
              </>
            )}
          </div>
        )}
      </StateView>

      {editing && t && <TripForm trip={t} onClose={() => setEditing(false)} />}
      <ConfirmDialog
        open={confirm === 'clear'}
        title="Remove all expenses from this trip?"
        message="The expenses stay in your ledger; they just stop counting towards the trip."
        confirmLabel="Remove"
        onCancel={() => setConfirm(null)}
        onConfirm={() => { if (t) clear.mutate(t.id); setConfirm(null); }}
      />
      <ConfirmDialog
        open={confirm === 'delete'}
        title={`Delete "${t?.name}"?`}
        message="The trip is deleted. Its expenses stay in your ledger."
        onCancel={() => setConfirm(null)}
        onConfirm={() => { if (t) del.mutate(t.id, { onSuccess: () => navigate('/trips') }); setConfirm(null); }}
      />
    </>
  );
}
