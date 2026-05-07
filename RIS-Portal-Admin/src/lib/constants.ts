export const APP_NAME = import.meta.env.VITE_APP_NAME ?? 'Nuclear Medicine Admin Portal';
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';
export const DEFAULT_LANGUAGE = import.meta.env.VITE_DEFAULT_LANGUAGE ?? 'en';
export const SUPPORTED_LANGUAGES = (import.meta.env.VITE_SUPPORTED_LANGUAGES ?? 'en,ar').split(',');
export const DEFAULT_THEME = import.meta.env.VITE_DEFAULT_THEME ?? 'light';
export const INACTIVITY_TIMEOUT_MS =
  Number(import.meta.env.VITE_INACTIVITY_TIMEOUT_MINUTES ?? 15) * 60 * 1000;
export const INACTIVITY_WARNING_MS =
  Number(import.meta.env.VITE_INACTIVITY_WARNING_MINUTES ?? 2) * 60 * 1000;
export const REQUIRE_MFA_ROLES = (import.meta.env.VITE_REQUIRE_MFA_ROLES ?? 'ADMIN,RADIOLOGIST').split(',');
export const PATIENT_PORTAL_URL = import.meta.env.VITE_PATIENT_PORTAL_URL ?? 'https://ris.yourdomain.com';
export const DOCTOR_PORTAL_URL = import.meta.env.VITE_DOCTOR_PORTAL_URL ?? 'https://ris.yourdomain.com/doctor';
export const TIMEZONE = import.meta.env.VITE_TIMEZONE ?? 'Asia/Kuwait';
export const MAX_EXPORT_ROWS = Number(import.meta.env.VITE_MAX_EXPORT_ROWS ?? 10000);
export const DEFAULT_PAGE_SIZE = Number(import.meta.env.VITE_DEFAULT_PAGE_SIZE ?? 50);

export const ADMIN_USER_TYPES = ['ADMIN', 'STAFF', 'RADIOLOGIST'] as const;
export const REJECTED_USER_TYPES = ['PATIENT', 'REFERRING_DOCTOR'] as const;

export const STORAGE_PREFIX = 'ris-admin:';
