import { Navigate } from 'react-router-dom';
import { useEffect, type ReactNode } from 'react';
import { useAuthStore } from '../store/auth';
import { api, unwrap } from '../lib/api';
import type { ApiResponse } from '@app/shared';

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { accessToken, user, setUser, clear } = useAuthStore();

  useEffect(() => {
    if (!accessToken || user) return;
    api.get<ApiResponse<typeof user & { roles: string[] }>>('/auth/me')
      .then((r) => setUser(unwrap(r)))
      .catch(() => clear());
  }, [accessToken, user, setUser, clear]);

  if (!accessToken) return <Navigate to="/admin/login" replace />;
  if (user && !user.roles.some((r) => r === 'admin' || r === 'super_admin')) {
    return <div className="p-10 text-center text-red-600">无管理员权限</div>;
  }
  return <>{children}</>;
}
