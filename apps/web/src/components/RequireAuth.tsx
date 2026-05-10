import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useAuthStore } from '../store/auth';
import { api, unwrap } from '../lib/api';
import type { ApiResponse } from '@app/shared';

export function RequireAuth({ children }: { children: ReactNode }) {
  const { accessToken, user, setUser, clear } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    if (!accessToken) return;
    if (user) return;
    api
      .get<ApiResponse<typeof user>>('/auth/me')
      .then((r) => setUser(unwrap(r)))
      .catch(() => clear());
  }, [accessToken, user, setUser, clear]);

  if (!accessToken) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}
