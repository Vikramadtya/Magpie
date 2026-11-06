import { lazy, Suspense, type ComponentProps } from 'react';

/** The history views load (with the chart library) only when someone opens one. */
const L = {
  Holding: lazy(() => import('./Histories').then((m) => ({ default: m.HoldingHistoryModal }))),
  Account: lazy(() => import('./Histories').then((m) => ({ default: m.AccountHistoryModal }))),
  NetWorth: lazy(() => import('./Histories').then((m) => ({ default: m.NetWorthHistoryModal }))),
  Goal: lazy(() => import('./Histories').then((m) => ({ default: m.GoalHistoryModal }))),
  Budget: lazy(() => import('./Histories').then((m) => ({ default: m.BudgetHistoryModal }))),
  Spending: lazy(() => import('./Histories').then((m) => ({ default: m.SpendingHistoryModal }))),
  Loan: lazy(() => import('./Histories').then((m) => ({ default: m.LoanHistoryModal }))),
};

export const HoldingHistory = (p: ComponentProps<typeof L.Holding>) => <Suspense fallback={null}><L.Holding {...p} /></Suspense>;
export const AccountHistory = (p: ComponentProps<typeof L.Account>) => <Suspense fallback={null}><L.Account {...p} /></Suspense>;
export const NetWorthHistory = (p: ComponentProps<typeof L.NetWorth>) => <Suspense fallback={null}><L.NetWorth {...p} /></Suspense>;
export const GoalHistory = (p: ComponentProps<typeof L.Goal>) => <Suspense fallback={null}><L.Goal {...p} /></Suspense>;
export const BudgetHistory = (p: ComponentProps<typeof L.Budget>) => <Suspense fallback={null}><L.Budget {...p} /></Suspense>;
export const LoanHistory = (p: ComponentProps<typeof L.Loan>) => <Suspense fallback={null}><L.Loan {...p} /></Suspense>;
export const SpendingHistory = (p: ComponentProps<typeof L.Spending>) => <Suspense fallback={null}><L.Spending {...p} /></Suspense>;
