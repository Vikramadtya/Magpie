import { Inbox, Calendar, CalendarDays, LayoutGrid, BookOpen, Repeat, Moon, Sun, Store } from 'lucide-react';
import { useEffect, useState } from 'react';

interface SidebarProps {
    activeTab: string;
    onTabChange: (tab: string) => void;
}

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
    const [isDark, setIsDark] = useState(false);

    useEffect(() => {
        if (isDark) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [isDark]);

    const navItems = [
        { id: 'inbox', label: 'Inbox', icon: Inbox },
        { id: 'today', label: 'Today', icon: Calendar },
        { id: 'month', label: 'This Month', icon: CalendarDays },
        { id: 'categories', label: 'Categories', icon: LayoutGrid },
        { id: 'payees', label: 'Payees', icon: Store },
        { id: 'subscriptions', label: 'Subscriptions', icon: Repeat },
        { id: 'logbook', label: 'Logbook', icon: BookOpen },
    ];

    return (
        <div className="w-[260px] bg-sidebar border-r border-border h-full flex flex-col p-4 transition-colors duration-200">
            <div className="flex items-center justify-between mb-6 px-2">
                <span className="font-semibold text-primary text-lg">Financier</span>
                <button 
                    onClick={() => setIsDark(!isDark)}
                    className="p-1.5 rounded-md hover:bg-black/5 dark:hover:bg-white/10 text-secondary transition-colors"
                >
                    {isDark ? <Sun size={16} /> : <Moon size={16} />}
                </button>
            </div>
            
            <input 
                type="text" 
                className="bg-black/5 dark:bg-white/5 border-none rounded-md px-3 py-1.5 text-sm text-primary mb-6 w-full focus:outline-none focus:ring-2 focus:ring-accent/50 placeholder:text-secondary/70 transition-colors duration-200" 
                placeholder="Quick Find"
            />
            
            <div className="flex flex-col gap-0.5 flex-1">
                {navItems.map(item => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => onTabChange(item.id)}
                            className={`flex items-center px-3 py-1.5 rounded-md text-[14px] font-medium transition-all duration-150 ${
                                isActive 
                                ? 'bg-accent text-white shadow-sm'
                                : 'text-primary hover:bg-black/5 dark:hover:bg-white/5'
                            }`}
                        >
                            <Icon 
                                className={`mr-2.5 ${isActive ? 'text-white' : 'text-accent'}`} 
                                size={16} 
                                strokeWidth={isActive ? 2.5 : 2}
                            />
                            {item.label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
