import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Button } from '@app/ui';
import { useAuthStore } from '../store/auth';
import { api } from '../lib/api';

const NAV = [
  { to: '/admin/dashboard', label: '总览' },
  { to: '/admin/users', label: '用户' },
  { to: '/admin/orders', label: '订单' },
  { to: '/admin/products', label: '套餐' },
  { to: '/admin/ai-logs', label: 'AI 日志' },
  { to: '/admin/ai-providers', label: 'AI 模型' },
  { to: '/admin/settings', label: '系统配置' },
  { to: '/admin/logs', label: '操作日志' },
];

export function AdminLayout() {
  const { user, refreshToken, clear } = useAuthStore();
  const navigate = useNavigate();
  const logout = async () => {
    if (refreshToken) try { await api.post('/auth/logout', { refreshToken }); } catch {}
    clear();
    navigate('/admin/login');
  };
  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 w-56 border-r border-slate-200 bg-white">
        <div className="flex h-14 items-center px-4 text-base font-semibold text-brand-700">
          <Link to="/admin/dashboard">AI SaaS Admin</Link>
        </div>
        <nav className="px-2">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to}
              className={({ isActive }) =>
                `block rounded-md px-3 py-2 text-sm transition ${isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-700 hover:bg-slate-100'}`
              }
            >{n.label}</NavLink>
          ))}
        </nav>
      </aside>
      <main className="ml-56">
        <header className="flex h-14 items-center justify-end gap-3 border-b border-slate-200 bg-white px-6">
          <span className="text-sm text-slate-500">{user?.email}</span>
          <Button variant="ghost" size="sm" onClick={logout}>退出</Button>
        </header>
        <div className="p-6"><Outlet /></div>
      </main>
    </div>
  );
}
