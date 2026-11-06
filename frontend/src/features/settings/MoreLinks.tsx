import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { MORE_PAGES } from '../../components/layout/nav';

/** The pages that used to crowd the sidebar: one tidy list, a tap away. */
export function MoreLinks() {
  return (
    <section className="glass-panel overflow-hidden">
      <h2 className="px-6 pt-5 pb-2">More</h2>
      <ul className="divide-y divide-border">
        {MORE_PAGES.map((p) => (
          <li key={p.path}>
            <Link to={p.path} className="flex items-center gap-3.5 px-6 py-3.5 hover:bg-black/[0.03] dark:hover:bg-white/[0.04] transition-colors">
              <span className="w-9 h-9 rounded-xl bg-accent/10 text-accent flex items-center justify-center shrink-0"><p.icon className="w-[18px] h-[18px]" /></span>
              <span className="flex-1 min-w-0">
                <span className="block text-body font-medium">{p.label}</span>
                <span className="block text-caption text-secondary truncate">{p.hint}</span>
              </span>
              <ChevronRight className="w-4 h-4 text-secondary" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
