import { lazy, Suspense, type ComponentType, type LazyExoticComponent } from 'react';
import { NavLink, Navigate, useParams } from 'react-router-dom';
import { cn } from '../lib/cn';
import { Skeleton } from '../components/ui/StateView';
import { PLAN_TABS, WEALTH_TABS } from '../components/layout/nav';

const PAGES: Record<string, LazyExoticComponent<ComponentType>> = {
  budgets: lazy(() => import('./BudgetsPage')),
  goals: lazy(() => import('./GoalsPage')),
  recurring: lazy(() => import('./RecurringPage')),
  trips: lazy(() => import('./TripsPage')),
  accounts: lazy(() => import('./AccountsPage')),
  investments: lazy(() => import('./InvestmentsPage')),
  assets: lazy(() => import('./AssetsPage')),
  loans: lazy(() => import('./LoansPage')),
};

interface Tab { key: string; label: string; icon: ComponentType<{ className?: string }> }

/** A section whose pages are tabs along the top: one place in the menu, several screens inside. */
function Section({ base, tabs }: { base: string; tabs: readonly Tab[] }) {
  const { tab } = useParams();
  const current = tabs.find((t) => t.key === tab);
  if (!current) return <Navigate to={`${base}/${tabs[0].key}`} replace />;
  const Page = PAGES[current.key];
  return (
    <>
      <nav aria-label="Sections" className="-mt-2 mb-6 flex gap-1 overflow-x-auto pb-1">
        {tabs.map((t) => (
          <NavLink
            key={t.key}
            to={`${base}/${t.key}`}
            className={({ isActive }) =>
              cn('inline-flex items-center gap-2 px-3.5 h-9 rounded-full text-body font-medium whitespace-nowrap transition-colors', isActive ? 'bg-primary text-background' : 'text-secondary hover:text-primary hover:bg-primary/[0.06]')
            }
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </NavLink>
        ))}
      </nav>
      <Suspense fallback={<div className="space-y-3"><Skeleton className="h-10 w-48" /><Skeleton className="h-40" /></div>}>
        <Page />
      </Suspense>
    </>
  );
}

export const PlanPage = () => <Section base="/plan" tabs={PLAN_TABS} />;
export const WealthPage = () => <Section base="/wealth" tabs={WEALTH_TABS} />;
