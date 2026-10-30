import { lazy } from 'react';
import { createBrowserRouter, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './auth/AuthProvider';
import AppLayout from './components/layout/AppLayout';

const lazyPage = <T extends { default: React.ComponentType }>(load: () => Promise<T>) => lazy(load);

const LandingPage = lazyPage(() => import('./pages/LandingPage'));
const LoginPage = lazyPage(() => import('./auth/LoginPage'));
const AuthCallback = lazyPage(() => import('./auth/AuthCallback'));
const InvitePage = lazyPage(() => import('./auth/InvitePage'));
const DashboardPage = lazyPage(() => import('./pages/DashboardPage'));
const TransactionsPage = lazyPage(() => import('./pages/TransactionsPage'));
const AccountsPage = lazyPage(() => import('./pages/AccountsPage'));
const BudgetsPage = lazyPage(() => import('./pages/BudgetsPage'));
const GoalsPage = lazyPage(() => import('./pages/GoalsPage'));
const RecurringPage = lazyPage(() => import('./pages/RecurringPage'));
const InvestmentsPage = lazyPage(() => import('./pages/InvestmentsPage'));
const AnalyticsPage = lazyPage(() => import('./pages/AnalyticsPage'));
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

function RequireAuth() {
  const { status } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <Splash />;
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
  { path: '/', element: <Landing /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/auth/callback', element: <AuthCallback /> },
  { path: '/invite/:token', element: <InvitePage /> },
  {
    element: <RequireAuth />,
    children: [
      { path: '/dashboard', element: <DashboardPage /> },
      { path: '/transactions', element: <TransactionsPage /> },
      { path: '/accounts', element: <AccountsPage /> },
      { path: '/budgets', element: <BudgetsPage /> },
      { path: '/goals', element: <GoalsPage /> },
      { path: '/recurring', element: <RecurringPage /> },
      { path: '/investments', element: <InvestmentsPage /> },
      { path: '/analytics', element: <AnalyticsPage /> },
      { path: '/categories', element: <CategoriesPage /> },
      { path: '/payees', element: <PayeesPage /> },
      { path: '/import', element: <ImportPage /> },
      { path: '/settings', element: <SettingsPage /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);

export { Outlet };
