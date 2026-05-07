import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLanguageStore } from '@/store/languageStore';
import type { Language } from '@/types/common';

export function useLanguage() {
  const { language, setLanguage } = useLanguageStore();
  const { i18n } = useTranslation();

  const changeLanguage = (lang: Language) => {
    void i18n.changeLanguage(lang);
    setLanguage(lang);
  };

  useEffect(() => {
    void i18n.changeLanguage(language);
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  }, [language, i18n]);

  return { language, changeLanguage, isRtl: language === 'ar' };
}
