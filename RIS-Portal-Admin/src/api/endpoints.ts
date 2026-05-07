export const ENDPOINTS = {
  // Auth
  LOGIN: '/auth/login',
  LOGOUT: '/auth/logout',
  REFRESH: '/auth/refresh',
  MFA_VERIFY: '/auth/mfa/verify',
  MFA_BACKUP: '/auth/mfa/backup',
  MFA_EMAIL_OTP: '/auth/mfa/email-otp',
  FORGOT_PASSWORD: '/auth/forgot-password',
  RESET_PASSWORD: '/auth/reset-password',

  // Admin namespace
  USERS: '/admin/users',
  USER: (id: string) => `/admin/users/${id}`,
  USER_RESET_PASSWORD: (id: string) => `/admin/users/${id}/reset-password`,
  USER_DISABLE: (id: string) => `/admin/users/${id}/disable`,
  USER_ACTIVITY: (id: string) => `/admin/users/${id}/activity`,

  PATIENTS: '/admin/patients',
  PATIENT: (id: string) => `/admin/patients/${id}`,
  PATIENT_MERGE: '/admin/patients/merge',
  PATIENT_PORTAL_ACCESS: (id: string) => `/admin/patients/${id}/portal-access`,

  APPOINTMENTS: '/admin/appointments',
  APPOINTMENT: (id: string) => `/admin/appointments/${id}`,
  APPOINTMENT_CONFIRM: (id: string) => `/admin/appointments/${id}/confirm`,
  APPOINTMENT_RESCHEDULE: (id: string) => `/admin/appointments/${id}/reschedule`,
  APPOINTMENTS_BULK_CONFIRM: '/admin/appointments/bulk-confirm',

  REPORTS: '/admin/reports',
  REPORT: (id: string) => `/admin/reports/${id}`,
  REPORT_DELIVER: (id: string) => `/admin/reports/${id}/deliver`,
  REPORTS_BULK_DELIVER: '/admin/reports/bulk-deliver',

  AUDIT_LOGS: '/admin/audit-logs',
  SECURITY_EVENTS: '/admin/security-events',
  ACTIVE_SESSIONS: '/admin/active-sessions',
  FORCE_LOGOUT: (sessionId: string) => `/admin/active-sessions/${sessionId}/logout`,

  ANALYTICS: '/admin/analytics',

  SETTINGS_DEPARTMENT: '/admin/settings/department',
  SETTINGS_SCAN_TYPES: '/admin/settings/scan-types',
  SETTINGS_SCAN_TYPE: (id: string) => `/admin/settings/scan-types/${id}`,
  SETTINGS_PREP_INSTRUCTIONS: '/admin/settings/prep-instructions',
  SETTINGS_PREP_INSTRUCTION: (id: string) => `/admin/settings/prep-instructions/${id}`,
  SETTINGS_NOTIFICATIONS: '/admin/settings/notifications',
  SETTINGS_PACS: '/admin/settings/pacs',
  SETTINGS_PACS_CONNECTION: (id: string) => `/admin/settings/pacs/${id}`,
  SETTINGS_PACS_TEST: (id: string) => `/admin/settings/pacs/${id}/test`,
  SETTINGS_BACKUP: '/admin/settings/backup',
  SETTINGS_BACKUP_RUN: '/admin/settings/backup/run',
  SETTINGS_BRANDING: '/admin/settings/branding',

  SYSTEM_HEALTH: '/admin/system/health',
  SYSTEM_JOBS: '/admin/system/jobs',
  SYSTEM_ERRORS: '/admin/system/errors',

  DASHBOARD: '/admin/dashboard',
  NOTIFICATIONS: '/admin/notifications',

  // Live-operations layer
  UNREAD_COUNTS: '/admin/unread-counts',
  APPOINTMENTS_PENDING: '/admin/appointments/pending',
  APPOINTMENTS_TODAY: '/admin/appointments/today',
  REPORTS_PENDING: '/admin/reports/pending',
  PUSH_SUBSCRIBE: '/admin/push-subscribe',
  PUSH_UNSUBSCRIBE: '/admin/push-unsubscribe',
  PREFERENCES: '/admin/preferences',
  PREFERENCES_SNOOZE: '/admin/preferences/snooze',
} as const;
