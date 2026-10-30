import { Link } from 'react-router-dom';
import logo from '../assets/logo.svg';
import { Button } from '../components/ui/Button';

const FEATURES = [
  ['Track everything', 'Accounts, transfers, categories, tags and multi-currency in one fast ledger.'],
  ['Plan ahead', 'Monthly budgets with rollover, savings goals and recurring bills that post themselves.'],
  ['Share safely', 'Invite a partner or family with owner, editor or viewer roles. Your data stays yours.'],
  ['See the picture', 'Net worth, cash flow and spending reports, plus CSV import and export.'],
];

export default function LandingPage() {
  return (
    <div className="min-h-screen w-full overflow-y-auto bg-background">
      <header className="max-w-5xl mx-auto flex items-center justify-between px-6 py-5">
        <span className="font-bold text-lg flex items-center gap-2"><img src={logo} alt="" className="w-6 h-6" />Keeper</span>
        <Link to="/login"><Button variant="outline" size="sm">Log in</Button></Link>
      </header>
      <main className="max-w-5xl mx-auto px-6 pt-16 pb-24 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">Know where your money goes.</h1>
        <p className="mt-4 text-lg text-secondary max-w-xl mx-auto">A fast, private budget and expense tracker for you and the people you share finances with.</p>
        <Link to="/login" className="inline-block mt-8"><Button size="lg">Get started free</Button></Link>
        <div className="mt-16 grid sm:grid-cols-2 gap-4 text-left">
          {FEATURES.map(([title, text]) => (
            <div key={title} className="glass-panel p-5">
              <h2 className="font-semibold mb-1">{title}</h2>
              <p className="text-sm text-secondary">{text}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
