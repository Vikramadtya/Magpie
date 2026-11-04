import { lazy } from 'react';
import { createBrowserRouter, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './auth/AuthProvider';
import AppLayout from './components/layout/AppLayout';
import { RouteError } from './components/RouteError';

const lazyPage = <T extends { default: React.ComponentType }>(load: () => Promise<T>) => lazy(load);

const LandingPage = lazyPage(() => import('./pages/LandingPage'));
const LoginPage = lazyPage(() => import('./auth/LoginPage'));
const AuthCallback = lazyPage(() => import('./auth/AuthCallback'));
const DashboardPage = lazyPage(() => import('./pages/DashboardPage'));
const TransactionsPage = lazyPage(() => import('./pages/TransactionsPage'));
const AccountsPage = lazyPage(() => import('./pages/AccountsPage'));
const BudgetsPage = lazyPage(() => import('./pages/BudgetsPage'));
const GoalsPage = lazyPage(() => import('./pages/GoalsPage'));
const RecurringPage = lazyPage(() => import('./pages/RecurringPage'));
const InvestmentsPage = lazyPage(() => import('./pages/InvestmentsPage'));
const AssetsPage = lazyPage(() => import('./pages/AssetsPage'));
const AnalyticsPage = lazyPage(() => import('./pages/AnalyticsPage'));
const LoansPage = lazyPage(() => import('./pages/LoansPage'));
const RefundsPage = lazyPage(() => import('./pages/RefundsPage'));
const InboxPage = lazyPage(() => import('./pages/InboxPage'));
const TripsPage = lazyPage(() => import('./pages/TripsPage'));
const HouseholdPage = lazyPage(() => import('./pages/HouseholdPage'));
const TripDetailPage = lazyPage(() => import('./pages/TripDetailPage'));
const CategoriesPage = lazyPage(() => import('./pages/CategoriesPage'));
const PayeesPage = lazyPage(() => import('./pages/PayeesPage'));
const ImportPage = lazyPage(() => import('./pages/ImportPage'));
const SettingsPage = lazyPage(() => import('./pages/SettingsPage'));

function Splash() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center" role="status" aria-label="Loading">
      <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

/** The server did not answer; the session is probably fine, so offer another try instead of the login page. */
function Unreachable() {
  const { retry } = useAuth();
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center gap-4 px-4 text-center" role="alert">
      <h1 className="text-xl font-semibold">Can't reach Keeper right now</h1>
      <p className="text-sm text-secondary max-w-sm">The server may still be waking up. You are still signed in, so nothing is lost.</p>
      <button type="button" onClick={retry} className="h-11 px-5 rounded-xl bg-accent text-white font-medium">Try again</button>
    </div>
  );
}

function RequireAuth() {
  const { status } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <Splash />;
  if (status === 'unreachable') return <Unreachable />;
  if (status === 'anon') return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  return <AppLayout />;
}

/** Signed-in visitors skip the marketing page. */
function Landing() {
  const { status } = useAuth();
  if (status === 'loading') return <Splash />;
  if (status === 'authed') return <Navigate to="/dashboard" replace />;
  return <LandingPage />;
}

export const router = createBrowserRouter([
  { errorElement: <RouteError />, children: [
  { path: '/', element: <Landing /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/auth/callback', element: <AuthCallback /> },
  {
    element: <RequireAuth />,
    children: [
      { path: '/dashboard', element: <DashboardPage /> },
      { path: '/transactions', element: <TransactionsPage /> },
      { path: '/accounts', element: <AccountsPage /> },
      { path: '/budgets', element: <BudgetsPage /> },
      { path: '/goals', element: <GoalsPage /> },
      { path: '/recurring', element: <RecurringPage /> },
      { path: '/loans', element: <LoansPage /> },
      { path: '/refunds', element: <RefundsPage /> },
      { path: '/inbox', element: <InboxPage /> },
      { path: '/household', element: <HouseholdPage /> },
      { path: '/trips', element: <TripsPage /> },
      { path: '/trips/:id', element: <TripDetailPage /> },
      { path: '/investments', element: <InvestmentsPage /> },
      { path: '/assets', element: <AssetsPage /> },
      { path: '/analytics', element: <AnalyticsPage /> },
      { path: '/categories', element: <CategoriesPage /> },
      { path: '/payees', element: <PayeesPage /> },
      { path: '/import', element: <ImportPage /> },
      { path: '/settings', element: <SettingsPage /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
  ] },
]);

export { Outlet };
