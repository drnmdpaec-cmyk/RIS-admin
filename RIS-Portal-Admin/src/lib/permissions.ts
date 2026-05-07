export const PERMISSIONS = {
  USERS_MANAGE: 'users:manage',
  APPOINTMENTS_MANAGE: 'appointments:manage',
  REPORTS_DELIVER: 'reports:deliver',
  REPORTS_SIGN: 'reports:sign',
  AUDIT_VIEW: 'audit:view',
  SETTINGS_MANAGE: 'settings:manage',
  ANALYTICS_VIEW: 'analytics:view',
  BILLING_VIEW: 'billing:view',
  DICOM_MANAGE: 'dicom:manage',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export function hasPermission(userPermissions: string[], permission: Permission): boolean {
  return userPermissions.includes(permission);
}

export function hasAnyPermission(userPermissions: string[], permissions: Permission[]): boolean {
  return permissions.some((p) => userPermissions.includes(p));
}

export function hasAllPermissions(userPermissions: string[], permissions: Permission[]): boolean {
  return permissions.every((p) => userPermissions.includes(p));
}
