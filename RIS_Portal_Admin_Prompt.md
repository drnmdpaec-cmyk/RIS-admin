# Claude Code Prompt — RIS-Portal-Admin React Frontend

> **Nuclear Medicine Department — Administrative Web Portal**
> Paste this entire file content into the Claude Code terminal inside your `RIS-Portal-Admin` folder.

---

You are a senior frontend engineer building the administrative web portal for a Nuclear Medicine Department in Kuwait. This is the third React app in a three-portal system, deployed under `/admin/` on the same domain as the patient and doctor portals.

This portal serves department administrators, supervisors, and senior staff. It is NOT for daily clinical operations — those happen in the desktop RIS app. The web admin portal exists for tasks that need to be done from anywhere (home, between hospitals, mobile) or that require a wider/aggregate view than the desktop app provides.

Build ONLY this frontend. The FastAPI backend (RIS-Backend) and the two sister portals (RIS-Portal and RIS-Portal-Doctor) already exist.

---

## Key architectural facts

**Deployment context:**
- Served at: `https://ris.yourdomain.com/admin/`
- Built assets deployed to: `/var/www/ris-portal-admin/`
- Vite `base` config: `/admin/`
- React Router `basename`: `/admin`
- Backend API base: `https://ris.yourdomain.com/api/v1` (same backend as the other two portals)
- Dev port: `5175` (so all three portals run side-by-side: patient 5173, doctor 5174, admin 5175)

**User types accepted:** `ADMIN`, `STAFF`, `RADIOLOGIST` (with permission flags differentiating what each can see). Reject `PATIENT` and `REFERRING_DOCTOR` immediately on login.

**Permission model:** the backend will return a `permissions: string[]` array in the JWT for each admin user. Examples:
- `users:manage` — create/edit/disable users
- `appointments:manage` — confirm, reschedule, cancel appointments on behalf of patients
- `reports:deliver` — mark reports as delivered to patient portal
- `reports:sign` — sign reports (radiologists only)
- `audit:view` — view audit logs and security events
- `settings:manage` — modify department settings, prep instructions, scan types
- `analytics:view` — view dashboards and reports
- `billing:view` — view billing data (Phase 2)
- `dicom:manage` — manage PACS connections, DICOMweb settings

The frontend hides menu items and pages that the user lacks permissions for. Never trust the frontend for security — backend enforces. But hiding unavailable features keeps the UI clean.

---

## Tech Stack

Same baseline as the doctor portal — keep all three apps technically aligned:

- **Vite 5** + **React 18** + **TypeScript 5** (strict mode)
- **TanStack Query (React Query) v5**
- **Zustand** for client state
- **React Router v6** with lazy-loaded routes (basename: `/admin`)
- **Tailwind CSS 3.4** with shared design tokens
- **shadcn/ui** components (copy into project)
- **Framer Motion** for transitions
- **react-hook-form** + **zod** for forms
- **i18next** + **react-i18next**
- **date-fns** with `ar` and `en-GB` locales
- **axios** with interceptors
- **lucide-react** icons
- **react-hot-toast** notifications
- **@tanstack/react-table** v8 — heavy use here, more than doctor portal
- **recharts** for analytics dashboards
- **dayjs** for time-zone-aware datetime handling (Kuwait is UTC+3)
- **react-pdf** for previewing PDF reports
- **papaparse** for CSV import/export
- **xlsx** (SheetJS) for Excel export

Do NOT use: Material-UI, Bootstrap, Ant Design, Redux, Next.js.

---

## Design System — "Operations Dashboard"

Distinct visual identity from the other two portals. Patient portal is calm. Doctor portal is dense clinical. Admin portal is **operations-grade** — think GitHub admin, Linear's settings, Stripe Dashboard.

### Differences from sister portals

| Aspect | Patient | Doctor | Admin |
|---|---|---|---|
| Density | Low (spacious) | High (clinical) | Very high (operational) |
| Default theme | Light | Dark | Light (admin work happens during day) |
| Primary nav | Bottom tabs / top bar | Left sidebar | Left sidebar with grouped sections |
| Page layout | Single column | Two-pane | Multi-pane, dashboards |
| Tables | Cards | Data tables | Advanced tables with filters/saved views |
| Bulk actions | None | Minimal | Extensive (bulk approve, bulk export) |
| Data export | None | Limited | CSV, Excel, PDF everywhere |

### Color tokens

Same brand colors across all three portals. Admin uses a slightly cooler neutral palette:

```
primary: { 50–950 } — same as other portals (#2E75B6 base)
accent:  { 50–950 } — same as other portals (#1A7A6B base)
warning: { 50–950 } — same
danger:  { 50–950 } — same
success: { 50–950 } — same as accent
neutral: { 50–950 } — slightly cooler slate

Light theme background: #F7F8FA (slightly cooler than patient portal's #FAFBFC)
Light card background: #FFFFFF
Light sidebar: #F0F2F6
Dark theme background: #0A0F1C
Dark card background: #131A2A
Dark sidebar: #0E1422
```

### Typography

- "Inter" + "IBM Plex Sans Arabic" + "JetBrains Mono"
- Base font size: **13px** (denser than even the doctor portal — admin views show a lot of data)
- Compact line-height: 1.5
- Mono font used heavily for IDs, accession numbers, audit timestamps, file sizes

