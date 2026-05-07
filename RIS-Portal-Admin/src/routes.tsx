import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { LoginPage } from '@/pages/auth/LoginPage';
import { MfaPage } from '@/pages/auth/MfaPage';
import { ForbiddenPage } from '@/pages/errors/ForbiddenPage';
import { NotFoundPage } from '@/pages/errors/NotFoundPage';
import { ErrorPage } from '@/pages/errors/ErrorPage';
import { PlaceholderPage } from '@/pages/_placeholder';
import { DashboardPage } from '@/pages/DashboardPage';
import { PermissionGuard } from '@/components/layout/PermissionGuard';
import { PERMISSIONS } from '@/lib/permissions';

const ForgotPasswordPage = lazy(() =>
  import('@/pages/auth/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage }))
);

export const routes: RouteObject[] = [
  // Auth routes (no shell)
  { path: '/login', element: <LoginPage />, errorElement: <ErrorPage /> },
  { path: '/mfa', element: <MfaPage />, errorElement: <ErrorPage /> },
  {
    path: '/forgot-password',
    element: <ForgotPasswordPage />,
    errorElement: <ErrorPage />,
  },
  { path: '/forbidden', element: <ForbiddenPage /> },

  // Authenticated shell
  {
    path: '/',
    element: <AppShell />,
    errorElement: <ErrorPage />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'dashboard', element: <DashboardPage /> },

      // Operations
      {
        path: 'appointments',
        children: [
          { index: true, element: <PlaceholderPage title="All Appointments" /> },
          {
            path: 'pending',
            element: (
              <PermissionGuard requires={PERMISSIONS.APPOINTMENTS_MANAGE}>
                <PlaceholderPage title="Pending Confirmations" />
              </PermissionGuard>
            ),
          },
          { path: 'calendar', element: <PlaceholderPage title="Appointments Calendar" /> },
          { path: ':id', element: <PlaceholderPage title="Appointment Detail" /> },
        ],
      },

      // Users
      {
        path: 'users',
        children: [
          {
            index: true,
            element: (
              <PermissionGuard requires={PERMISSIONS.USERS_MANAGE}>
                <PlaceholderPage title="Users Management" />
              </PermissionGuard>
            ),
          },
          { path: ':id', element: <PlaceholderPage title="User Detail" /> },
          { path: 'roles', element: <PlaceholderPage title="Roles" /> },
        ],
      },

      // Patients
      {
        path: 'patients',
        children: [
          { index: true, element: <PlaceholderPage title="Patient Management" /> },
          { path: ':id', element: <PlaceholderPage title="Patient Detail" /> },
          { path: 'import', element: <PlaceholderPage title="Import Patients" /> },
        ],
      },

      // Reports
      {
        path: 'reports',
        children: [
          { index: true, element: <PlaceholderPage title="All Reports" /> },
          {
            path: 'pending',
            element: (
              <PermissionGuard requires={PERMISSIONS.REPORTS_DELIVER}>
                <PlaceholderPage title="Reports Pending Delivery" />
              </PermissionGuard>
            ),
          },
          { path: 'history', element: <PlaceholderPage title="Delivery History" /> },
          { path: ':id', element: <PlaceholderPage title="Report Detail" /> },
        ],
      },

      // Analytics
      {
        path: 'analytics',
        children: [
          {
            index: true,
            element: (
              <PermissionGuard requires={PERMISSIONS.ANALYTICS_VIEW}>
                <PlaceholderPage title="Analytics Overview" />
              </PermissionGuard>
            ),
          },
          { path: 'metrics', element: <PlaceholderPage title="Operational Metrics" /> },
          { path: 'portal', element: <PlaceholderPage title="Portal Adoption" /> },
          { path: 'exports', element: <PlaceholderPage title="Exports" /> },
        ],
      },

      // Audit
      {
        path: 'audit',
        children: [
          {
            index: true,
            element: (
              <PermissionGuard requires={PERMISSIONS.AUDIT_VIEW}>
                <PlaceholderPage title="Audit Log" />
              </PermissionGuard>
            ),
          },
          { path: 'security', element: <PlaceholderPage title="Security Events" /> },
          { path: 'phi', element: <PlaceholderPage title="PHI Access Report" /> },
          { path: 'compliance', element: <PlaceholderPage title="Compliance Report" /> },
        ],
      },

      // Settings
      {
        path: 'settings',
        children: [
          {
            index: true,
            element: (
              <PermissionGuard requires={PERMISSIONS.SETTINGS_MANAGE}>
                <PlaceholderPage title="Settings" />
              </PermissionGuard>
            ),
          },
          { path: 'department', element: <PlaceholderPage title="Department Settings" /> },
          { path: 'scan-types', element: <PlaceholderPage title="Scan Types" /> },
          { path: 'prep-instructions', element: <PlaceholderPage title="Prep Instructions" /> },
          { path: 'notifications', element: <PlaceholderPage title="Notification Templates" /> },
          { path: 'pacs', element: <PlaceholderPage title="PACS Connections" /> },
          { path: 'backup', element: <PlaceholderPage title="Backup Settings" /> },
          { path: 'branding', element: <PlaceholderPage title="Branding" /> },
        ],
      },

      // System
      {
        path: 'system',
        children: [
          { index: true, element: <PlaceholderPage title="System Health" /> },
          { path: 'health', element: <PlaceholderPage title="System Health" /> },
          { path: 'jobs', element: <PlaceholderPage title="Background Jobs" /> },
          { path: 'errors', element: <PlaceholderPage title="Error Logs" /> },
        ],
      },

      { path: '*', element: <NotFoundPage /> },
    ],
  },
];
