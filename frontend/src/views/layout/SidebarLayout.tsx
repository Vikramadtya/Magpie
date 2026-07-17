import { Outlet, NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, Wallet, Receipt, Target, PieChart, Settings, TrendingUp, Repeat, HelpCircle, Moon, Sun, ListTree, Store
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useEffect, useState } from 'react';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/accounts', label: 'Accounts', icon: Wallet },
  { path: '/transactions', label: 'Transactions', icon: Receipt },
  { path: '/categories', label: 'Categories', icon: ListTree },
  { path: '/payees', label: 'Payees', icon: Store },
  { path: '/budgets', label: 'Budgets', icon: Target },
  { path: '/goals', label: 'Goals', icon: Target },
  { path: '/subscriptions', label: 'Subscriptions', icon: Repeat },
  { path: '/investments', label: 'Investments', icon: TrendingUp },
  { path: '/analytics', label: 'Analytics', icon: PieChart },
  { path: '/settings', label: 'Settings', icon: Settings },
  { path: '/how-it-works', label: 'How It Works', icon: HelpCircle },
];

import { WorkspaceDataProvider } from '../../components/providers/WorkspaceDataProvider';

export default function SidebarLayout() {
  const [isDark, setIsDark] = useState(false);
  const workspaceId = localStorage.getItem('workspaceId') || '';

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  return (
    <div className="flex h-screen w-full bg-background text-primary font-sans transition-colors duration-200">
      {/* Sidebar - Things 3 aesthetic */}
      <aside className="w-[260px] border-r border-border bg-sidebar flex flex-col pt-8 pb-4 transition-colors duration-200">
        <div className="px-6 mb-8 flex items-center justify-between">
          <h1 className="text-[19px] font-bold tracking-tight text-primary flex items-center gap-2">
            <div className="w-6 h-6 bg-accent rounded-md flex items-center justify-center">
              <span className="text-white text-xs font-bold">K</span>
            </div>
            Keeper
          </h1>
          <button 
            onClick={() => setIsDark(!isDark)}
            className="p-1.5 rounded-md hover:bg-black/5 dark:hover:bg-white/10 text-secondary transition-colors"
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>

        <nav className="flex-1 px-4 flex flex-col gap-0.5">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-1.5 text-[14px] font-medium rounded-lg transition-all duration-150',
                  isActive
                    ? 'bg-accent text-white shadow-sm '
                    : 'text-primary hover:bg-black/5 dark:hover:bg-white/5'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon className={cn("w-[18px] h-[18px]", isActive ? 'text-white' : 'text-accent')} strokeWidth={isActive ? 2.5 : 2} />
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>
        
        <div className="px-4 mt-auto">
          <button 
            onClick={() => {
              localStorage.removeItem('token');
              localStorage.removeItem('workspaceId');
              window.location.href = '/login';
            }}
            className="w-full flex items-center gap-3 px-3 py-1.5 text-[14px] font-medium rounded-lg text-primary hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <div className="w-[18px] h-[18px] flex items-center justify-center text-secondary">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
            </div>
            Log out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto relative">
        <div className="w-full max-w-6xl mx-auto px-10 py-10">
          <WorkspaceDataProvider workspaceId={workspaceId}>
            <Outlet />
          </WorkspaceDataProvider>
        </div>
      </main>
    </div>
  );
}