### Layout

- Persistent left sidebar: 260px (wider than doctor portal's 240px to fit grouped sections)
- Sidebar sections: Operations, Users, Reports, Analytics, Audit, Settings
- Top bar: 56px with global search + theme toggle + language toggle + admin user menu
- Main content: density-aware padding (12–16px)
- Multi-pane allowed: list + detail, master + detail, etc.

### Motion

Restrained:
- Page transitions: 100ms fade only
- No scale/hover animations on data table rows
- Loading: skeleton screens for tables, inline spinner for buttons
- No celebration animations anywhere — operations only

---

## Vite configuration

`vite.config.ts`:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  base: '/admin/',
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') }
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'tanstack': ['@tanstack/react-query', '@tanstack/react-table'],
          'forms': ['react-hook-form', 'zod', '@hookform/resolvers'],
          'charts': ['recharts'],
          'export': ['papaparse', 'xlsx'],
          'pdf': ['react-pdf']
        }
      }
    }
  },
  server: {
    port: 5175,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true
      }
    }
  }
});
```

`App.tsx`:
```typescript
<BrowserRouter basename="/admin">
  <Routes>...</Routes>
</BrowserRouter>
```

---

## Folder Structure

```
RIS-Portal-Admin/
├── public/
│   ├── favicon.svg
│   └── og-image.png
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── routes.tsx
│   │
│   ├── api/
│   │   ├── client.ts
│   │   ├── endpoints.ts
│   │   ├── queries/
│   │   │   ├── useAuth.ts
│   │   │   ├── useUsers.ts
│   │   │   ├── usePatients.ts
│   │   │   ├── useAppointments.ts
│   │   │   ├── useReports.ts
│   │   │   ├── useAuditLogs.ts
│   │   │   ├── useAnalytics.ts
│   │   │   ├── useSettings.ts
│   │   │   └── useNotifications.ts
│   │   └── types.ts
│   │
│   ├── components/
│   │   ├── ui/                       # shadcn/ui primitives
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── select.tsx
│   │   │   ├── command.tsx
│   │   │   ├── table.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── tooltip.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── skeleton.tsx
│   │   │   ├── popover.tsx
│   │   │   ├── sheet.tsx
│   │   │   ├── scroll-area.tsx
│   │   │   ├── checkbox.tsx
│   │   │   ├── switch.tsx
│   │   │   ├── radio-group.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── alert-dialog.tsx
│   │   │   ├── progress.tsx
│   │   │   ├── separator.tsx
│   │   │   └── [more as needed]
│   │   │
│   │   ├── layout/
│   │   │   ├── AppShell.tsx
│   │   │   ├── Sidebar.tsx           # Grouped sections
│   │   │   ├── TopBar.tsx
│   │   │   ├── GlobalSearchCommand.tsx  # Cmd+K
│   │   │   ├── LanguageToggle.tsx
│   │   │   ├── ThemeToggle.tsx
│   │   │   ├── AdminMenu.tsx
│   │   │   ├── PermissionGuard.tsx   # Wraps routes/components
│   │   │   └── Breadcrumbs.tsx
│   │   │
│   │   ├── auth/
│   │   │   ├── LoginForm.tsx
│   │   │   ├── MfaChallenge.tsx
│   │   │   ├── ForgotPasswordForm.tsx
│   │   │   └── AdminAuthGuard.tsx
│   │   │
│   │   ├── data-table/               # Reusable advanced table
│   │   │   ├── DataTable.tsx
│   │   │   ├── DataTableToolbar.tsx
│   │   │   ├── DataTableFilters.tsx
│   │   │   ├── DataTableColumnHeader.tsx
│   │   │   ├── DataTablePagination.tsx
│   │   │   ├── DataTableViewOptions.tsx
│   │   │   ├── DataTableExport.tsx
│   │   │   ├── DataTableBulkActions.tsx
│   │   │   ├── DataTableSavedViews.tsx
│   │   │   └── DataTableRowActions.tsx
│   │   │
│   │   ├── operations/
│   │   │   ├── OperationsDashboard.tsx
│   │   │   ├── TodayAppointmentsCard.tsx
│   │   │   ├── PendingConfirmationsCard.tsx
│   │   │   ├── ReportsAwaitingDeliveryCard.tsx
│   │   │   ├── CriticalFindingsCard.tsx
│   │   │   ├── DepartmentLoadCard.tsx
│   │   │   └── DailyTimelineView.tsx
│   │   │
│   │   ├── users/
│   │   │   ├── UsersTable.tsx
│   │   │   ├── UserRowActions.tsx
│   │   │   ├── CreateUserDialog.tsx
│   │   │   ├── EditUserDialog.tsx
│   │   │   ├── DisableUserDialog.tsx
│   │   │   ├── ResetPasswordDialog.tsx
│   │   │   ├── PermissionsEditor.tsx
│   │   │   ├── RoleSelector.tsx
│   │   │   └── UserActivityPanel.tsx
│   │   │
│   │   ├── patients/
│   │   │   ├── PatientsTable.tsx
│   │   │   ├── PatientDetailHeader.tsx
│   │   │   ├── PatientEditForm.tsx
│   │   │   ├── PatientMergeDialog.tsx
│   │   │   ├── PatientImportDialog.tsx
│   │   │   └── PortalAccessControl.tsx
│   │   │
│   │   ├── appointments/
│   │   │   ├── AppointmentsTable.tsx
│   │   │   ├── ConfirmAppointmentDialog.tsx
│   │   │   ├── RescheduleAppointmentDialog.tsx
│   │   │   ├── AppointmentStatusBadge.tsx
│   │   │   ├── AppointmentCalendarView.tsx
│   │   │   ├── BulkConfirmDialog.tsx
│   │   │   └── AppointmentFilters.tsx
│   │   │
│   │   ├── reports/
│   │   │   ├── ReportsTable.tsx
│   │   │   ├── DeliverReportDialog.tsx
│   │   │   ├── BulkDeliverDialog.tsx
│   │   │   ├── ReportPreviewPanel.tsx
│   │   │   ├── ReportStatusBadge.tsx
│   │   │   ├── PendingDeliveryQueue.tsx
│   │   │   └── DeliveryStatsCard.tsx
│   │   │
│   │   ├── analytics/
│   │   │   ├── AnalyticsDashboard.tsx
│   │   │   ├── KpiCard.tsx
│   │   │   ├── DateRangePicker.tsx
│   │   │   ├── AppointmentVolumeChart.tsx
│   │   │   ├── ScanMixChart.tsx
│   │   │   ├── TurnaroundTimeChart.tsx
│   │   │   ├── PortalAdoptionChart.tsx
│   │   │   ├── DepartmentLoadHeatmap.tsx
│   │   │   └── ExportReportDialog.tsx
│   │   │
│   │   ├── audit/
│   │   │   ├── AuditLogTable.tsx
│   │   │   ├── AuditLogFilters.tsx
│   │   │   ├── AuditLogDetail.tsx
│   │   │   ├── SecurityEventsCard.tsx
│   │   │   ├── FailedLoginAttempts.tsx
│   │   │   └── PhiAccessReport.tsx
│   │   │
│   │   ├── settings/
│   │   │   ├── DepartmentInfoForm.tsx
│   │   │   ├── WorkingHoursForm.tsx
│   │   │   ├── ScanTypesManager.tsx
│   │   │   ├── PrepInstructionsEditor.tsx
│   │   │   ├── NotificationTemplatesEditor.tsx
│   │   │   ├── EmailServerSettings.tsx
│   │   │   ├── SmsProviderSettings.tsx
│   │   │   ├── PacsConnectionsList.tsx
│   │   │   ├── PacsConnectionForm.tsx
│   │   │   ├── BackupSettings.tsx
│   │   │   └── BrandingSettings.tsx
│   │   │
│   │   ├── system/
│   │   │   ├── SystemHealthDashboard.tsx
│   │   │   ├── ServiceStatusCard.tsx
│   │   │   ├── DatabaseStatusCard.tsx
│   │   │   ├── StorageUsageCard.tsx
│   │   │   ├── BackgroundJobsTable.tsx
│   │   │   └── ErrorLogsTable.tsx
│   │   │
│   │   ├── shared/
│   │   │   ├── ErrorBoundary.tsx
│   │   │   ├── LoadingSkeleton.tsx
│   │   │   ├── EmptyState.tsx
│   │   │   ├── ConfirmDialog.tsx
│   │   │   ├── PageHeader.tsx
│   │   │   ├── SectionHeader.tsx
│   │   │   ├── StatusBadge.tsx
│   │   │   ├── BilingualText.tsx
│   │   │   ├── DangerousActionConfirm.tsx
│   │   │   ├── BulkActionBar.tsx
│   │   │   └── PermissionDeniedNotice.tsx
│   │   │
│   │   └── motion/
│   │       ├── PageTransition.tsx
│   │       └── FadeIn.tsx
│   │
│   ├── pages/
│   │   ├── auth/
│   │   │   ├── LoginPage.tsx
│   │   │   ├── MfaPage.tsx
│   │   │   ├── ForgotPasswordPage.tsx
│   │   │   └── ResetPasswordPage.tsx
│   │   │
│   │   ├── DashboardPage.tsx
│   │   │
│   │   ├── operations/
│   │   │   ├── OperationsPage.tsx
│   │   │   ├── ScheduleViewPage.tsx
│   │   │   └── DepartmentLoadPage.tsx
│   │   │
│   │   ├── users/
│   │   │   ├── UsersListPage.tsx
│   │   │   ├── UserDetailPage.tsx
│   │   │   └── RolesPage.tsx
│   │   │
│   │   ├── patients/
│   │   │   ├── PatientsListPage.tsx
│   │   │   ├── PatientDetailPage.tsx
│   │   │   └── PatientImportPage.tsx
│   │   │
│   │   ├── appointments/
│   │   │   ├── AppointmentsListPage.tsx
│   │   │   ├── AppointmentDetailPage.tsx
│   │   │   ├── PendingConfirmationsPage.tsx
│   │   │   └── CalendarPage.tsx
│   │   │
│   │   ├── reports/
│   │   │   ├── ReportsListPage.tsx
│   │   │   ├── PendingDeliveryPage.tsx
│   │   │   ├── ReportDetailPage.tsx
│   │   │   └── DeliveryHistoryPage.tsx
│   │   │
│   │   ├── analytics/
│   │   │   ├── AnalyticsOverviewPage.tsx
│   │   │   ├── OperationalMetricsPage.tsx
│   │   │   ├── PortalAdoptionPage.tsx
│   │   │   └── ExportsPage.tsx
│   │   │
│   │   ├── audit/
│   │   │   ├── AuditLogPage.tsx
│   │   │   ├── SecurityEventsPage.tsx
│   │   │   ├── PhiAccessReportPage.tsx
│   │   │   └── ComplianceReportPage.tsx
│   │   │
│   │   ├── settings/
│   │   │   ├── SettingsLayout.tsx
│   │   │   ├── DepartmentPage.tsx
│   │   │   ├── ScanTypesPage.tsx
│   │   │   ├── PrepInstructionsPage.tsx
│   │   │   ├── NotificationsPage.tsx
│   │   │   ├── PacsConnectionsPage.tsx
│   │   │   ├── BackupPage.tsx
│   │   │   └── BrandingPage.tsx
│   │   │
│   │   ├── system/
│   │   │   ├── SystemHealthPage.tsx
│   │   │   ├── BackgroundJobsPage.tsx
│   │   │   └── ErrorLogsPage.tsx
│   │   │
│   │   └── errors/
│   │       ├── NotFoundPage.tsx
│   │       ├── ForbiddenPage.tsx
│   │       └── ErrorPage.tsx
│   │
│   ├── store/
│   │   ├── authStore.ts
│   │   ├── languageStore.ts
│   │   ├── themeStore.ts
│   │   ├── tableFiltersStore.ts
│   │   ├── savedViewsStore.ts
│   │   └── breadcrumbsStore.ts
│   │
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── usePermission.ts
│   │   ├── usePermissions.ts
│   │   ├── useLanguage.ts
│   │   ├── useTheme.ts
│   │   ├── useMediaQuery.ts
│   │   ├── useDebounce.ts
│   │   ├── useIdleTimer.ts
│   │   ├── useKeyboardShortcuts.ts
│   │   ├── useExportCsv.ts
│   │   ├── useExportExcel.ts
│   │   └── useLocalStorage.ts
│   │
│   ├── lib/
│   │   ├── utils.ts
│   │   ├── validators.ts
│   │   ├── formatters.ts
│   │   ├── security.ts
│   │   ├── permissions.ts
│   │   ├── constants.ts
│   │   └── export-helpers.ts
│   │
│   ├── i18n/
│   │   ├── config.ts
│   │   └── locales/
│   │       ├── en/
│   │       │   ├── common.json
│   │       │   ├── auth.json
│   │       │   ├── operations.json
│   │       │   ├── users.json
│   │       │   ├── patients.json
│   │       │   ├── appointments.json
│   │       │   ├── reports.json
│   │       │   ├── analytics.json
│   │       │   ├── audit.json
│   │       │   ├── settings.json
│   │       │   └── errors.json
│   │       └── ar/
│   │           └── (same files)
│   │
│   ├── styles/
│   │   ├── globals.css
│   │   └── fonts.css
│   │
│   └── types/
│       ├── api.ts
│       ├── user.ts
│       ├── patient.ts
│       ├── appointment.ts
│       ├── report.ts
│       ├── audit.ts
│       ├── analytics.ts
│       ├── settings.ts
│       └── common.ts
│
├── .env.example
├── .env.development
├── .gitignore
├── index.html
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.js
├── vite.config.ts
├── eslint.config.js
├── prettier.config.js
├── CLAUDE.md
└── README.md
```

---

## Phase 1 — Build in this exact order

### Page 1: Login (`/login` → `/admin/login`)

Stricter login than the other portals.

**Layout:**
- Centered card on neutral background with subtle gradient
- Department logo
- Email + password inputs
- "Remember this device" checkbox (sets a 30-day device fingerprint cookie via backend, allows skipping MFA on trusted devices)
- Login button
- Below: small text "Patient or doctor login? Visit ris.yourdomain.com"

**Behavior:**
- After valid email/password: backend returns `requires_mfa: true` and challenge token
- Redirect to `/admin/mfa` with challenge token in URL state
- If user_type is not in `[ADMIN, STAFF, RADIOLOGIST]`: show 403 page

### Page 2: MFA challenge (`/mfa`)

**Layout:**
- Single 6-digit input (auto-focus, auto-submit on 6th digit)
- "Use backup code instead" link (opens text input for backup code)
- "Send code via email" button (alternative to TOTP)
- Resend countdown timer
- "Back to login" link

**Behavior:**
- 6-digit numeric input (use one big input split visually, OTP-style)
- On 6th digit: auto-submit
- 5 failed attempts → lockout 15 minutes
- After successful MFA: redirect to dashboard

### Page 3: Operations Dashboard (`/dashboard`)

The home page after login. The most important page in the admin portal.

**Layout — desktop:**

```
┌──────────────────────────────────────────────────────────┐
│ Top bar                                                   │
├────────┬─────────────────────────────────────────────────┤
│        │ Today, Monday May 5, 2026         [Refresh icon]│
│ Side-  │                                                  │
│ bar    │ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────┐ │
│        │ │ Today's  │ │ Pending  │ │ Awaiting │ │Critical│ │
│  Ops   │ │  Appts   │ │ Confirms │ │ Delivery │ │Findings│ │
│  Users │ │   24     │ │   5      │ │   12     │ │   2   │ │
│  Pati  │ └──────────┘ └──────────┘ └──────────┘ └───────┘ │
│  Appt  │                                                   │
│  Repo  │ Department load (next 7 days):                   │
│  Anal  │ [bar chart — appointment count by day]           │
│  Audit │                                                   │
│  Sett  │ Today's schedule:                                 │
│  Sys   │ ─────────────────────────────────────────────    │
│        │ 07:30  Mr. A — FDG PET/CT          [Confirmed]   │
│        │ 08:00  Mrs. B — Bone scan          [In progress] │
│        │ 09:30  Mr. C — DOTATATE PET        [Pending]     │
│        │ ...                                                │
└────────┴─────────────────────────────────────────────────┘
```

**Cards (clickable, navigate to filtered list):**
- Today's appointments
- Pending confirmations (online bookings awaiting staff confirmation)
- Reports awaiting delivery (signed but not yet pushed to patient portal)
- Critical findings (unread by referring doctor)

**Department load chart:** stacked bar chart, next 7 days, broken down by scan type.

**Today's schedule:** time-ordered list of all of today's appointments with status. Click a row → appointment detail.

**Quick actions** in top-right of dashboard: "Confirm pending bookings", "Deliver signed reports", "Generate daily report".

### Page 4: Pending Confirmations (`/appointments/pending`)

**Layout:**
- Page header: "Pending Online Bookings" + count
- Bulk-action bar at top: "Confirm selected", "Reject selected" (visible when rows selected)
- Data table:
  - Checkbox column
  - Booking timestamp
  - Patient name
  - Patient phone
  - Civil ID (last 4)
  - Scan type
  - Requested date/time
  - Clinical indication (truncated, hover for full)
  - Confirmation code
  - Actions: Confirm, Reschedule, Reject
- Filters: scan type, requested date range
- Sort: oldest pending first (default)

**Confirm action:**
- Single click → confirms appointment, moves status from PENDING to CONFIRMED
- Triggers: confirmation email + SMS to patient
- Toast: "Appointment confirmed for [patient name]"

**Bulk confirm:**
- Select multiple rows → "Confirm 5 appointments" button
- Confirmation dialog: "Confirm 5 appointments? Patients will be notified via email and SMS."
- Progress dialog showing 1/5, 2/5, etc.

### Page 5: Appointments calendar (`/appointments/calendar`)

Full department schedule visualization.

**Layout:**
- View switcher: Day / Week / Month (top)
- Calendar grid showing scheduled appointments as blocks
- Each block: scan type icon + patient initials + time
- Color-coded by status: blue (confirmed), gray (pending), green (in progress), checkered (completed)
- Click block → appointment detail in slide-over sheet
- Drag to reschedule (with confirmation dialog)
- Filters: scan type, technologist (if assigned), camera (if multi-camera setup)

**Heatmap view** for month: each day shows bookings count with color intensity.

### Page 6: Reports — Pending delivery (`/reports/pending`)

Workflow: radiologist signs reports in desktop RIS → reports appear here for admin to push to patient portal.

**Layout:**
- Page header: "Reports Awaiting Delivery" + count
- Two-pane layout:
  - Left: list of pending reports (sortable, filterable)
  - Right: preview of selected report (PDF inline + clinical summary editable)
- Each report row shows:
  - Patient name
  - Scan type
  - Study date
  - Signed timestamp
  - Time elapsed since signing (e.g., "2 hours ago")
  - Has clinical summary? (yes/no badge — required for delivery)

**Preview pane:**
- PDF viewer (react-pdf) of the signed report
- Clinical summary editor (textarea) — admin can write/edit the patient-friendly summary in EN+AR
- Critical finding flag toggle (admin can flag if not done by radiologist)
- "Deliver to patient" button — disabled until clinical summary is filled

**Bulk delivery:**
- "Deliver all with summaries" button — delivers all reports that already have summaries written

### Page 7: Users management (`/users`)

**Layout:**
- Page header: "Users" + count + "Create user" button (if permission)
- Tabs: All / Staff / Radiologists / Doctors / Patients
- Data table:
  - Name + role badge
  - Email
  - Last login
  - Status (Active / Disabled / Locked)
  - Permissions (count, hover to see)
  - Actions dropdown: View detail, Reset password, Edit, Disable, Delete

**Create user dialog:**
- Type selector: Staff / Radiologist / Referring Doctor
- For Staff/Radiologist: full name, email, phone, role, permissions, initial password (or "Send invite email")
- For Referring Doctor: full name, specialty, institution, license number, phone, email
- "Require MFA" toggle (defaults: true for Admin and Radiologist roles)

**Edit user dialog:** same fields, plus "Reset MFA" button (forces re-enrollment).

**Disable user dialog:** type-to-confirm pattern: "Type the user's email to confirm disabling".

### Page 8: Patient Management (`/patients`)

Admin view of all patient records.

**Layout:**
- Data table with columns:
  - Name (EN + AR)
  - Civil ID (last 4)
  - DOB / Age
  - Phone
  - Email
  - Portal status: Registered / Not registered
  - Last appointment date
  - Total appointments
  - Actions: View detail, Edit, Disable portal access, Merge

**Patient detail page** (`/patients/:patientId`):
- Tabs: Overview / Appointments / Reports / Documents / Portal access / Audit
- Edit button: opens form to edit demographics
- Portal access controls:
  - "Resend portal invite" button
  - "Force password reset"
  - "Disable portal account"
  - "Reset MFA"

**Merge patients:**
- Action when duplicate records detected
- Side-by-side view of two records, admin picks which fields to keep
- Type-to-confirm pattern with civil ID
- All appointments and reports automatically migrated to surviving record

### Page 9: Analytics dashboard (`/analytics`)

**Layout:**
- Date range picker (top right): Today / This week / This month / This quarter / Custom
- KPI cards row:
  - Total appointments (count, % change vs prior period)
  - Average turnaround time (booking → report delivered)
  - Portal adoption rate (% of patients with portal accounts)
  - No-show rate
- Charts grid:
  - Appointment volume over time (line chart)
  - Scan type mix (donut chart)
  - Department load by hour-of-day (heatmap)
  - Report turnaround time distribution (histogram)
  - Portal adoption trend (line chart)
- Export buttons: PDF report, Excel data, CSV raw

### Page 10: Audit log (`/audit`)

The most security-critical page in the portal.

**Layout:**
- Page header: "Audit Log" + total count
- Filters bar: date range, user, action type, resource type, IP address, result
- Data table:
  - Timestamp (sortable, default DESC)
  - User (name + role)
  - Action (READ_REPORT, UPDATE_PATIENT, LOGIN_FAILED, etc.)
  - Resource (e.g., "Patient: A.K.")
  - IP address
  - User agent (truncated)
  - Result (success/failure with badge)
- Click row → side panel with full event detail JSON

**Saved searches:**
- "Failed logins last 7 days"
- "Reports accessed by Dr. X"
- "Patient record edits this month"

**Export:**
- CSV export with current filter applied
- Audit logs are immutable — never editable

**Critical:** the audit log is read-only in this portal. Backend prevents any deletion. Frontend never offers edit/delete actions.

### Page 11: Security events (`/audit/security`)

Subset of audit log for security-relevant events.

**Layout:**
- KPI cards: Failed logins (last 24h), Locked accounts, Suspicious patterns flagged
- Failed login attempts table: timestamp, email attempted, IP, user agent, geo (city)
- Locked accounts table: user, locked at, reason, unlock action
- "Active sessions" table: shows all currently-valid JWT tokens, with force-logout action

### Page 12: Settings (multiple pages under `/settings`)

#### `/settings/department`
- Department name (EN + AR), logo upload, address, phone, email, working days, working hours, time zone

#### `/settings/scan-types`
- Table of scan types in use
- Add/edit scan type:
  - Name (EN + AR)
  - Slot duration (minutes)
  - Daily max bookings
  - Required prep (link to prep instruction)
  - Required equipment / room
  - Active toggle

#### `/settings/prep-instructions`
- Editor for prep instructions per scan type
- Bilingual editor (EN + AR side by side)
- Markdown supported
- Preview button shows how it appears in patient portal email

#### `/settings/notifications`
- Email server settings (SMTP host, port, user, password — write-only display)
- SMS provider settings (Twilio creds — write-only)
- Notification template editor for each event type:
  - Appointment confirmation
  - Appointment reminder (with hours-before setting)
  - Report ready
  - Critical finding alert
  - Password reset
- Each template has EN + AR versions, supports variables (e.g., `{{patient_name}}`, `{{appointment_date}}`)

#### `/settings/pacs`
- List of configured PACS connections
- Add/edit PACS:
  - Name, AE title, host, port, type (DICOM SCP / DICOMweb / Orthanc)
  - Test connection button
- Active/inactive toggle

#### `/settings/backup`
- Last backup timestamp + status
- Backup schedule editor (daily/weekly + time)
- Storage destination (local path / S3 / MinIO)
- "Run backup now" button
- Restore from backup (type-to-confirm)

#### `/settings/branding`
- Department logo (light + dark version)
- Color overrides (limited — primary tint only)
- Custom email signature
- Custom letterhead for PDF reports

### Page 13: System health (`/system/health`)

**Layout:**
- Service status cards: Backend API / Database / Redis / MinIO / Orthanc / SMTP / SMS provider
- Each card shows: status (healthy/degraded/down), response time, last check
- Database card additional info: connection count, slow query count, DB size
- Storage usage card: MinIO usage by bucket, disk space remaining
- Background jobs table: Celery queue depth, recent failures
- Error logs table: last 100 errors with stack trace expandable

---

## Phase 2 — After Phase 1 is fully working

- **Billing module** — invoicing, payment tracking, insurance claims
- **Inventory module** — radiopharmaceutical orders, doses, expirations, hot lab management
- **QC module** — daily QC results entry, trends, regulatory compliance reports
- **Compliance module** — IAEA/SFDA/MOH report generation
- **Multi-department support** — for hospitals with multiple nuclear medicine sites
- **Real-time live updates** — WebSocket for live dashboard updates (instead of polling)
- **Role builder UI** — drag-drop permission editor for custom roles
- **Workflow automation** — rules engine ("if X then notify Y")
- **DICOM viewer integration** — admin can preview studies for QC purposes

---

## Security — strictest of the three portals

This portal has the highest privilege users. Security is non-negotiable.

### Authentication

- Email + password + **MFA mandatory** for ADMIN and RADIOLOGIST roles
- MFA for STAFF: optional, recommended (admin can require via setting)
- TOTP-based (Google Authenticator, Authy, 1Password) — backend handles
- Backup codes (10 single-use codes generated at MFA enrollment)
- Email-based fallback OTP if user loses TOTP device

### Sessions

- Access token in memory only (Zustand)
- Refresh token in httpOnly cookie, **path-scoped to `/admin/`**
- Auto-logout after **15 minutes** of inactivity (strictest of all three portals)
- Idle warning at 13 minutes
- "Remember this device" sets device fingerprint cookie (30 days) — allows skipping MFA on trusted devices
- Active session list visible to user; can force-logout other sessions

### Permission enforcement (frontend)

```typescript
// Wrap routes
<PermissionGuard requires="users:manage">
  <UsersListPage />
