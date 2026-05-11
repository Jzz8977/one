import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@app/ui';
import { useAuthStore } from '../store/auth';

export function LoginCallbackPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const setTokens = useAuthStore((s) => s.setTokens);
  const handled = useRef(false);

  useEffect(() => {
    // React 18 StrictMode runs effects twice in dev. Guard so we only process
    // the URL hash once — second run would see the cleared hash and bail.
    if (handled.current) return;
    handled.current = true;

    const hash = window.location.hash.replace(/^#/, '');
    const params = new URLSearchParams(hash);
    const accessToken = params.get('accessToken');
    const refreshToken = params.get('refreshToken');

    if (accessToken && refreshToken) {
      setTokens(accessToken, refreshToken);
      window.history.replaceState({}, '', '/login/callback');
      toast.success('登录成功');
      navigate('/dashboard', { replace: true });
    } else {
      toast.error('登录失败');
      navigate('/login', { replace: true });
    }
  }, [navigate, setTokens, toast]);

  return (
    <div className="flex min-h-screen items-center justify-center text-muted-foreground">
      正在登录...
    </div>
  );
}
