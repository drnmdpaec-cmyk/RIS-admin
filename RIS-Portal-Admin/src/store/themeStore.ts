import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Theme } from '@/types/common';
import { STORAGE_PREFIX, DEFAULT_THEME } from '@/lib/constants';

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggle: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: DEFAULT_THEME as Theme,
      setTheme: (theme) => {
        document.documentElement.classList.toggle('dark', theme === 'dark');
        set({ theme });
      },
      toggle: () => {
        const next = get().theme === 'light' ? 'dark' : 'light';
        get().setTheme(next);
      },
    }),
    { name: `${STORAGE_PREFIX}theme` }
  )
);
