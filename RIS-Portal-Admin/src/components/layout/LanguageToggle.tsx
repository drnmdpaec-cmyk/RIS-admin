import { useLanguage } from '@/hooks/useLanguage';

export function LanguageToggle() {
  const { language, changeLanguage } = useLanguage();
  return (
    <button
      onClick={() => changeLanguage(language === 'en' ? 'ar' : 'en')}
      className="px-2 py-1 rounded-md text-[13px] font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-border)] transition-colors"
      aria-label="Toggle language"
    >
      {language === 'en' ? 'AR' : 'EN'}
    </button>
  );
}
