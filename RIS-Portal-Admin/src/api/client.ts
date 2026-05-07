import axios, { type AxiosError } from 'axios';
import { API_BASE_URL, STORAGE_PREFIX } from '@/lib/constants';
import { useAuthStore } from '@/store/authStore';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

function forceLogout() {
  // Clear all ris-admin localStorage keys before redirect (21 CFR Part 11 §11.3(b)(4))
  Object.keys(localStorage)
    .filter((k) => k.startsWith(STORAGE_PREFIX))
    .forEach((k) => localStorage.removeItem(k));
  useAuthStore.getState().clearAuth();
  window.location.replace('/admin/login');
}

apiClient.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const originalRequest = error.config as typeof error.config & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve) => {
          refreshQueue.push((token) => {
            if (originalRequest.headers) originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(apiClient(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const res = await apiClient.post<{ access_token: string }>('/auth/refresh');
        const { access_token } = res.data;

        // Guard: user must still be present in store after refresh
        const currentUser = useAuthStore.getState().user;
        if (!currentUser) {
          forceLogout();
          return Promise.reject(error);
        }

        useAuthStore.getState().setAuth(currentUser, access_token);
        refreshQueue.forEach((cb) => cb(access_token));
        refreshQueue = [];
        if (originalRequest.headers) originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return apiClient(originalRequest);
      } catch {
        forceLogout();
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }

    if (error.response?.status === 403) {
      window.location.replace('/admin/forbidden');
      return Promise.reject(error);
    }

    return Promise.reject(error);
  }
);

/** Extract the most specific error message from an Axios error response. */
export function getApiErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const axiosErr = err as AxiosError<{ detail?: string; message?: string }>;
    const data = axiosErr.response?.data;
    if (data?.detail) return data.detail;
    if (data?.message) return data.message;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}
