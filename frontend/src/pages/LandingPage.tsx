import { BarChart3, Layers, PiggyBank, ShieldCheck, Users, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import logo from '../assets/logo.svg';
import { Button } from '../components/ui/Button';

const FEATURES = [
  [Layers, 'One ledger for everything', 'Accounts, cards, cash and every currency, with each day\'s exchange rate applied for you.'],
  [PiggyBank, 'Plans that run themselves', 'Budgets with rollover, savings goals and recurring bills that post on schedule.'],
  [BarChart3, 'Insight, not just totals', 'Spending pace, category trends, forecasts and what changed since last month.'],
  [Users, 'Share without giving up control', 'Lend a card, keep a household view, or settle with friends. Everyone keeps their own data.'],
  [Zap, 'Fast everywhere', 'Instant to use, installable on your phone and works offline.'],
  [ShieldCheck, 'Private by design', 'Your ledger is yours. Nobody sees anything you have not chosen to share.'],
] as const;

export default function LandingPage() {
  return (
    <div className="min-h-screen w-full overflow-y-auto page-glow">
      <header className="max-w-6xl mx-auto flex items-center justify-between px-6 py-6">
        <span className="font-semibold text-lg flex items-center gap-2.5"><img src={logo} alt="" className="w-7 h-7" />Keeper</span>
        <nav className="flex items-center gap-2">
          <Link to="/login"><Button variant="ghost" size="sm">Log in</Button></Link>
          <Link to="/login"><Button size="sm">Get started</Button></Link>
        </nav>
      </header>

      <main className="max-w-6xl mx-auto px-6">
        <section className="pt-16 pb-20 text-center">
          <p className="inline-flex items-center gap-2 rounded-full bg-accent/10 text-accent text-xs font-medium px-3 py-1 mb-6">Budgeting, without the busywork</p>
          <h1 className="text-5xl sm:text-6xl font-semibold tracking-[-0.04em] leading-[1.05] max-w-3xl mx-auto text-balance">Know where your money <span className="text-gradient">goes.</span></h1>
          <p className="mt-6 text-lg text-secondary max-w-xl mx-auto">A fast, private budget and expense tracker for you and the people you share finances with.</p>
          <div className="mt-9 flex items-center justify-center gap-3">
            <Link to="/login"><Button size="lg">Get started free</Button></Link>
            <a href="#features"><Button size="lg" variant="outline">See what is inside</Button></a>
          </div>

          <div className="relative mt-16 mx-auto max-w-4xl text-left">
            <div className="absolute -inset-x-6 -top-6 bottom-0 bg-gradient-to-b from-accent/10 to-transparent rounded-[32px] blur-2xl" aria-hidden />
            <div className="relative glass-panel p-5 sm:p-6 grid sm:grid-cols-3 gap-4">
              <div className="hero-card p-5 sm:col-span-2">
                <p className="text-[13px] text-white/60">Net worth</p>
                <p className="text-4xl font-semibold mt-1 tracking-[-0.03em] tabular-nums">$48,260.00</p>
                <svg viewBox="0 0 300 60" className="w-full h-14 mt-4" aria-hidden><path d="M0 50 C40 46 60 40 90 38 S150 30 180 22 S250 12 300 6" fill="none" stroke="#C7D2FF" strokeWidth="2.5" strokeLinecap="round" /></svg>
              </div>
              <div className="space-y-4">
                <div className="rounded-2xl border border-border p-4"><p className="text-xs text-secondary">Income</p><p className="text-xl font-semibold text-green-600 mt-1 tabular-nums">$5,200</p></div>
                <div className="rounded-2xl border border-border p-4"><p className="text-xs text-secondary">Spending</p><p className="text-xl font-semibold text-red-500 mt-1 tabular-nums">$1,614</p></div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="pb-24">
          <h2 className="text-center text-3xl font-semibold tracking-[-0.03em] mb-12">Everything in its place</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map(([Icon, title, text]) => (
              <div key={title} className="glass-panel p-6">
                <span className="w-10 h-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center mb-4"><Icon className="w-5 h-5" /></span>
                <h3 className="font-semibold mb-1.5">{title}</h3>
                <p className="text-sm text-secondary leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8 text-center text-xs text-secondary">Keeper · Your money, kept simple.</footer>
    </div>
  );
}
