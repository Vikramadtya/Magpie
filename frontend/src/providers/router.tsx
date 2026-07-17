import React, { Suspense } from 'react';
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import SidebarLayout from '../views/layout/SidebarLayout';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';

// Auth Guards
const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

// Lazy loaded pages
const LoginPage = React.lazy(() => import('../views/pages/auth/LoginPage'));
const AuthCallback = React.lazy(() => import('../views/pages/auth/AuthCallback'));
const DashboardPage = React.lazy(() => import('../views/pages/DashboardPage'));
const AccountsPage = React.lazy(() => import('../views/pages/AccountsPage'));
const TransactionsPage = React.lazy(() => import('../views/pages/TransactionsPage'));
const CategoriesPage = React.lazy(() => import('../views/pages/CategoriesPage'));
const PayeesPage = React.lazy(() => import('../views/pages/PayeesPage'));
const BudgetsPage = React.lazy(() => import('../views/pages/BudgetsPage'));
const SubscriptionsPage = React.lazy(() => import('../views/pages/SubscriptionsPage'));
const InvestmentsPage = React.lazy(() => import('../views/pages/InvestmentsPage'));
const GoalsPage = React.lazy(() => import('../views/pages/GoalsPage'));
const AnalyticsPage = React.lazy(() => import('../views/pages/AnalyticsPage'));
const SettingsPage = React.lazy(() => import('../views/pages/SettingsPage'));
const HowItWorksPage = React.lazy(() => import('../views/pages/HowItWorksPage'));

// Loading Fallback
const PageFallback = () => (
  <div className="w-full h-[60vh] flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
  </div>
);

// App Root Layout for authenticated users
const PrivateLayout = () => {
  return (
    <AuthGuard>
      <ErrorBoundary>
        <SidebarLayout />
      </ErrorBoundary>
    </AuthGuard>
  );
};

// Public Root Layout
const PublicLayout = () => {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageFallback />}>
        <Outlet />
      </Suspense>
    </ErrorBoundary>
  );
};

// Global Error Page
const GlobalError = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-text p-4">
      <h1 className="text-4xl font-bold mb-4">Oops!</h1>
      <p className="text-lg text-secondary mb-8">We couldn't find the page you're looking for or an error occurred.</p>
      <a href="/" className="px-6 py-2 bg-accent text-white rounded-lg hover:opacity-90 transition-opacity">
        Go Home
      </a>
    </div>
  );
};

export const router = createBrowserRouter([
  {
    path: '/',
    element: <PublicLayout />,
    errorElement: <GlobalError />,
    children: [
      {
        path: 'login',
        element: <LoginPage />
      },
      {
        path: 'auth/callback',
        element: <AuthCallback />
      },
      {
        path: '*',
        element: <GlobalError />
      }
    ]
  },
  {
    path: '/',
    element: <PrivateLayout />,
    errorElement: <GlobalError />,
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />
      },
      {
        path: 'dashboard',
        element: (
          <Suspense fallback={<PageFallback />}>
            <DashboardPage />
          </Suspense>
        )
      },
      {
        path: 'accounts',
        element: (
          <Suspense fallback={<PageFallback />}>
            <AccountsPage />
          </Suspense>
        )
      },
      {
        path: 'transactions',
        element: (
          <Suspense fallback={<PageFallback />}>
            <TransactionsPage />
          </Suspense>
        )
      },
      {
        path: 'categories',
        element: (
          <Suspense fallback={<PageFallback />}>
            <CategoriesPage />
          </Suspense>
        )
      },
      {
        path: 'payees',
        element: (
          <Suspense fallback={<PageFallback />}>
            <PayeesPage />
          </Suspense>
        )
      },
      {
        path: 'budgets',
        element: (
          <Suspense fallback={<PageFallback />}>
            <BudgetsPage />
          </Suspense>
        )
      },
      {
        path: 'subscriptions',
        element: (
          <Suspense fallback={<PageFallback />}>
            <SubscriptionsPage />
          </Suspense>
        )
      },
      {
        path: 'investments',
        element: (
          <Suspense fallback={<PageFallback />}>
            <InvestmentsPage />
          </Suspense>
        )
      },
      {
        path: 'goals',
        element: (
          <Suspense fallback={<PageFallback />}>
            <GoalsPage />
          </Suspense>
        )
      },
      {
        path: 'analytics',
        element: (
          <Suspense fallback={<PageFallback />}>
            <AnalyticsPage />
          </Suspense>
        )
      },
      {
        path: 'settings',
        element: (
          <Suspense fallback={<PageFallback />}>
            <SettingsPage />
          </Suspense>
        )
      },
      {
        path: 'how-it-works',
        element: (
          <Suspense fallback={<PageFallback />}>
            <HowItWorksPage />
          </Suspense>
        )
      },
    ]
  }
]);
