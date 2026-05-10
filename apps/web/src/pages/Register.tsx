import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Card, CardBody, Input, useToast } from '@app/ui';
import { api, unwrap } from '../lib/api';
import { useAuthStore } from '../store/auth';
import type { ApiResponse, AuthTokens } from '@app/shared';

export function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);
  const setTokens = useAuthStore((s) => s.setTokens);
  const navigate = useNavigate();
  const toast = useToast();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const resp = await api.post<ApiResponse<AuthTokens>>('/auth/register', {
        email,
        password,
        nickname: nickname || undefined,
      });
      const tokens = unwrap(resp);
      setTokens(tokens.accessToken, tokens.refreshToken);
      toast.success('注册成功');
      navigate('/dashboard');
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '注册失败';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 to-slate-50 p-4">
      <Card className="w-full max-w-sm">
        <CardBody>
          <h1 className="mb-1 text-xl font-semibold">创建账号</h1>
          <p className="mb-6 text-sm text-slate-500">立即开始使用</p>
          <form className="space-y-4" onSubmit={submit}>
            <Input label="邮箱" name="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            <Input
              label="密码"
              name="password"
              type="password"
              required
              hint="至少 8 位，包含字母和数字"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Input
              label="昵称（可选）"
              name="nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
            />
            <Button type="submit" className="w-full" loading={loading}>注册</Button>
          </form>
          <p className="mt-4 text-center text-sm text-slate-500">
            已有账号？<Link className="text-brand-600 hover:underline" to="/login">前往登录</Link>
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
