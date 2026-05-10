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

api.interceptors.response.use(
  (resp) => resp,
  async (error: AxiosError<ApiResponse>) => {
    const original = error.config;
    if (error.response?.status === 401 && original && !(original as { _retry?: boolean })._retry) {
      const refreshToken = useAuthStore.getState().refreshToken;
      if (!refreshToken) {
        useAuthStore.getState().clear();
        return Promise.reject(error);
      }
      (original as { _retry?: boolean })._retry = true;
      refreshing ??= refreshAccessToken(refreshToken)
        .catch((e) => {
          useAuthStore.getState().clear();
          throw e;
        })
        .finally(() => {
          refreshing = null;
        });
      const newToken = await refreshing;
      if (newToken) {
        original.headers!.Authorization = `Bearer ${newToken}`;
        return api.request(original);
      }
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