</PermissionGuard>

// Wrap components
<PermissionGuard requires="reports:deliver">
  <DeliverReportButton />
</PermissionGuard>

// Hook usage
const canManageUsers = usePermission('users:manage');
if (!canManageUsers) return null;
```

Permission checks happen at:
1. Route level (block navigation)
2. Menu level (hide nav items)
3. Component level (hide buttons)
4. Backend (real enforcement — frontend is just UX)

### Destructive actions — type-to-confirm

For any destructive action (delete user, disable user, force password reset, merge patients, restore backup, etc.), use type-to-confirm pattern:

```
"Type the user's email address (admin@hospital.com) to confirm disabling this account:"
[ input field ]
[ Cancel ] [ Disable user (disabled until input matches) ]
```

This prevents accidental destructive operations.

### CSP

```
default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline';
img-src 'self' data: blob: https://ris.yourdomain.com;
font-src 'self' data:;
connect-src 'self' https://ris.yourdomain.com;
frame-ancestors 'none';
form-action 'self';
base-uri 'self';
upgrade-insecure-requests;
```

### Other security features

- **PHI masking by default** — admin pages show patient names initials only (e.g., "A.K.") with "Show full name" toggle (audit-logged)
- **Civil IDs masked** — last 4 digits only by default, full on hover (audit-logged)
- **No screenshot deterrent in admin portal** — admin staff legitimately need to print rosters, schedules, etc.
- **Watermarked exports** — every CSV/PDF/Excel export includes watermark with admin's username + timestamp
- **Bulk export rate limiting** — max 5 exports per minute, max 10,000 rows per export
- **Export audit logged** — every export creates an audit entry with the filter criteria + row count
- **Cross-portal isolation** — localStorage prefix `ris-admin:` (different from patient `ris-patient:` and doctor `ris-doctor:`)

---

## Internationalization

Same approach as sister portals. Heavy admin terminology — use formal language in both EN and AR.

**Bilingual support for admin-editable content:**
- Department info: name, address — both languages required
- Scan types: name, description — both languages required
- Prep instructions: full content — both languages required (maintain side-by-side editor)
- Notification templates: subject + body — both languages required

---

## Accessibility — WCAG 2.1 AA

Same baseline as sister portals. Special considerations for admin portal:
- Data tables: full keyboard navigation, sort with Enter, multi-select with Shift+Click
- Modal dialogs: focus trapping (Radix handles), ESC closes
- Bulk actions: announce count to screen readers ("5 items selected")
- Charts: provide data table alternative for screen reader users

---

## Performance budget

Looser than other portals — admin users expect richer interfaces:

- Lighthouse Performance: ≥ 85 on desktop
- First Contentful Paint: < 2.5s
- Time to Interactive: < 5.0s
- Bundle size budget: < 700KB gzipped initial JS
- Charts and exports loaded only when those routes are visited

---

## Environment configuration

`.env.example`:

```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_APP_NAME="Nuclear Medicine Admin Portal"
VITE_APP_VERSION=1.0.0
VITE_DEFAULT_LANGUAGE=en
VITE_SUPPORTED_LANGUAGES=en,ar
VITE_DEFAULT_THEME=light
VITE_INACTIVITY_TIMEOUT_MINUTES=15
VITE_INACTIVITY_WARNING_MINUTES=2
VITE_REQUIRE_MFA_ROLES=ADMIN,RADIOLOGIST
VITE_PATIENT_PORTAL_URL=https://ris.yourdomain.com
VITE_DOCTOR_PORTAL_URL=https://ris.yourdomain.com/doctor
VITE_TIMEZONE=Asia/Kuwait
VITE_MAX_EXPORT_ROWS=10000
VITE_DEFAULT_PAGE_SIZE=50
```

---

## Nginx configuration update

The existing Nginx config (covering patient and doctor portals) needs one more `location` block. Reference only — frontend doesn't write Nginx:

```nginx
# Add inside the existing server block:

