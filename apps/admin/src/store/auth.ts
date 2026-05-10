import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AdminUser {
  id: string;
  email: string;
  roles: string[];
  permissions: string[];
}

interface State {
  accessToken: string | null;
  refreshToken: string | null;
  user: AdminUser | null;
  setTokens: (a: string, r: string) => void;
  setUser: (u: AdminUser | null) => void;
  clear: () => void;
}

export const useAuthStore = create<State>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      setTokens: (a, r) => set({ accessToken: a, refreshToken: r }),
      setUser: (u) => set({ user: u }),
      clear: () => set({ accessToken: null, refreshToken: null, user: null }),
    }),
    { name: 'admin-auth' },
  ),
);
