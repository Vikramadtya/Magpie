import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthProvider';

/** Google redirects here with only the refresh cookie set; exchange it for an access token. */
export default function AuthCallback() {
  const { completeOAuth } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    let alive = true;
    completeOAuth()
      .then((ok) => alive && navigate(ok ? '/dashboard' : '/login?error=true', { replace: true }))
      .catch(() => alive && navigate('/login?error=true', { replace: true }));
    return () => {
      alive = false;
    };
  }, [completeOAuth, navigate]);

  return (
    <div className="min-h-screen w-full flex items-center justify-center" role="status">
      <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
