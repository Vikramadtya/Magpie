import {
  LayoutDashboard, Wallet, Receipt, Target, PieChart, Settings, TrendingUp, Repeat, ListTree, Store, PiggyBank, Upload, Banknote, Plane, Inbox, Users,
} from 'lucide-react';

const ITEMS = [
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

type Item = (typeof ITEMS)[number];
const pick = (...paths: Item['path'][]) => paths.map((p) => ITEMS.find((i) => i.path === p)!);

/** The sidebar, grouped so the long list reads as a few small ones. */
export const NAV_GROUPS: { label?: string; items: Item[] }[] = [
  { items: pick('/dashboard', '/inbox', '/transactions') },
  { label: 'Money', items: pick('/accounts', '/budgets', '/goals', '/recurring', '/loans') },
  { label: 'Insight', items: pick('/analytics', '/trips', '/investments', '/household') },
  { label: 'Manage', items: pick('/categories', '/payees', '/import', '/settings') },
];

export const NAV_ITEMS = NAV_GROUPS.flatMap((g) => g.items);
