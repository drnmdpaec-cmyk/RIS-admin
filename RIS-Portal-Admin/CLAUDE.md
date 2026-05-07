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
Reject PATIENT and REFERRING_DOCTOR — show /forbidden and link to correct portal.

## Tech stack
- Vite 8 + React 19 + TypeScript 6 strict
- TanStack Query v5 + Zustand v5
- Tailwind CSS v4 (CSS-first config via @theme in globals.css)
- React Router v7 with basename '/admin'
- @tanstack/react-table v8 (heavy use)
- recharts for analytics
- papaparse + xlsx (SheetJS) for exports
- react-hook-form + zod v4 for forms
- i18next + framer-motion
- clsx + tailwind-merge for cn() utility

## Key rules
- Default theme: light (admin work happens during day; toggle available)
- Information density: VERY HIGH — operational dashboard aesthetic
- Auto-logout after 15 min idle (strictest) with 2-min warning
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

## File layout
- src/api/           — axios client, endpoint constants, React Query hooks
- src/components/    — layout (AppShell, Sidebar, TopBar), auth, data-table, domain components
- src/hooks/         — useAuth, usePermission(s), useTheme, useLanguage, useIdleTimer, etc.
- src/lib/           — constants, permissions, utils (cn), formatters, validators
- src/pages/         — page components organised by domain
- src/store/         — Zustand stores: auth, theme, language, tableFilters, savedViews, breadcrumbs
- src/types/         — TypeScript types per domain
- src/i18n/          — i18next config + 10 namespaces × 2 languages
- src/styles/        — globals.css (Tailwind v4 @theme tokens), fonts.css

## Backend contract
Same backend as sister portals: VITE_API_BASE_URL
Admin-specific endpoints: /api/v1/admin/*
Permissions delivered in JWT: user.permissions: string[]
Documented in src/api/endpoints.ts

## Permission constants
Defined in src/lib/permissions.ts — import PERMISSIONS, never use raw strings.

## Design tokens (globals.css @theme)
Primary: #2E75B6, Accent: #1A7A6B, cool neutral palette
Light bg: #F7F8FA, sidebar: #F0F2F6
Dark bg: #0A0F1C, card: #131A2A, sidebar: #0E1422
Font: Inter / IBM Plex Sans Arabic / JetBrains Mono
Base font-size: 13px

## Dev server
pnpm dev  →  http://localhost:5175/admin/

## Build
pnpm build  →  dist/ (all paths prefixed /admin/)

---

## Live-Operations Layer (Enhancement — NOT a full PWA)

The admin portal uses a minimal service worker for Web Push only.
No installable manifest, no offline shell, no precaching ever.

### Auto-refresh strategy

| Page | Interval | Background? |
|------|----------|-------------|
| Operations dashboard | 30 s | Yes |
| Pending confirmations | 30 s | No |
| Reports pending delivery | 60 s | No |
| Today's schedule | 60 s | Yes |
| Audit log | Never | — |
| Settings / Users / Patient detail | Focus only | — |

Query hooks live in `src/api/queries/` — use these instead of raw useQuery() on live pages.

### Tab title badge

- `useTabTitleBadge()` runs globally inside `AppShell` (via `TabBadge` component)
- Polls `GET /admin/unread-counts` every 30 s (background-tab safe)
- Updates `document.title` with `"(N) Admin Portal..."` or `"🔴 (N)..."` when critical
- Counts are permission-aware — backend filters to what this user can act on

### Push notifications (opt-in)

- Master toggle + per-event-type toggles in `NotificationPreferences` component
- Quiet hours: user-set time range + Kuwait Friday option
- Snooze: 1 hr / 4 hr quick actions in `AdminMenu`
- Backend rate-limits and deduplicates by tag
- All payloads are generic — never PHI

### Visual freshness

- `LastRefreshedIndicator` on every auto-refreshing page (dashboard, pending pages, schedule)
- 2-second ring-highlight animation on KPI cards when their count increases
- Manual refresh button always available

### Critical PHI rules for live-ops features

- Push payloads NEVER contain patient names, scan types, or clinical content
- Tab title contains only counts (numbers and generic category labels)
- localStorage stores: theme, language, saved view names, user preferences only
- All push subscribe/unsubscribe events are audit-logged by the backend

### Service worker scope

Registered at `/admin/sw.js` — must not interfere with patient portal at `/` or
doctor portal at `/doctor/`. The SW intercepts no fetch requests (no caching).

### New backend endpoints required

See `BACKEND_REQUIREMENTS.md` for full specifications.
