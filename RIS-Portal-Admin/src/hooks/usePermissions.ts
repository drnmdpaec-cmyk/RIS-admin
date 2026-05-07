import { useAuthStore } from '@/store/authStore';
import { hasAnyPermission, hasAllPermissions, type Permission } from '@/lib/permissions';

export function usePermissions() {
  const user = useAuthStore((s) => s.user);
  const permissions = user?.permissions ?? [];

  return {
    permissions,
    can: (p: Permission) => permissions.includes(p),
    canAny: (ps: Permission[]) => hasAnyPermission(permissions, ps),
    canAll: (ps: Permission[]) => hasAllPermissions(permissions, ps),
  };
}