location /admin/ {
  alias /var/www/ris-portal-admin/;
  try_files $uri $uri/ /admin/index.html;

  location ~* /admin/.*\.(js|css|woff2|svg|png)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
  }
}
```

Final layout on the server:

```
/var/www/ris-portal/         ← Patient (https://ris.yourdomain.com/)
/var/www/ris-portal-doctor/  ← Doctor  (https://ris.yourdomain.com/doctor/)
/var/www/ris-portal-admin/   ← Admin   (https://ris.yourdomain.com/admin/)
```

All three React apps, one domain, one SSL cert, one Nginx config.

---

## CLAUDE.md for this project

Create `CLAUDE.md` with this content:

```markdown
# RIS-Portal-Admin — Project Context

## What this is
React/TypeScript administrative web portal for the Nuclear Medicine Department.
Third app in a three-portal system (patient + doctor + admin), all sharing one backend.

## Deployment context
- Served at: https://ris.yourdomain.com/admin/
- Build output deployed to: /var/www/ris-portal-admin/
- Vite base config: '/admin/'
- React Router basename: '/admin'
- Sister apps:
  - Patient at /         (RIS-Portal)
  - Doctor at /doctor/   (RIS-Portal-Doctor)
- All three apps share the same FastAPI backend (RIS-Backend)

## User types served
ADMIN, STAFF, RADIOLOGIST only.
Reject PATIENT and REFERRING_DOCTOR — show 403 and link to correct portal.

## Tech stack
- Vite 5 + React 18 + TypeScript 5 strict
- TanStack Query v5 + Zustand
- Tailwind 3.4 + shadcn/ui (copied components)
- React Router v6 with basename '/admin'
- @tanstack/react-table v8 (heavy use)
- recharts for analytics
- papaparse + xlsx (SheetJS) for exports
- react-hook-form + zod for forms
- i18next + framer-motion

## Key rules
- Default theme: light (admin work happens during day; toggle available)
- Information density: VERY HIGH — operational dashboard aesthetic
- Auto-logout after 15 min idle (strictest)
- MFA mandatory for ADMIN and RADIOLOGIST roles
- All destructive actions use type-to-confirm pattern
- PHI masked by default — patient names as initials, civil IDs last 4 only
- Show full PHI requires explicit toggle (audit-logged)
- All exports include watermark + audit log entry
- Permission-based UI — wrap routes, menus, buttons in <PermissionGuard>
- Frontend permission checks are UX only — backend enforces
- Never use dangerouslySetInnerHTML
- Never log patient data to console
- localStorage keys prefixed with `ris-admin:` for cross-portal isolation
- All directional Tailwind utilities use logical properties (me, ms, ps, pe)

## Backend contract
Same backend as sister portals: VITE_API_BASE_URL
Admin-specific endpoints: /api/v1/admin/*
Permissions delivered in JWT: user.permissions: string[]
Documented in src/api/endpoints.ts

## Permission constants
Defined in src/lib/permissions.ts
Reference these instead of strings everywhere
```

---

## Build sequence

1. `pnpm create vite@latest . --template react-ts`
2. Install all dependencies
3. Configure Vite with `base: '/admin/'` and `port: 5175`
4. Configure TypeScript strict, Tailwind, ESLint, Prettier
5. Set up i18next with EN + AR scaffolds (10 namespaces)
6. Create folder structure (empty files)
7. Build design tokens in `tailwind.config.ts` (cooler neutral palette, 13px base)
8. Self-host fonts via `@fontsource`
9. Build `api/client.ts` with axios + interceptors (handle 401, 403, 429)
10. Build Zustand stores (auth, theme, language, table filters, saved views)
11. Build `lib/permissions.ts` with permission constants
12. Build `<PermissionGuard>` component + `usePermission` hook
13. Add shadcn/ui primitives (extensive list — most components needed)
14. Build `AppShell` with grouped sidebar + top bar with global search
15. Build reusable `<DataTable>` component (this is the workhorse — invest time)
16. Build pages in this order:
    - Login → MFA → Dashboard
    - Pending Confirmations → Reports Pending Delivery (operational priority)
    - Users management → Patients management
    - Audit Log → Security Events (security priority)
    - Analytics dashboard
    - Settings (Department → Scan Types → Prep Instructions → Notifications → PACS → Backup)
    - System Health
17. Add Framer Motion page transitions
18. Add idle timeout + auto-logout (15 min)
19. Add type-to-confirm for all destructive actions
20. Add PHI masking with audit-logged unmask
21. Add export functionality (CSV, Excel, PDF) with watermarking
22. Write tests for utils, validators, permission helpers, key components
23. Run Lighthouse audit (target ≥ 85 desktop)
24. Run axe accessibility audit
25. Test build with `pnpm build` and verify all asset paths use `/admin/` prefix
26. Test serving from `/admin/` subpath in local Nginx
27. Create CLAUDE.md and README.md

After every page, verify:
- Renders correctly in EN + AR
- Renders correctly in light + dark mode
- Responsive at 1280px and 1920px (desktop-first)
- Works with keyboard only
- Permission-protected views show fallback for unauthorized users
- Bulk actions work and show confirmation

After build, verify:
- All asset paths in `dist/index.html` use `/admin/` prefix
- App can be served from `/admin/` subpath
- Hard refresh on `/admin/users` does not 404 (Nginx fallback works)

Do not move to the next page until current page passes all six checks.

---

## Start now

Begin with build sequence step 1. Create the project, install dependencies, configure Vite for `/admin/` base path with port 5175, and verify a basic "Hello, Admin" page loads at `http://localhost:5175/admin/`. Report back when this works before proceeding to the design system setup.
