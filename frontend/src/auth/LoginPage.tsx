import { useState, type FormEvent } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import logo from '../assets/logo.svg';
import { Button } from '../components/ui/Button';
import { Field } from '../components/ui/Field';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { errorMessage } from '../lib/http';
import { CURRENCIES } from '../lib/money';
import { useAuth } from './AuthProvider';

export default function LoginPage() {
  const { status, login, register } = useAuth();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [form, setForm] = useState({ name: '', email: '', password: '', currency: 'USD' });
  const [busy, setBusy] = useState(false);

  if (status === 'authed') return <Navigate to={next} replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === 'login') await login(form.email, form.password);
      else await register(form);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="min-h-screen w-full overflow-y-auto bg-background flex flex-col justify-center py-10 px-4">
      <div className="mx-auto w-full max-w-md">
        <img src={logo} alt="Keeper" className="w-12 h-12 mx-auto mb-4" />
        <h1 className="text-center text-2xl font-bold tracking-tight mb-6">
          {mode === 'login' ? 'Log in to Keeper' : 'Create your account'}
        </h1>
        {params.get('error') && <p role="alert" className="mb-4 text-sm text-red-500 text-center">Sign-in failed. Please try again.</p>}

        <div className="glass-panel p-6 space-y-4">
          <a
            href={`/oauth/login/google`}
            className="w-full flex items-center justify-center gap-3 h-10 border border-border rounded-lg text-sm font-medium hover:bg-black/5 dark:hover:bg-white/5"
          >
            <GoogleIcon /> Continue with Google
          </a>
          <div className="flex items-center gap-3 text-xs text-secondary"><span className="flex-1 border-t border-border" />or<span className="flex-1 border-t border-border" /></div>

          <form onSubmit={submit} className="space-y-4">
            {mode === 'register' && (
              <Field label="Name"><Input value={form.name} onChange={set('name')} required maxLength={120} autoComplete="name" /></Field>
            )}
            <Field label="Email"><Input type="email" value={form.email} onChange={set('email')} required autoComplete="email" /></Field>
            <Field label="Password" hint={mode === 'register' ? 'At least 8 characters' : undefined}>
              <Input type="password" value={form.password} onChange={set('password')} required minLength={mode === 'register' ? 8 : 1} maxLength={72} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
            </Field>
            {mode === 'register' && (
              <Field label="Main currency">
                <Select value={form.currency} onChange={set('currency')}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</Select>
              </Field>
            )}
            <Button type="submit" className="w-full" disabled={busy}>{mode === 'login' ? 'Log in' : 'Create account'}</Button>
          </form>
        </div>

        <p className="text-center text-sm text-secondary mt-4">
          {mode === 'login' ? "New to Keeper? " : 'Already have an account? '}
          <button className="text-accent font-medium" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
            {mode === 'login' ? 'Create an account' : 'Log in'}
          </button>
        </p>
      </div>
    </div>
  );
}

/** Only same-site paths: never redirect to a URL taken from the query string. */
export function safeNext(next: string | null): string {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard';
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}
