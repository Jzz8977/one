import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Card, CardBody, Input, useToast } from '@app/ui';
import { api, unwrap } from '../lib/api';
import { formatApiError } from '../lib/error';
import { useAuthStore } from '../store/auth';
import type { ApiResponse, AuthTokens } from '@app/shared';

type Tab = 'password' | 'sms';

export function LoginPage() {
  const [tab, setTab] = useState<Tab>('password');
  const [email, setEmail] = useState('user@example.com');
  const [password, setPassword] = useState('User@12345');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const setTokens = useAuthStore((s) => s.setTokens);
  const navigate = useNavigate();
  const toast = useToast();
  const [params] = useSearchParams();

  useEffect(() => {
    const reason = params.get('reason');
    if (reason === 'session_expired') toast.error('登录已失效，请重新登录');
    else if (reason) toast.error(`登录失败：${reason}`);
  }, [params, toast]);

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const API = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';
  const startGoogle = () => { window.location.href = `${API}/api/auth/google/start`; };
  const startWechat = () => { window.location.href = `${API}/api/auth/wechat/start`; };

  const startCooldown = (seconds: number) => {
    setCooldown(seconds);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCooldown((s) => {
        if (s <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  };

  const sendCode = async () => {
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      toast.error('手机号格式不正确');
      return;
    }
    setSending(true);
    try {
      await api.post<ApiResponse<{ ok: boolean; ttl: number }>>('/auth/sms/send', { phone });
      toast.success('验证码已发送');
      startCooldown(60);
    } catch (err) {
      toast.error(formatApiError(err, '发送失败'));
    } finally {
      setSending(false);
    }
  };

  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const resp = await api.post<ApiResponse<AuthTokens>>('/auth/login', { email, password });
      const tokens = unwrap(resp);
      setTokens(tokens.accessToken, tokens.refreshToken);
      toast.success('登录成功');
      navigate('/dashboard');
    } catch (err) {
      toast.error(formatApiError(err, '登录失败'));
    } finally {
      setLoading(false);
    }
  };

  const submitSms = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const resp = await api.post<ApiResponse<AuthTokens>>('/auth/sms/login', { phone, code });
      const tokens = unwrap(resp);
      setTokens(tokens.accessToken, tokens.refreshToken);
      toast.success('登录成功');
      navigate('/dashboard');
    } catch (err) {
      toast.error(formatApiError(err, '登录失败'));
    } finally {
      setLoading(false);
    }
  };

  const tabBtn = (key: Tab, label: string) => (
    <button
      type="button"
      onClick={() => setTab(key)}
      className={`flex-1 border-b-2 pb-2 text-sm transition ${
        tab === key
          ? 'border-foreground font-medium text-foreground'
          : 'border-transparent text-muted-foreground hover:text-foreground'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardBody>
          <h1 className="mb-1 text-xl font-semibold tracking-tight">欢迎回来</h1>
          <p className="mb-6 text-sm text-muted-foreground">登录到 AI SaaS Starter</p>

          <div className="mb-5 flex gap-4">
            {tabBtn('password', '邮箱密码')}
            {tabBtn('sms', '手机号登录')}
          </div>

          {tab === 'password' ? (
            <form className="space-y-4" onSubmit={submitPassword}>
              <Input label="邮箱" name="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              <Input label="密码" name="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
              <Button type="submit" className="w-full" loading={loading}>登录</Button>
            </form>
          ) : (
            <form className="space-y-4" onSubmit={submitSms}>
              <Input
                label="手机号"
                name="phone"
                type="tel"
                inputMode="numeric"
                maxLength={11}
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                placeholder="请输入 11 位手机号"
              />
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Input
                    label="验证码"
                    name="code"
                    inputMode="numeric"
                    maxLength={8}
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="短信验证码"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={sendCode}
                  loading={sending}
                  disabled={cooldown > 0 || sending}
                  className="whitespace-nowrap"
                >
                  {cooldown > 0 ? `${cooldown}s` : '发送验证码'}
                </Button>
              </div>
              <Button type="submit" className="w-full" loading={loading}>登录 / 注册</Button>
              <p className="text-center text-xs text-muted-foreground">未注册的手机号将自动创建账号</p>
            </form>
          )}

          <div className="my-5 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />或<span className="h-px flex-1 bg-border" />
          </div>
          <div className="space-y-2">
            <Button type="button" variant="outline" className="w-full" onClick={startGoogle}>
              <svg className="mr-2 inline" width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.5-.2-2.2H12v4.2h6.4c-.3 1.5-1.1 2.7-2.4 3.5v2.9h3.8c2.2-2 3.5-5 3.5-8.4z"/><path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.8-2.9l-3.8-2.9c-1.1.7-2.4 1.1-4 1.1-3.1 0-5.7-2.1-6.6-4.9H1.5v3.1C3.4 21.3 7.4 24 12 24z"/><path fill="#FBBC05" d="M5.4 14.3c-.2-.7-.4-1.5-.4-2.3s.1-1.5.4-2.3V6.6H1.5C.5 8.2 0 10 0 12s.5 3.8 1.5 5.4l3.9-3.1z"/><path fill="#EA4335" d="M12 4.8c1.8 0 3.4.6 4.6 1.8l3.4-3.4C18 1.2 15.3 0 12 0 7.4 0 3.4 2.7 1.5 6.6l3.9 3.1C6.3 6.9 8.9 4.8 12 4.8z"/></svg>
              使用 Google 登录
            </Button>
            <Button type="button" variant="outline" className="w-full" onClick={startWechat}>
              <svg className="mr-2 inline" width="16" height="16" viewBox="0 0 24 24"><path fill="#07C160" d="M8.69 2C4.44 2 1 4.78 1 8.21c0 1.95 1.13 3.71 2.91 4.88L3.2 15.4l2.69-1.39c.69.18 1.41.29 2.16.31-.09-.4-.14-.82-.14-1.24 0-3.21 3.05-5.81 6.81-5.81.24 0 .48.01.71.04C14.8 4.4 12.06 2 8.69 2zm-2.84 4.5c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm5.68 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM15.5 8.5c-3.59 0-6.5 2.24-6.5 5s2.91 5 6.5 5c.59 0 1.16-.06 1.7-.18l1.99 1.08-.55-1.7c1.45-.92 2.36-2.34 2.36-3.95 0-2.76-2.91-5-6.5-5zm-2.25 3.25c.41 0 .75.34.75.75s-.34.75-.75.75-.75-.34-.75-.75.34-.75.75-.75zm4.5 0c.41 0 .75.34.75.75s-.34.75-.75.75-.75-.34-.75-.75.34-.75.75-.75z"/></svg>
              使用微信登录
            </Button>
          </div>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            还没有账号？<Link className="font-medium text-foreground underline-offset-4 hover:underline" to="/register">立即注册</Link>
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
