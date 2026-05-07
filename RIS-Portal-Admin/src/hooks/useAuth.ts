import { useAuthStore } from '@/store/authStore';
import { apiClient } from '@/api/client';
import { ENDPOINTS } from '@/api/endpoints';

export function useAuth() {
  const { user, isAuthenticated, setAuth, clearAuth } = useAuthStore();

  const logout = async () => {
    try {
      await apiClient.post(ENDPOINTS.LOGOUT);
    } finally {
      clearAuth();
    }
  };

  return { user, isAuthenticated, logout, setAuth, clearAuth };
}
