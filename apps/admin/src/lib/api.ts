import axios, { AxiosError } from 'axios';
import type { ApiResponse } from '@app/shared';
import { useAuthStore } from '../store/auth';

const baseURL = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000') + '/api';
export const api = axios.create({ baseURL });

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

function forceLogout(reason?: string) {
  const had = useAuthStore.getState().accessToken;
  useAuthStore.getState().clear();
  if (had && typeof window !== 'undefined' && !window.location.pathname.startsWith('/admin/login')) {
    const target = reason ? `/admin/login?reason=${encodeURIComponent(reason)}` : '/admin/login';
    window.location.replace(target);
  }
}

let refreshing: Promise<string | null> | null = null;
api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError<ApiResponse>) => {
    const original = error.config;
    const status = error.response?.status;
    const url = original?.url ?? '';

    if (status === 401 && url.includes('/auth/refresh')) {
      forceLogout('session_expired');
      return Promise.reject(error);
    }

    if (status === 401 && original && !(original as { _retry?: boolean })._retry) {
      const rt = useAuthStore.getState().refreshToken;
      if (!rt) {
        forceLogout();
        return Promise.reject(error);
      }
      (original as { _retry?: boolean })._retry = true;
      refreshing ??= refreshAccess(rt).finally(() => {
        refreshing = null;
      });
      const token = await refreshing;
      if (token) {
        original.headers!.Authorization = `Bearer ${token}`;
        return api.request(original);
      }
      forceLogout('session_expired');
      return Promise.reject(error);
    }
    return Promise.reject(error);
  },
);

async function refreshAccess(rt: string): Promise<string | null> {
  try {
    const r = await axios.post<ApiResponse<{ accessToken: string; refreshToken: string }>>(
      `${baseURL}/auth/refresh`,
      { refreshToken: rt },
    );
    if (!r.data.content) return null;
    useAuthStore.getState().setTokens(r.data.content.accessToken, r.data.content.refreshToken);
    return r.data.content.accessToken;
  } catch {
    return null;
  }
}

export function unwrap<T>(resp: { data: ApiResponse<T> }): T {
  return resp.data.content;
}
