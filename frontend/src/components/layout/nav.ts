import {
  CalendarCheck, Gem, Inbox, LayoutDashboard, ListTree, PieChart, Plane, Receipt, Settings, Store, Target, TrendingUp, Undo2, Upload, Users, Wallet, Repeat, Banknote, PiggyBank, ClipboardCheck,
} from 'lucide-react';

/** The five places you actually go. Everything else lives inside one of them or in Settings. */
export const SECTIONS = [
  { path: '/dashboard', label: 'Home', icon: LayoutDashboard, owns: ['/dashboard'] },
  { path: '/transactions', label: 'Transactions', icon: Receipt, owns: ['/transactions'] },
  { path: '/plan', label: 'Plan', icon: CalendarCheck, owns: ['/plan', '/budgets', '/goals', '/recurring', '/trips'] },
  { path: '/wealth', label: 'Wealth', icon: Wallet, owns: ['/wealth', '/accounts', '/investments', '/assets', '/loans'] },
  { path: '/analytics', label: 'Insights', icon: PieChart, owns: ['/analytics', '/review'] },
] as const;

/** Shown only while something is waiting for you. */
export const WAITING = {
  inbox: { path: '/inbox', label: 'To review', icon: Inbox },
  refunds: { path: '/refunds', label: 'Refunds', icon: Undo2 },
} as const;

export const SETTINGS = { path: '/settings', label: 'Settings', icon: Settings } as const;

/** The pages inside Plan and Wealth, shown as tabs at the top of each. */
export const PLAN_TABS = [
  { key: 'budgets', label: 'Budgets', icon: PiggyBank },
  { key: 'goals', label: 'Goals', icon: Target },
  { key: 'recurring', label: 'Recurring', icon: Repeat },
  { key: 'trips', label: 'Trips', icon: Plane },
] as const;

export const WEALTH_TABS = [
  { key: 'accounts', label: 'Accounts', icon: Wallet },
  { key: 'investments', label: 'Investments', icon: TrendingUp },
  { key: 'assets', label: 'Assets', icon: Gem },
  { key: 'loans', label: 'Loans', icon: Banknote },
] as const;

/** Pages moved out of the sidebar: reached from Settings and the search box. */
export const MORE_PAGES = [
  { path: '/categories', label: 'Categories', hint: 'Group your spending', icon: ListTree },
  { path: '/payees', label: 'Payees & tags', hint: 'Names, tags and automatic categories', icon: Store },
  { path: '/import', label: 'Import / export', hint: 'Bring in a bank file or take your data out', icon: Upload },
  { path: '/household', label: 'Household', hint: 'Share a combined view with family', icon: Users },
  { path: '/review', label: 'Monthly review', hint: 'A 2-minute look back, then next month’s budget', icon: ClipboardCheck },
] as const;

/** Everything the search box can jump to. */
export const NAV_ITEMS = [
  ...SECTIONS.map(({ path, label, icon }) => ({ path, label, icon })),
  ...PLAN_TABS.map((t) => ({ path: `/plan/${t.key}`, label: t.label, icon: t.icon })),
  ...WEALTH_TABS.map((t) => ({ path: `/wealth/${t.key}`, label: t.label, icon: t.icon })),
  WAITING.inbox,
  WAITING.refunds,
  ...MORE_PAGES.map(({ path, label, icon }) => ({ path, label, icon })),
  SETTINGS,
];

/** True when this section owns the current URL (so Plan stays lit on /budgets too). */
export const sectionOwns = (section: (typeof SECTIONS)[number], pathname: string) =>
  section.owns.some((p) => pathname === p || pathname.startsWith(`${p}/`));
