import {
  LayoutDashboard, Wallet, Receipt, Target, PieChart, Settings, TrendingUp, Repeat, ListTree, Store, PiggyBank, Upload, Banknote, Home,
} from 'lucide-react';

export const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/transactions', label: 'Transactions', icon: Receipt },
  { path: '/accounts', label: 'Accounts', icon: Wallet },
  { path: '/budgets', label: 'Budgets', icon: PiggyBank },
  { path: '/goals', label: 'Goals', icon: Target },
  { path: '/recurring', label: 'Recurring', icon: Repeat },
  { path: '/loans', label: 'Loans', icon: Banknote },
  { path: '/household', label: 'Household', icon: Home, householdOnly: true },
  { path: '/investments', label: 'Investments', icon: TrendingUp },
  { path: '/analytics', label: 'Analytics', icon: PieChart },
  { path: '/categories', label: 'Categories', icon: ListTree },
  { path: '/payees', label: 'Payees & tags', icon: Store },
  { path: '/import', label: 'Import / export', icon: Upload },
  { path: '/settings', label: 'Settings', icon: Settings },
] as const;

type NavItem = (typeof NAV_ITEMS)[number];

/** The household page only makes sense inside a household workspace. */
export const visibleNav = (kind?: string): NavItem[] =>
  NAV_ITEMS.filter((n) => !('householdOnly' in n && n.householdOnly) || kind === 'HOUSEHOLD');
