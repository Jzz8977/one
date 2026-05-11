import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Card, CardBody, Input, useToast } from '@app/ui';
import { api, unwrap } from '../lib/api';
import { formatApiError } from '../lib/error';
import { useAuthStore } from '../store/auth';
import type { ApiResponse, AuthTokens } from '@app/shared';

export function LoginPage() {
  const [email, setEmail] = useState('user@example.com');
  const [password, setPassword] = useState('User@12345');
  const [loading, setLoading] = useState(false);
  const setTokens = useAuthStore((s) => s.setTokens);
  const navigate = useNavigate();
  const toast = useToast();
  const [params] = useSearchParams();

  useEffect(() => {
    const reason = params.get('reason');
    if (reason === 'session_expired') toast.error('登录已失效，请重新登录');
    else if (reason) toast.error(`登录失败：${reason}`);
  }, [params, toast]);

  const API = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';
  const startGoogle = () => { window.location.href = `${API}/api/auth/google/start`; };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const resp = await api.post<ApiResponse<AuthTokens>>('/auth/login', { email, password });
      const tokens = unwrap(resp);
      setTokens(tokens.accessToken, tokens.refreshToken);
      toast.success('登录成功');
      navigate('/dashboard');
    } catch (err) {
      const msg = formatApiError(err, '登录失败');
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardBody>
          <h1 className="mb-1 text-xl font-semibold tracking-tight">欢迎回来</h1>
          <p className="mb-6 text-sm text-muted-foreground">登录到 AI SaaS Starter</p>
          <form className="space-y-4" onSubmit={submit}>
            <Input label="邮箱" name="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            <Input label="密码" name="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            <Button type="submit" className="w-full" loading={loading}>登录</Button>
          </form>

          <div className="my-5 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />或<span className="h-px flex-1 bg-border" />
          </div>
          <Button type="button" variant="outline" className="w-full" onClick={startGoogle}>
            <svg className="mr-2 inline" width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.5-.2-2.2H12v4.2h6.4c-.3 1.5-1.1 2.7-2.4 3.5v2.9h3.8c2.2-2 3.5-5 3.5-8.4z"/><path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.8-2.9l-3.8-2.9c-1.1.7-2.4 1.1-4 1.1-3.1 0-5.7-2.1-6.6-4.9H1.5v3.1C3.4 21.3 7.4 24 12 24z"/><path fill="#FBBC05" d="M5.4 14.3c-.2-.7-.4-1.5-.4-2.3s.1-1.5.4-2.3V6.6H1.5C.5 8.2 0 10 0 12s.5 3.8 1.5 5.4l3.9-3.1z"/><path fill="#EA4335" d="M12 4.8c1.8 0 3.4.6 4.6 1.8l3.4-3.4C18 1.2 15.3 0 12 0 7.4 0 3.4 2.7 1.5 6.6l3.9 3.1C6.3 6.9 8.9 4.8 12 4.8z"/></svg>
            使用 Google 登录
          </Button>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            还没有账号？<Link className="font-medium text-foreground underline-offset-4 hover:underline" to="/register">立即注册</Link>
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
