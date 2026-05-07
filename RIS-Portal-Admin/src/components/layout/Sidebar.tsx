import { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  Calendar,
  Users,
  UserRound,
  FileText,
  BarChart3,
  Shield,
  Settings,
  Server,
  ClipboardList,
  CheckSquare,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePermissions } from '@/hooks/usePermissions';
import { PERMISSIONS } from '@/lib/permissions';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  permission?: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const { t } = useTranslation(['common', 'operations', 'users', 'patients', 'appointments', 'reports', 'analytics', 'audit', 'settings']);
  const { can } = usePermissions();

  // Close sidebar on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Lock body scroll while mobile sidebar is open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const groups: NavGroup[] = [
    {
      label: t('operations:title'),
      items: [
        { label: t('operations:dashboard'), href: '/dashboard', icon: LayoutDashboard },
        { label: t('operations:scheduleView'), href: '/appointments/calendar', icon: Calendar },
        {
          label: t('appointments:pendingConfirmations'),
          href: '/appointments/pending',
          icon: CheckSquare,
          permission: PERMISSIONS.APPOINTMENTS_MANAGE,
        },
      ],
    },
    {
      label: t('users:title'),
      items: [
        {
          label: t('users:title'),
          href: '/users',
          icon: Users,
          permission: PERMISSIONS.USERS_MANAGE,
        },
      ],
    },
    {
      label: t('patients:title'),
      items: [
        { label: t('patients:title'), href: '/patients', icon: UserRound },
      ],
    },
    {
      label: t('reports:title'),
      items: [
        {
          label: t('reports:pendingDelivery'),
          href: '/reports/pending',
          icon: ClipboardList,
          permission: PERMISSIONS.REPORTS_DELIVER,
        },
        { label: t('reports:title'), href: '/reports', icon: FileText },
      ],
    },
    {
      label: t('analytics:title'),
      items: [
        {
          label: t('analytics:title'),
          href: '/analytics',
          icon: BarChart3,
          permission: PERMISSIONS.ANALYTICS_VIEW,
        },
      ],
    },
    {
      label: t('audit:title'),
      items: [
        {
          label: t('audit:title'),
          href: '/audit',
          icon: Shield,
          permission: PERMISSIONS.AUDIT_VIEW,
        },
        {
          label: t('audit:securityEvents'),
          href: '/audit/security',
          icon: Shield,
          permission: PERMISSIONS.AUDIT_VIEW,
        },
      ],
    },
    {
      label: t('settings:title'),
      items: [
        {
          label: t('settings:title'),
          href: '/settings/department',
          icon: Settings,
          permission: PERMISSIONS.SETTINGS_MANAGE,
        },
        { label: 'System', href: '/system/health', icon: Server },
      ],
    },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'h-full overflow-y-auto border-e border-[var(--color-border)] bg-[var(--color-sidebar)] flex flex-col',
          'w-[260px] shrink-0',
          // Mobile: fixed overlay, slides in from the start edge
          'fixed lg:relative z-50 lg:z-auto top-0 start-0',
          'transition-transform duration-200 ease-in-out',
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
        aria-label="Main navigation"
      >
        <div className="px-4 py-5 border-b border-[var(--color-border)] flex items-center justify-between">
          <span className="text-primary-600 font-semibold text-sm tracking-wide uppercase">
            NM Admin
          </span>
          {/* Close button — only visible on mobile */}
          <button
            type="button"
            className="lg:hidden p-1 rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-border)] transition-colors"
            onClick={onClose}
            aria-label="Close navigation"
          >
            <X size={16} />
          </button>
        </div>

        <nav className="flex-1 px-2 py-3 space-y-4">
          {groups.map((group) => {
            const visibleItems = group.items.filter(
              (item) => !item.permission || can(item.permission as Parameters<typeof can>[0])
            );
            if (visibleItems.length === 0) return null;

            return (
              <div key={group.label}>
                <p className="px-3 mb-1 text-[11px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">
                  {group.label}
                </p>
                <ul className="space-y-0.5">
                  {visibleItems.map((item) => (
                    <li key={item.href}>
                      <NavLink
                        to={item.href}
                        onClick={onClose}
                        className={({ isActive }) =>
                          cn(
                            'flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] transition-colors',
                            isActive
                              ? 'bg-primary-50 text-primary-700 font-medium'
                              : 'text-[var(--color-text-muted)] hover:bg-[var(--color-border)] hover:text-[var(--color-text)]'
                          )
                        }
                      >
                        <item.icon size={15} strokeWidth={1.75} />
                        {item.label}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
