# RIS Admin Portal — Technical Documentation

**Version:** 1.0.0  
**Stack:** Vite 8 · React 19 · TypeScript 6 · Tailwind CSS v4  
**Deployed at:** `https://ris.yourdomain.com/admin/`

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture](#2-architecture)
3. [Project Structure](#3-project-structure)
4. [Authentication & Session Management](#4-authentication--session-management)
5. [Permission System](#5-permission-system)
6. [PHI Masking & Compliance](#6-phi-masking--compliance)
7. [API Layer](#7-api-layer)
8. [State Management](#8-state-management)
9. [Live-Operations Layer](#9-live-operations-layer)
10. [Internationalisation & RTL](#10-internationalisation--rtl)
11. [Design System](#11-design-system)
12. [Security Model](#12-security-model)
13. [Adding New Pages](#13-adding-new-pages)
14. [Adding New Permissions](#14-adding-new-permissions)
15. [Environment Variables Reference](#15-environment-variables-reference)
16. [Known Limitations & Future Work](#16-known-limitations--future-work)

---

## 1. Project Overview

The RIS Admin Portal is a high-density operational web application for Nuclear Medicine Department administrators, radiologists, and support staff in Kuwait. It is one of three portals sharing a single FastAPI backend:

| Portal | Path | Audience |
|--------|------|----------|
| Patient Portal | `/` | Patients |
| Doctor Portal | `/doctor/` | Referring doctors |
| **Admin Portal** | `/admin/` | ADMIN · STAFF · RADIOLOGIST |

The admin portal handles:
- Confirming and scheduling online bookings
- Delivering signed radiology reports
- Managing staff users and their access
- Patient registry management
- Analytics and operational dashboards
- Audit trail review
- Department configuration

---

## 2. Architecture

### Two-tier: static SPA + FastAPI backend

```
Browser
  └─▶ Nginx (serves static dist/ at /admin/)
          └─▶ FastAPI (/api/v1/*)
                  └─▶ PostgreSQL
```

The frontend is a fully static single-page application. Nginx serves `dist/index.html` for all `/admin/*` paths. The app then routes client-side via React Router.

### Service worker scope

A minimal service worker is registered at `/admin/sw.js` solely to receive Web Push notifications. It does **not** intercept any fetch requests and does **not** cache any data. Admin staff always receive live, authenticated data.

### Data flow

```
React component
  └─▶ TanStack Query (useQuery / useMutation)
          └─▶ Axios (apiClient)
                  └─▶ FastAPI /api/v1/admin/*
```

All API calls include the Bearer token from the auth store, automatically injected by the Axios request interceptor.

---

## 3. Project Structure

```
src/
├── api/
│   ├── client.ts              # Axios instance, interceptors, forceLogout
│   ├── endpoints.ts           # All endpoint path constants
│   └── queries/               # TanStack Query hooks per domain
│       ├── useOperations.ts   # Dashboard (30s background refresh)
│       ├── usePendingConfirmations.ts
│       ├── useReportsPending.ts
│       ├── useTodaySchedule.ts
│       └── useAuditLog.ts     # Never auto-refreshes
│
├── components/
│   ├── auth/
│   │   └── AdminAuthGuard.tsx # Route-level user-type guard
│   ├── layout/
│   │   ├── AppShell.tsx       # Root authenticated layout
│   │   ├── Sidebar.tsx        # Nav (mobile overlay + desktop static)
│   │   ├── TopBar.tsx         # Search, language, theme, user menu
│   │   ├── AdminMenu.tsx      # User dropdown with snooze actions
│   │   ├── PermissionGuard.tsx
│   │   ├── ThemeToggle.tsx
│   │   └── LanguageToggle.tsx
│   └── shared/
│       ├── ErrorBoundary.tsx           # IEC 62304 §7.4.4
│       ├── LastRefreshedIndicator.tsx  # Live-data freshness display
│       └── NotificationPreferences.tsx # Push notification settings UI
│
├── hooks/
│   ├── useAuth.ts             # Login/logout helper
│   ├── useDebounce.ts
│   ├── useIdleTimer.ts        # 15-min auto-logout
│   ├── useLanguage.ts
│   ├── useLocalStorage.ts     # ris-admin: prefixed, PHI-safe logging
│   ├── usePermission.ts       # Single permission check
│   ├── usePermissions.ts      # Multi-permission (can/canAny/canAll)
│   ├── useTabTitleBadge.ts    # Document title with unread counts
│   └── useTheme.ts
│
├── i18n/
│   ├── config.ts
│   └── locales/
│       ├── en/  (10 JSON namespaces)
│       └── ar/  (10 JSON namespaces, RTL)
│
├── lib/
│   ├── constants.ts           # App-wide constants from env vars
│   ├── formatters.ts          # Kuwait UTC+3 date formatting
│   ├── permissions.ts         # Permission constant strings + helpers
│   ├── security.ts            # XSS detection, PHI audit logger
│   ├── utils.ts               # cn(), maskName(), maskCivilId()
│   └── validators.ts          # Zod schemas for all form inputs
│
├── pages/
│   ├── auth/                  # LoginPage, MfaPage, ForgotPasswordPage
│   ├── errors/                # NotFoundPage, ForbiddenPage, ErrorPage
│   ├── DashboardPage.tsx      # Operations dashboard (auto-refresh)
│   └── _placeholder.tsx       # Stub for unbuilt pages
│
├── services/
│   ├── pushNotifications.ts   # VAPID subscribe/unsubscribe
│   └── registerServiceWorker.ts
│
├── store/
│   ├── authStore.ts           # User + token (clears all storage on logout)
│   ├── breadcrumbsStore.ts
│   ├── languageStore.ts       # Persisted: en | ar
│   ├── savedViewsStore.ts     # Persisted table column configs
│   ├── tableFiltersStore.ts
│   └── themeStore.ts          # Persisted: light | dark
│
├── types/                     # TypeScript interfaces per domain
├── styles/
│   ├── globals.css            # Tailwind v4 @theme tokens
│   └── fonts.css
│
├── service-worker.ts          # Push-only SW (no caching)
├── routes.tsx                 # All route definitions
├── App.tsx                    # QueryClient, Router, ErrorBoundary
└── main.tsx                   # Entry point, SW setup
```

---

## 4. Authentication & Session Management

### Login flow

```
1. POST /auth/login  { email, password, remember_device }
   ↓
2. Backend responds:
   a) { requires_mfa: true, challenge_token }  → navigate to /mfa
   b) { user, access_token }                   → set auth, navigate to /dashboard
   ↓
3. If MFA required:
   POST /auth/mfa/verify  { challenge_token, code }
   POST /auth/mfa/backup  { challenge_token, backup_code }
   ↓
4. On success: isAdminUserType(user.user_type) checked
   → PATIENT or REFERRING_DOCTOR → redirect /forbidden
   → ADMIN/STAFF/RADIOLOGIST     → setAuth(), navigate /dashboard
```

### Token refresh

The Axios response interceptor handles 401 responses:
1. Queues all concurrent requests while refreshing
2. Calls `POST /auth/refresh` (uses HttpOnly cookie on backend)
3. On success: retries queued requests with new token
4. On failure: calls `forceLogout()` → clears all storage → redirects to `/admin/login`

### Idle timeout

`useIdleTimer` runs globally inside `AppShell`. Configuration:

| Constant | Default | Env var |
|----------|---------|---------|
| Idle timeout | 15 minutes | `VITE_INACTIVITY_TIMEOUT_MINUTES` |
| Warning shown | 2 minutes before timeout | `VITE_INACTIVITY_WARNING_MINUTES` |

Activity events tracked: `mousedown`, `keydown`, `touchstart`, `scroll`.  
`visibilitychange` is **deliberately excluded** — switching tabs must not reset the idle clock (security requirement).

### Logout

`useAuth().logout()` calls `POST /auth/logout` then runs `clearAuth()` in the `finally` block — local session is always cleared even if the server-side call fails.

`clearAuth()` wipes every `ris-admin:*` key from localStorage before clearing Zustand state, ensuring no preferences survive to the next user on a shared workstation (21 CFR Part 11 §11.3(b)(4)).

---

## 5. Permission System

### How permissions work

Permissions are strings embedded in the JWT, delivered as `user.permissions: string[]`. They are checked client-side for **UI purposes only** — the backend enforces them on every request.

### Permission constants

Defined in `src/lib/permissions.ts`:

| Constant | String value | What it controls |
|----------|-------------|-----------------|
| `USERS_MANAGE` | `users:manage` | User CRUD, role assignment |
| `APPOINTMENTS_MANAGE` | `appointments:manage` | Confirm/reschedule bookings |
| `REPORTS_DELIVER` | `reports:deliver` | Mark reports as delivered |
| `REPORTS_SIGN` | `reports:sign` | Sign a radiology report |
| `AUDIT_VIEW` | `audit:view` | View audit log |
| `SETTINGS_MANAGE` | `settings:manage` | Department configuration |
| `ANALYTICS_VIEW` | `analytics:view` | View analytics dashboards |
| `BILLING_VIEW` | `billing:view` | Billing data |
| `DICOM_MANAGE` | `dicom:manage` | PACS/DICOM configuration |

### Using permissions in components

```tsx
// Hook (recommended)
import { usePermissions } from '@/hooks/usePermissions';
const { can, canAny, canAll } = usePermissions();

// Single check
if (can('reports:deliver')) { ... }

// Wrap JSX
import { PermissionGuard } from '@/components/layout/PermissionGuard';
<PermissionGuard requires={PERMISSIONS.REPORTS_DELIVER}>
  <DeliverButton />
</PermissionGuard>

// Route protection
{
  path: 'reports/pending',
  element: (
    <PermissionGuard requires={PERMISSIONS.REPORTS_DELIVER}>
      <ReportsPendingPage />
    </PermissionGuard>
  ),
}
```

---

## 6. PHI Masking & Compliance

### Default masking

Patient Identifiable Information is **masked by default** in all list views:

| Field | Masked as | Full value requires |
|-------|-----------|---------------------|
| Patient name | Initials (A.K.) | Explicit toggle (audit-logged) |
| Civil ID | Last 4 digits (\*\*\*\* 4821) | Explicit toggle (audit-logged) |

Mask functions in `src/lib/utils.ts`:

```typescript
maskName('Ahmed Khalid')        // → 'A.K.'
maskCivilId('28412345678')      // → '•••• 5678'
```

### PHI audit logging

When a user explicitly reveals full PHI:

```typescript
import { auditPhiDisclosure } from '@/lib/security';

auditPhiDisclosure('FULL_NAME_REVEALED', patientId, patientLabel);
// Fires POST /admin/audit-logs — best-effort, never throws
```

Disclosure types: `FULL_NAME_REVEALED`, `CIVIL_ID_REVEALED`, `PATIENT_DETAIL_VIEWED`, `REPORT_VIEWED`, `DATA_EXPORTED`.

### Rules for new pages

- **Never** display raw patient names or civil IDs in list/table views without masking
- **Never** include PHI in push notification payloads
- **Never** log PHI to the browser console
- **Never** store PHI in localStorage or any browser storage
- All exports must include a watermark and trigger an audit log entry

---

## 7. API Layer

### Axios client (`src/api/client.ts`)

```typescript
import { apiClient, getApiErrorMessage } from '@/api/client';

// GET
const res = await apiClient.get<MyType>(ENDPOINTS.APPOINTMENTS);

// POST
await apiClient.post(ENDPOINTS.APPOINTMENT_CONFIRM(id), { reason });

// Error handling
try {
  await apiClient.post(...);
} catch (err) {
  toast.error(getApiErrorMessage(err, t('common:error')));
}
```

`getApiErrorMessage()` extracts `response.data.detail` → `response.data.message` → `err.message` → fallback.

### Endpoint constants (`src/api/endpoints.ts`)

All paths are typed constants. Never use raw strings for API paths:

```typescript
import { ENDPOINTS } from '@/api/endpoints';

ENDPOINTS.APPOINTMENTS              // '/admin/appointments'
ENDPOINTS.APPOINTMENT(id)           // '/admin/appointments/:id'
ENDPOINTS.APPOINTMENTS_PENDING      // '/admin/appointments/pending'
ENDPOINTS.UNREAD_COUNTS             // '/admin/unread-counts'
ENDPOINTS.PREFERENCES               // '/admin/preferences'
```

### Query hooks (`src/api/queries/`)

Use these hooks instead of raw `useQuery` on live-data pages — they have the correct refetch intervals pre-configured:

```typescript
import { useOperationsDashboard } from '@/api/queries/useOperations';
import { usePendingConfirmations } from '@/api/queries/usePendingConfirmations';
import { useReportsPendingDelivery } from '@/api/queries/useReportsPending';
import { useTodaySchedule } from '@/api/queries/useTodaySchedule';
import { useAuditLog } from '@/api/queries/useAuditLog';

const { data, isFetching, dataUpdatedAt, refetch } = useOperationsDashboard();
```

| Hook | Interval | Background? | Why |
|------|----------|-------------|-----|
| `useOperationsDashboard` | 30 s | Yes | Dashboard must stay live in all tabs |
| `usePendingConfirmations` | 30 s | No | Active work; no need to fetch unseen |
| `useReportsPendingDelivery` | 60 s | No | Changes less frequently |
| `useTodaySchedule` | 60 s | Yes | Staff check from other tabs |
| `useAuditLog` | Never | — | Shifts during active investigation |

---

## 8. State Management

### Zustand stores

All stores use `ris-admin:` as the localStorage key prefix to prevent cross-portal collisions.

| Store | Persisted | Contents |
|-------|-----------|----------|
| `authStore` | No | `user`, `accessToken`, `isAuthenticated` |
| `themeStore` | Yes | `theme: 'light' | 'dark'` |
| `languageStore` | Yes | `language: 'en' | 'ar'` |
| `savedViewsStore` | Yes | Column visibility / order configs per table |
| `tableFiltersStore` | No | Active filter state per page |
| `breadcrumbsStore` | No | Current page breadcrumb trail |

### Accessing the auth store outside React

```typescript
import { useAuthStore } from '@/store/authStore';

// Read state outside a component (e.g., in apiClient.ts)
const token = useAuthStore.getState().accessToken;
const user = useAuthStore.getState().user;

// Mutate state
useAuthStore.getState().clearAuth();
```

---

## 9. Live-Operations Layer

### Tab title badge

`useTabTitleBadge()` runs globally inside `AppShell` (via the `TabBadge` helper component). It polls `GET /admin/unread-counts` every 30 seconds, even in background tabs, and updates `document.title`:

- Normal: `(5) Admin Portal — Nuclear Medicine`
- Critical findings pending: `🔴 (3) Admin Portal — Nuclear Medicine`
- No items: `Admin Portal — Nuclear Medicine`

### Push notifications

Push notifications use native Web Push (VAPID). No Firebase or third-party service.

**Subscription flow:**
1. User enables master toggle in Settings → Notifications
2. Browser requests notification permission
3. SW subscribes via PushManager
4. Endpoint + keys POSTed to `/admin/push-subscribe`
5. Backend stores subscription, audits the event

**Payload format** (all payloads are generic — no PHI):
```json
{
  "title": "New Booking Awaiting Confirmation",
  "body": "3 new online bookings need review",
  "tag": "pending-bookings",
  "url": "/admin/appointments/pending",
  "priority": "normal"
}
```

`priority: "high"` → `requireInteraction: true` in the browser (notification stays until dismissed).

### Auto-refresh + LastRefreshedIndicator

Add `LastRefreshedIndicator` to any page that uses auto-refreshing data:

```tsx
import { LastRefreshedIndicator } from '@/components/shared/LastRefreshedIndicator';

const { data, isFetching, dataUpdatedAt, refetch } = usePendingConfirmations(filters);

// In JSX — place in page header area
<LastRefreshedIndicator
  dataUpdatedAt={dataUpdatedAt}
  isFetching={isFetching}
  onManualRefresh={() => void refetch()}
/>
```

### Ring highlight on count increase

```tsx
import { useEffect, useRef, useState } from 'react';

function useHighlightOnIncrease(count: number) {
  const prev = useRef(count);
  const [highlight, setHighlight] = useState(false);
  useEffect(() => {
    if (count > prev.current) {
      setHighlight(true);
      const t = setTimeout(() => setHighlight(false), 2000);
      prev.current = count;
      return () => clearTimeout(t);
    }
    prev.current = count;
  }, [count]);
  return highlight;
}
```

---

## 10. Internationalisation & RTL

### Namespaces

| Namespace | File | Contents |
|-----------|------|----------|
| `common` | `common.json` | Shared labels (Save, Cancel, Status, etc.) |
| `auth` | `auth.json` | Login, MFA, forgot password |
| `operations` | `operations.json` | Dashboard labels |
| `appointments` | `appointments.json` | Booking management |
| `reports` | `reports.json` | Report delivery |
| `users` | `users.json` | Staff user management |
| `patients` | `patients.json` | Patient registry |
| `analytics` | `analytics.json` | Chart labels |
| `audit` | `audit.json` | Audit log |
| `settings` | `settings.json` | Configuration + notifications |
| `errors` | `errors.json` | Error messages |

### Using translations

```tsx
// Single namespace
const { t } = useTranslation('common');
t('save')  // → "Save" or "حفظ"

// Multiple namespaces
const { t } = useTranslation(['operations', 'common']);
t('operations:dashboard')
t('common:save')
```

### RTL layout

The `<html>` element's `dir` attribute is toggled by `useLanguage`. All directional Tailwind utilities use **logical properties**:

| Do not use | Use instead |
|-----------|-------------|
| `ml-*`, `mr-*` | `ms-*`, `me-*` |
| `pl-*`, `pr-*` | `ps-*`, `pe-*` |
| `left-*`, `right-*` | `start-*`, `end-*` |
| `text-left`, `text-right` | `text-start`, `text-end` |

---

## 11. Design System

### Colour tokens

Defined in `src/styles/globals.css` via Tailwind v4 `@theme`:

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--color-bg` | `#F7F8FA` | `#0A0F1C` | Page background |
| `--color-card` | `#FFFFFF` | `#131A2A` | Card/panel background |
| `--color-sidebar` | `#F0F2F6` | `#0E1422` | Navigation background |
| `--color-border` | `#DDE1EA` | `#1E2A3D` | All borders |
| `--color-text` | `#1A202C` | `#E8EBF0` | Body text |
| `--color-text-muted` | `#6B7585` | `#8A94A6` | Secondary text |
| `--color-primary-*` | `#2E75B6` scale | same | Brand blue |
| `--color-accent-*` | `#1A7A6B` scale | same | Teal accent |
| `--color-danger-*` | `#DC2626` scale | same | Errors, destructive |
| `--color-warning-*` | `#D97706` scale | same | Warnings |

### Typography

- **UI text:** Inter (Latin/Cyrillic/Greek), IBM Plex Sans Arabic (Arabic)
- **Monospace:** JetBrains Mono (times, codes, civil IDs)
- **Base size:** 13px (information-dense admin aesthetic)
- **Label text:** 12px, **meta text:** 11px

### Responsive breakpoints (Tailwind defaults)

| Prefix | Width | Meaning |
|--------|-------|---------|
| *(none)* | < 640px | Mobile phones |
| `sm:` | ≥ 640px | Large phones |
| `md:` | ≥ 768px | Tablets |
| `lg:` | ≥ 1024px | Desktop (primary target) |
| `xl:` | ≥ 1280px | Wide desktop |

The sidebar becomes an overlay below `lg` (1024px).

---

## 12. Security Model

### Input validation

All form inputs are validated with Zod schemas in `src/lib/validators.ts` before any API call. The `noscript()` refine helper rejects inputs matching `/<\s*script|javascript:|on\w+\s*=/i` (covers `<script>`, `javascript:` URIs, and all `on*=` event handlers).

### Storage isolation

- All localStorage keys are prefixed `ris-admin:` — no cross-portal data leakage
- Logout wipes all `ris-admin:` keys before clearing Zustand state
- No PHI is ever stored in localStorage

### Service worker scope

The SW is scoped to `/admin/` and intercepts zero fetch requests. The URL in a notification click payload is validated to start with `/admin/` before use — prevents open-redirect attacks via malicious push payloads.

### Auth guard layers

```
HTTP request → Nginx (serve static files)
                ↓
Route loads → AdminAuthGuard
              ├── not authenticated → /login
              └── wrong user type → /forbidden
                   ↓
              PermissionGuard (per-route)
              └── missing permission → shows 403 message
                   ↓
              Backend enforces permissions on every API call
```

### Token lifetime

The access token is short-lived (typically 15 minutes). When it expires, the Axios interceptor transparently refreshes it using an HttpOnly cookie (refresh token), preventing token theft via JavaScript.

---

## 13. Adding New Pages

### Step 1 — Create the page file

```tsx
// src/pages/appointments/ConfirmationsPage.tsx
import { useTranslation } from 'react-i18next';
import { usePendingConfirmations } from '@/api/queries/usePendingConfirmations';
import { LastRefreshedIndicator } from '@/components/shared/LastRefreshedIndicator';
import { maskName } from '@/lib/utils';

export function ConfirmationsPage() {
  const { t } = useTranslation(['appointments', 'common']);
  const { data, isFetching, dataUpdatedAt, refetch } = usePendingConfirmations();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-[15px] font-semibold text-[var(--color-text)]">
          {t('appointments:pendingConfirmations')}
        </h1>
        <LastRefreshedIndicator
          dataUpdatedAt={dataUpdatedAt}
          isFetching={isFetching}
          onManualRefresh={() => void refetch()}
        />
      </div>
      {/* ... table content with maskName() on patient names ... */}
    </div>
  );
}
```

### Step 2 — Register the route

```tsx
// src/routes.tsx — replace the PlaceholderPage entry
import { ConfirmationsPage } from '@/pages/appointments/ConfirmationsPage';

{
  path: 'pending',
  element: (
    <PermissionGuard requires={PERMISSIONS.APPOINTMENTS_MANAGE}>
      <ConfirmationsPage />
    </PermissionGuard>
  ),
}
```

### Step 3 — Add translations

In `src/i18n/locales/en/appointments.json` and `ar/appointments.json`.

### Rules for new pages

- Always wrap in `<PermissionGuard>` if the content is role-restricted
- Mask patient names: `maskName(appt.patient_name)`
- Mask civil IDs: `maskCivilId(patient.civil_id)`
- Use the correct query hook from `src/api/queries/`
- Add `LastRefreshedIndicator` on pages with auto-refreshing data
- Use i18n for all user-facing strings

---

## 14. Adding New Permissions

1. Add the constant to `src/lib/permissions.ts`:
   ```typescript
   export const PERMISSIONS = {
     // ... existing
     BILLING_MANAGE: 'billing:manage',
   } as const;
   ```

2. Use it in route definitions and `<PermissionGuard>` wrapping.

3. Ensure the backend JWT includes the string `billing:manage` in the user's `permissions` array for users who should have access.

4. Add to the sidebar in `Sidebar.tsx` if it needs a nav entry.

---

## 15. Environment Variables Reference

All variables are prefixed `VITE_`. They are baked into the production bundle at build time.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_API_BASE_URL` | Yes | `/api/v1` | Backend API root URL |
| `VITE_VAPID_PUBLIC_KEY` | For push | — | VAPID public key (generate with `npx web-push generate-vapid-keys`) |
| `VITE_APP_NAME` | No | `Nuclear Medicine Admin Portal` | Shown in UI |
| `VITE_APP_VERSION` | No | `1.0.0` | Shown in system health page |
| `VITE_DEFAULT_LANGUAGE` | No | `en` | Initial language (`en` or `ar`) |
| `VITE_SUPPORTED_LANGUAGES` | No | `en,ar` | Comma-separated list |
| `VITE_DEFAULT_THEME` | No | `light` | `light` or `dark` |
| `VITE_INACTIVITY_TIMEOUT_MINUTES` | No | `15` | Auto-logout threshold (minutes) |
| `VITE_INACTIVITY_WARNING_MINUTES` | No | `2` | Warning shown N minutes before logout |
| `VITE_REQUIRE_MFA_ROLES` | No | `ADMIN,RADIOLOGIST` | Comma-separated roles requiring MFA |
| `VITE_PATIENT_PORTAL_URL` | No | Portal base URL | Shown in forbidden page |
| `VITE_DOCTOR_PORTAL_URL` | No | Doctor portal URL | Shown in forbidden page |
| `VITE_TIMEZONE` | No | `Asia/Kuwait` | IANA timezone for audit timestamps |
| `VITE_MAX_EXPORT_ROWS` | No | `10000` | Export row cap |
| `VITE_DEFAULT_PAGE_SIZE` | No | `50` | Default pagination size |

---

## 16. Known Limitations & Future Work

### Pages not yet built (placeholder stubs)

All routes are wired and load a placeholder page. Remaining pages to implement:

- `PendingConfirmationsPage` — appointment confirmation workflow
- `ReportsPendingDeliveryPage` — bulk report delivery with audit log
- `UsersPage` + `UserDetailPage` — staff user CRUD, role assignment
- `PatientsPage` + `PatientDetailPage` — patient registry, portal access toggle
- `AuditLogPage` + `SecurityEventsPage` — log viewer with filters
- `AnalyticsPage` — charts (recharts), date-range selection, export
- Settings pages (7 sub-pages) — department, scan types, prep instructions, notifications, PACS, backup, branding
- `SystemHealthPage` — real-time service status, background jobs

### Push notifications — backend required

The frontend push subscription is complete. The backend must implement the 6 endpoints documented in `BACKEND_REQUIREMENTS.md` before push notifications will function end-to-end.

### Global search

The search input in TopBar is a UI shell. The search feature (keyboard shortcut ⌘K / Ctrl+K, modal with live results) is not yet implemented.

### Notification icon PNGs

Icons at `public/notification-icon.svg` and `public/notification-badge.svg` must be converted to `.png` format for full browser push notification compatibility. The service worker references `.png` paths:
```
/admin/notification-icon.png
/admin/notification-badge.png
```

Run `sharp` or any SVG-to-PNG tool to produce 192×192 and 72×72 PNG files.
