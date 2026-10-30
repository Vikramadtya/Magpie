import { useEffect, useRef } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { workspaceApi } from '../api/endpoints';
import { errorMessage } from '../lib/http';
import { useAuth } from './AuthProvider';

/** /invite/:token — sign in first if needed, then join the workspace. */
export default function InvitePage() {
  const { token = '' } = useParams();
  const { status, reload, selectWorkspace } = useAuth();
  const navigate = useNavigate();
  const started = useRef(false);

  useEffect(() => {
    if (status !== 'authed' || started.current) return;
    started.current = true;
    workspaceApi
      .accept(token)
      .then(async (ws) => {
        await reload();
        selectWorkspace(ws.id);
        toast.success(`Joined ${ws.name}`);
        navigate('/dashboard', { replace: true });
      })
      .catch((e) => {
        toast.error(errorMessage(e));
        navigate('/dashboard', { replace: true });
      });
  }, [status, token, reload, selectWorkspace, navigate]);

  if (status === 'anon') return <Navigate to={`/login?next=${encodeURIComponent(`/invite/${token}`)}`} replace />;
  return (
    <div className="min-h-screen w-full flex items-center justify-center" role="status">
      <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
