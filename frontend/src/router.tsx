import logo from './assets/logo.svg';
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
const AnalyticsPage = lazyPage(() => import('./pages/AnalyticsPage'));
const PlanPage = lazy(() => import('./pages/SectionPage').then((m) => ({ default: m.PlanPage })));
const WealthPage = lazy(() => import('./pages/SectionPage').then((m) => ({ default: m.WealthPage })));
const ReviewPage = lazyPage(() => import('./pages/ReviewPage'));
const RefundsPage = lazyPage(() => import('./pages/RefundsPage'));
const InboxPage = lazyPage(() => import('./pages/InboxPage'));
const HouseholdPage = lazyPage(() => import('./pages/HouseholdPage'));
const TripDetailPage = lazyPage(() => import('./pages/TripDetailPage'));
const CategoriesPage = lazyPage(() => import('./pages/CategoriesPage'));
const PayeesPage = lazyPage(() => import('./pages/PayeesPage'));
const ImportPage = lazyPage(() => import('./pages/ImportPage'));
const SettingsPage = lazyPage(() => import('./pages/SettingsPage'));

function Splash() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center gap-5" role="status" aria-label="Loading">
      <img src={logo} alt="" className="w-16 h-16 rounded-[18px] shadow-lift saved-ring" />
      <div className="w-24 h-1 rounded-full skeleton" />
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
      { path: '/plan', element: <Navigate to="/plan/budgets" replace /> },
      { path: '/plan/:tab', element: <PlanPage /> },
      { path: '/wealth', element: <Navigate to="/wealth/accounts" replace /> },
      { path: '/wealth/:tab', element: <WealthPage /> },
      { path: '/budgets', element: <Navigate to="/plan/budgets" replace /> },
      { path: '/goals', element: <Navigate to="/plan/goals" replace /> },
      { path: '/recurring', element: <Navigate to="/plan/recurring" replace /> },
      { path: '/accounts', element: <Navigate to="/wealth/accounts" replace /> },
      { path: '/loans', element: <Navigate to="/wealth/loans" replace /> },
      { path: '/investments', element: <Navigate to="/wealth/investments" replace /> },
      { path: '/assets', element: <Navigate to="/wealth/assets" replace /> },
      { path: '/trips', element: <Navigate to="/plan/trips" replace /> },
      { path: '/review', element: <ReviewPage /> },
      { path: '/inbox', element: <InboxPage /> },
      { path: '/household', element: <HouseholdPage /> },
      { path: '/trips/:id', element: <TripDetailPage /> },
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
