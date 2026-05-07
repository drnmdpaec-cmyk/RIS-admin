# RIS Admin Portal — Nuclear Medicine Department

Administrative web portal for managing bookings, reports, patients, users, and system settings.
Deployed at `https://ris.yourdomain.com/admin/`. Part of a three-portal system sharing one FastAPI backend.

## Dev setup

```bash
pnpm install
cp .env.example .env.development
pnpm dev          # http://localhost:5175/admin/
```

## Build

```bash
pnpm build        # output → dist/
pnpm preview      # preview production build
```

## Access

Staff roles with access: **ADMIN**, **STAFF**, **RADIOLOGIST**.  
Patients and referring doctors are redirected to their own portals.

MFA is mandatory for ADMIN and RADIOLOGIST roles.

---

## Live Updates & Notifications

The portal automatically refreshes operational data — no F5 needed.

### Auto-refresh schedule

| Section | Refreshes every |
|---------|-----------------|
| Operations dashboard | 30 seconds (runs in background tabs) |
| Pending confirmations | 30 seconds (active tab only) |
| Reports awaiting delivery | 60 seconds (active tab only) |
| Today's schedule | 60 seconds (background-safe) |
| Audit log | Manual only (data must not shift mid-investigation) |
| Settings / Users | On window focus only |

A **Last updated** indicator with a manual refresh button appears in the header of all auto-refreshing pages.

### Browser tab badge

When the portal is in a background tab, the tab title shows pending counts:

- `(5) Admin Portal...` — items needing attention
- `🔴 (3) Admin Portal...` — critical findings pending

The badge updates every 30 seconds even in background tabs.

### Browser notifications (optional, opt-in)

1. Go to **Settings → Notifications**
2. Enable the master toggle and grant browser permission
3. Choose which event types to receive
4. Configure quiet hours if desired

You will receive browser notifications for:

- **New pending bookings** — when a patient submits an online booking awaiting confirmation
- **Reports awaiting delivery** — when the signed-but-undelivered backlog exceeds 15 reports
- **Critical finding flagged** — when a radiologist marks a finding as critical
- **System alerts** — backup failures, service health events, security alerts

All notifications are **generic** — they contain no patient information. Tap any notification to open the relevant section of the portal.

### Snooze

In the user menu (top-right avatar), you can snooze notifications for 1 hour or 4 hours during busy periods.

### Quiet hours

Under **Settings → Notifications → Quiet Hours**, configure a time window during which notifications are suppressed. The default is 18:00–07:00 with Fridays off (Kuwait weekend). Critical findings marked urgent bypass quiet hours.

---

## Security & Compliance

- **Auto-logout:** 15 minutes of inactivity (strictest in the three-portal system)
- **PHI masking:** Patient names shown as initials, civil IDs as last 4 digits by default. Showing full PHI requires an explicit toggle that is audit-logged.
- **Push payloads:** Never contain patient names, scan types, or clinical content — generic count strings only (HIPAA 45 CFR §164.502(a))
- **Audit trail:** All administrative actions, logins, exports, and preference changes are logged (21 CFR Part 11)
- **No offline caching:** Service worker intercepts no fetch requests — admin staff always receive live, authenticated data
- **localStorage:** Only non-PHI preferences stored (theme, language, saved view names)

---

## Environment variables

See `.env.example` for the full list. Key variables:

| Variable | Purpose |
|----------|---------|
| `VITE_API_BASE_URL` | Backend API root (e.g. `http://localhost:8000/api/v1`) |
| `VITE_VAPID_PUBLIC_KEY` | Web Push VAPID public key (generate with `npx web-push generate-vapid-keys`) |
| `VITE_INACTIVITY_TIMEOUT_MINUTES` | Auto-logout timeout (default: 15) |
| `VITE_TIMEZONE` | Portal timezone for audit timestamps (default: `Asia/Kuwait`) |

---

## Architecture notes

- **Query hooks:** `src/api/queries/` — use these for live pages instead of raw `useQuery()`
- **PHI utilities:** `src/lib/security.ts` — `maskName()`, `maskCivilId()`, `auditPhiDisclosure()`
- **Permissions:** `src/lib/permissions.ts` — never use raw strings for permission checks
- **i18n:** 10 namespaces × 2 languages (English + Arabic RTL)
- **Backend contracts:** `BACKEND_REQUIREMENTS.md` — all new endpoints for live-ops features
