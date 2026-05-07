import { create } from 'zustand';
import type { User } from '@/types/user';
import { STORAGE_PREFIX } from '@/lib/constants';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
  updatePermissions: (permissions: string[]) => void;
}

function clearAdminStorage() {
  // Remove all ris-admin: keys so the next user on a shared device
  // does not inherit saved views, filters, or preferences (21 CFR Part 11 §11.3(b)(4))
  Object.keys(localStorage)
    .filter((k) => k.startsWith(STORAGE_PREFIX))
    .forEach((k) => localStorage.removeItem(k));
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,

  setAuth: (user, accessToken) => set({ user, accessToken, isAuthenticated: true }),

  clearAuth: () => {
    clearAdminStorage();
    set({ user: null, accessToken: null, isAuthenticated: false });
  },

  updatePermissions: (permissions) =>
    set((state) => ({
      user: state.user ? { ...state.user, permissions } : null,
    })),
}));
