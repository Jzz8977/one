import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Card, CardBody, Input, useToast } from '@app/ui';
import { api, unwrap } from '../lib/api';
import { useAuthStore } from '../store/auth';
import type { ApiResponse, AuthTokens } from '@app/shared';

export function LoginPage() {
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('Admin@12345');
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
      const t = unwrap(resp);
      setTokens(t.accessToken, t.refreshToken);
      toast.success('登录成功');
      navigate('/admin/dashboard');
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '登录失败';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardBody>
          <h1 className="mb-6 text-xl font-semibold tracking-tight">管理后台登录</h1>
          <form className="space-y-4" onSubmit={submit}>
            <Input label="邮箱" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            <Input label="密码" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            <Button className="w-full" type="submit" loading={loading}>登录</Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
