import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Language } from '@/types/common';
import { STORAGE_PREFIX, DEFAULT_LANGUAGE } from '@/lib/constants';

interface LanguageState {
  language: Language;
  setLanguage: (lang: Language) => void;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      language: DEFAULT_LANGUAGE as Language,
      setLanguage: (language) => {
        document.documentElement.lang = language;
        document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
        set({ language });
      },
    }),
    { name: `${STORAGE_PREFIX}language` }
  )
);
