import axios, { AxiosError } from 'axios';
import type { ApiResponse } from '@app/shared';
import { useAuthStore } from '../store/auth';

const baseURL = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000') + '/api';

export const api = axios.create({ baseURL, withCredentials: false });

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshing: Promise<string | null> | null = null;

function forceLogout(reason?: string) {
  const had = useAuthStore.getState().accessToken;
  useAuthStore.getState().clear();
  if (had && typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
    const target = reason ? `/login?reason=${encodeURIComponent(reason)}` : '/login';
    window.location.replace(target);
  }
}

api.interceptors.response.use(
  (resp) => resp,
  async (error: AxiosError<ApiResponse>) => {
    const original = error.config;
    const status = error.response?.status;
    const url = original?.url ?? '';

    // refresh 接口本身 401 → 直接登出
    if (status === 401 && url.includes('/auth/refresh')) {
      forceLogout('session_expired');
      return Promise.reject(error);
    }

    if (status === 401 && original && !(original as { _retry?: boolean })._retry) {
      const refreshToken = useAuthStore.getState().refreshToken;
      if (!refreshToken) {
        forceLogout();
        return Promise.reject(error);
      }
      (original as { _retry?: boolean })._retry = true;
      refreshing ??= refreshAccessToken(refreshToken).finally(() => {
        refreshing = null;
      });
      const newToken = await refreshing;
      if (newToken) {
        original.headers!.Authorization = `Bearer ${newToken}`;
        return api.request(original);
      }
      // refresh 失败：登出 + 跳转
      forceLogout('session_expired');
      return Promise.reject(error);
    }
    return Promise.reject(error);
  },
);

async function refreshAccessToken(refreshToken: string): Promise<string | null> {
  try {
    const resp = await axios.post<ApiResponse<{ accessToken: string; refreshToken: string }>>(
      `${baseURL}/auth/refresh`,
      { refreshToken },
    );
    const data = resp.data.content;
    if (!data) return null;
    useAuthStore.getState().setTokens(data.accessToken, data.refreshToken);
    return data.accessToken;
  } catch {
    return null;
  }
}

export function unwrap<T>(resp: { data: ApiResponse<T> }): T {
  return resp.data.content;
}
