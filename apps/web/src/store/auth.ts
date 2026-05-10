import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AuthUser {
  id: string;
  email: string;
  nickname?: string | null;
  roles: string[];
  permissions: string[];
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  setTokens: (a: string, r: string) => void;
  setUser: (u: AuthUser | null) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      setTokens: (a, r) => set({ accessToken: a, refreshToken: r }),
      setUser: (u) => set({ user: u }),
      clear: () => set({ accessToken: null, refreshToken: null, user: null }),
    }),
    { name: 'app-auth' },
  ),
);
