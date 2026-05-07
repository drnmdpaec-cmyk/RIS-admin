import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { isAdminUserType } from '@/lib/security';
import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

export function AdminAuthGuard({ children }: Props) {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user && !isAdminUserType(user.user_type)) {
    return <Navigate to="/forbidden" replace />;
  }

  return <>{children}</>;
}
