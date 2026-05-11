import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Button } from '@app/ui';
import {
  LayoutDashboard,
  Users,
  Receipt,
  Package,
  Activity,
  Boxes,
  Settings,
  History,
  ShieldCheck,
  LogOut,
} from 'lucide-react';
import { useAuthStore } from '../store/auth';
import { api } from '../lib/api';

const NAV = [
  { to: '/admin/dashboard', label: '总览', icon: LayoutDashboard },
  { to: '/admin/users', label: '用户', icon: Users },
  { to: '/admin/orders', label: '订单', icon: Receipt },
  { to: '/admin/products', label: '套餐', icon: Package },
  { to: '/admin/ai-logs', label: 'AI 日志', icon: Activity },
  { to: '/admin/ai-providers', label: 'AI 模型', icon: Boxes },
  { to: '/admin/settings', label: '系统配置', icon: Settings },
  { to: '/admin/logs', label: '操作日志', icon: History },
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
    <div className="min-h-screen bg-muted/40">
      <aside className="fixed inset-y-0 left-0 w-60 border-r bg-background">
        <div className="flex h-14 items-center gap-2 border-b px-4">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <Link to="/admin/dashboard" className="text-base font-semibold tracking-tight">
            AI SaaS Admin
          </Link>
        </div>
        <nav className="space-y-1 p-2">
          {NAV.map((n) => {
            const Icon = n.icon;
            return (
              <NavLink
                key={n.to}
                to={n.to}
                className={({ isActive }) =>
                  `flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                    isActive
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  }`
                }
              >
                <Icon className="h-4 w-4" />
                {n.label}
              </NavLink>
            );
          })}
        </nav>
      </aside>
      <main className="ml-60">
        <header className="sticky top-0 z-10 flex h-14 items-center justify-end gap-3 border-b bg-background/80 px-6 backdrop-blur">
          <span className="text-sm text-muted-foreground">{user?.email}</span>
          <Button variant="ghost" size="sm" onClick={logout}>
            <LogOut className="h-4 w-4" />
            退出
          </Button>
        </header>
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
