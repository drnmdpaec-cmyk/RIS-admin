import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { AdminAuthGuard } from '@/components/auth/AdminAuthGuard';
import { useIdleTimer } from '@/hooks/useIdleTimer';
import { useTabTitleBadge } from '@/hooks/useTabTitleBadge';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

function IdleMonitor() {
  const { logout } = useAuth();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useIdleTimer({
    enabled: isAuthenticated,
    onWarning: () => {
      toast('You will be signed out in 2 minutes due to inactivity.', {
        icon: '⚠️',
        duration: 10000,
        id: 'idle-warning',
      });
    },
    onIdle: () => {
      toast.dismiss('idle-warning');
      void logout();
    },
  });

  return null;
}

function TabBadge() {
  useTabTitleBadge();
  return null;
}

export function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <AdminAuthGuard>
      <IdleMonitor />
      <TabBadge />
      <div className="flex h-screen overflow-hidden">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden lg:ms-0">
          <TopBar onMenuClick={() => setSidebarOpen(true)} />
          <main className="flex-1 overflow-y-auto p-4 bg-[var(--color-bg)]">
            <Outlet />
          </main>
        </div>
      </div>
    </AdminAuthGuard>
  );
}
