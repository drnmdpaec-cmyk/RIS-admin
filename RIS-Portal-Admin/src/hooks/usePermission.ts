import { useAuthStore } from '@/store/authStore';
import { hasPermission, type Permission } from '@/lib/permissions';

export function usePermission(permission: Permission): boolean {
  const user = useAuthStore((s) => s.user);
  if (!user) return false;
  return hasPermission(user.permissions, permission);
}
