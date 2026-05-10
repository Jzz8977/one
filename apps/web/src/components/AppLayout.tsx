import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Button } from '@app/ui';
import { useAuthStore } from '../store/auth';
import { api } from '../lib/api';

const NAV = [
  { to: '/dashboard', label: '总览' },
  { to: '/credits', label: '积分明细' },
  { to: '/billing', label: '充值套餐' },
  { to: '/ai-playground', label: 'AI Playground' },
  { to: '/usage-logs', label: '调用日志' },
  { to: '/api-keys', label: 'API Keys' },
  { to: '/profile', label: '个人资料' },
];

export function AppLayout() {
  const { user, refreshToken, clear } = useAuthStore();
  const navigate = useNavigate();

  const logout = async () => {
    if (refreshToken) {
      try { await api.post('/auth/logout', { refreshToken }); } catch {}
    }
    clear();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="fixed inset-y-0 left-0 z-10 w-56 border-r border-slate-200 bg-white">
        <div className="flex h-14 items-center gap-2 px-4 text-base font-semibold text-brand-700">
          <Link to="/dashboard">{import.meta.env.VITE_SITE_NAME ?? 'AI SaaS'}</Link>
        </div>
        <nav className="px-2 py-2">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                `block rounded-md px-3 py-2 text-sm transition ${isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-700 hover:bg-slate-100'}`
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="ml-56">
        <header className="flex h-14 items-center justify-end gap-3 border-b border-slate-200 bg-white px-6">
          <span className="text-sm text-slate-500">{user?.email}</span>
          <Button variant="ghost" size="sm" onClick={logout}>退出</Button>
        </header>
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
