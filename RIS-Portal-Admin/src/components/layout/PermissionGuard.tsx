import type { ReactNode } from 'react';
import { usePermission } from '@/hooks/usePermission';
import type { Permission } from '@/lib/permissions';

interface Props {
  requires: Permission;
  fallback?: ReactNode;
  children: ReactNode;
}

export function PermissionGuard({ requires, fallback = null, children }: Props) {
  const allowed = usePermission(requires);
  return allowed ? <>{children}</> : <>{fallback}</>;
}
