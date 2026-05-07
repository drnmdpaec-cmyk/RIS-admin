import { Menu, Search } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { LanguageToggle } from './LanguageToggle';
import { AdminMenu } from './AdminMenu';

interface TopBarProps {
  onMenuClick: () => void;
}

export function TopBar({ onMenuClick }: TopBarProps) {
  return (
    <header className="h-14 shrink-0 flex items-center gap-2 px-4 border-b border-[var(--color-border)] bg-[var(--color-card)]">
      {/* Hamburger — only visible on mobile */}
      <button
        type="button"
        className="lg:hidden p-1.5 rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-border)] transition-colors"
        onClick={onMenuClick}
        aria-label="Open navigation"
      >
        <Menu size={18} />
      </button>

      <div className="flex-1 flex items-center min-w-0">
        <div className="relative w-full max-w-[256px]">
          <Search size={14} className="absolute start-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <input
            type="search"
            placeholder="Search..."
            aria-label="Global search"
            className="w-full ps-8 pe-3 py-1.5 text-[13px] rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-1 focus:ring-primary-400"
          />
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <LanguageToggle />
        <ThemeToggle />
        <div className="w-px h-4 bg-[var(--color-border)] mx-1" />
        <AdminMenu />
      </div>
    </header>
  );
}
