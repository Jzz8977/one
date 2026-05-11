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
  }, [params, toast]);

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
          <p className="mt-4 text-center text-sm text-muted-foreground">
            还没有账号？<Link className="font-medium text-foreground underline-offset-4 hover:underline" to="/register">立即注册</Link>
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
