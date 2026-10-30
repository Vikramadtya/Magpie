import {
  LayoutDashboard, Wallet, Receipt, Target, PieChart, Settings, TrendingUp, Repeat, ListTree, Store, PiggyBank, Upload, Banknote, Plane, Inbox, Users,
} from 'lucide-react';

export const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/inbox', label: 'To review', icon: Inbox },
  { path: '/transactions', label: 'Transactions', icon: Receipt },
  { path: '/accounts', label: 'Accounts', icon: Wallet },
  { path: '/budgets', label: 'Budgets', icon: PiggyBank },
  { path: '/trips', label: 'Trips', icon: Plane },
  { path: '/household', label: 'Household', icon: Users },
  { path: '/goals', label: 'Goals', icon: Target },
  { path: '/recurring', label: 'Recurring', icon: Repeat },
  { path: '/loans', label: 'Loans', icon: Banknote },
  { path: '/investments', label: 'Investments', icon: TrendingUp },
  { path: '/analytics', label: 'Analytics', icon: PieChart },
  { path: '/categories', label: 'Categories', icon: ListTree },
  { path: '/payees', label: 'Payees & tags', icon: Store },
  { path: '/import', label: 'Import / export', icon: Upload },
  { path: '/settings', label: 'Settings', icon: Settings },
] as const;
