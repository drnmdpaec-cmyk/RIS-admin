# Admin Portal Backend Requirements — Live-Operations Layer

New endpoints required on RIS-Backend to support the admin portal's auto-refresh,
tab badge, and push notification features.

---

## 1. POST /api/v1/admin/push-subscribe

**Auth:** ADMIN | STAFF | RADIOLOGIST  
**Body:**
```json
{
  "endpoint": "https://fcm.googleapis.com/...",
  "keys": {
    "p256dh": "<base64url>",
    "auth": "<base64url>"
  },
  "user_agent": "Mozilla/5.0 ..."
}
```
**Response:** `{ "success": true, "subscription_id": "<uuid>" }`  
**Behavior:** Store subscription in `push_subscriptions` table linked to the authenticated user.  
**Audit:** Log `PUSH_SUBSCRIBE` event.

---

## 2. POST /api/v1/admin/push-unsubscribe

**Auth:** required  
**Body:** `{ "endpoint": "https://..." }`  
**Response:** `{ "success": true }`  
**Behavior:** Delete matching subscription row.  
**Audit:** Log `PUSH_UNSUBSCRIBE` event.

---

## 3. GET /api/v1/admin/unread-counts

**Auth:** required  
**Response:**
```json
{
  "pending_confirmations": 3,
  "reports_awaiting_delivery": 7,
  "critical_findings_pending": 1,
  "unread_messages": 0
}
```
**Behavior:**
- `pending_confirmations`: appointments with `status=PENDING` AND `booking_source=ONLINE`
- `reports_awaiting_delivery`: reports with `status=SIGNED` and not yet `DELIVERED`
- `critical_findings_pending`: signed critical reports without admin acknowledgment
- `unread_messages`: messages from referring doctors not yet read by any staff

**Permission-aware:** zero out fields the requesting user cannot act on:
- No `appointments:manage` → `pending_confirmations: 0`
- No `reports:deliver` → `reports_awaiting_delivery: 0` and `critical_findings_pending: 0`

**Performance:** Must respond in <100 ms. Called every 30 s per active session.  
Cache in-memory with 10-second TTL (acceptable staleness for a count indicator).

---

## 4. PATCH /api/v1/admin/preferences

**Auth:** required  
**Body (all fields optional):**
```json
{
  "notification_preferences": {
    "newPendingBookings": true,
    "reportsAwaitingDelivery": true,
    "criticalFindingsFlagged": true,
    "systemAlerts": true
  },
  "quiet_hours": {
    "start": "18:00",
    "end": "07:00"
  },
  "skip_fridays": true,
  "timezone": "Asia/Kuwait"
}
```
**Response:** `{ "success": true }`  
**Audit:** Log `PREFERENCES_UPDATE` event.

---

## 5. POST /api/v1/admin/preferences/snooze

**Auth:** required  
**Body:** `{ "duration_minutes": 60 }`  
**Response:** `{ "success": true, "snooze_until": "2025-03-15T14:00:00Z" }`  
**Behavior:** Set `snooze_until = now() + duration_minutes` on the user's preferences row.  
Backend skips push deliveries for this user until `snooze_until` has passed.

---

## 6. GET /api/v1/admin/preferences

**Auth:** required  
**Response:** Full preferences object including:
- `notification_preferences` object
- `quiet_hours` object
- `skip_fridays` boolean
- `timezone` string
- `snooze_until` ISO 8601 string or null

---

## Push notification trigger logic

When backend events occur, send pushes to admins who:
1. Have an active push subscription
2. Have enabled that event type in `notification_preferences`
3. Are not currently in quiet hours (respect `quiet_hours` and `skip_fridays`)
4. Are not currently snoozed (`snooze_until` is null or in the past)
5. Have permission to act on that event type

### Event: New online booking submitted

**Trigger:** `appointment.status = PENDING AND booking_source = ONLINE` created  
**Recipients:** users with `appointments:manage` AND `newPendingBookings = true`  
**Payload:**
```json
{
  "title": "New Booking Awaiting Confirmation",
  "body": "1 new online booking needs review",
  "tag": "pending-bookings",
  "url": "/admin/appointments/pending",
  "priority": "normal"
}
```
Body pluralizes: `"{N} new online bookings need review"` when N > 1.  
**Dedup:** Tag `pending-bookings` collapses multiple rapid bookings into one notification.

### Event: Reports backlog over threshold

**Trigger:** count(reports where `status=SIGNED AND NOT delivered`) > 15  
**Recipients:** users with `reports:deliver` AND `reportsAwaitingDelivery = true`  
**Payload:**
```json
{
  "title": "Reports Awaiting Delivery",
  "body": "18 signed reports pending delivery to patients",
  "tag": "reports-backlog",
  "url": "/admin/reports/pending",
  "priority": "normal"
}
```

### Event: Critical finding flagged

**Trigger:** `report.is_critical = true` AND report reaches `SIGNED` status  
**Recipients:** users with `reports:deliver` AND `criticalFindingsFlagged = true`  
**Payload:**
```json
{
  "title": "Critical Finding Flagged",
  "body": "A critical finding requires urgent administrative review",
  "tag": "critical-finding-<report.id>",
  "url": "/admin/reports/pending?filter=critical",
  "priority": "high"
}
```
`priority: "high"` → `requireInteraction: true` in the browser (notification stays until dismissed).  
Quiet hours do NOT suppress critical findings marked `priority: "high"`.

### Event: System alert

**Trigger:** backup failure | service health degraded | security event severity HIGH  
**Recipients:** users with `system:admin` AND `systemAlerts = true`  
**Payload:**
```json
{
  "title": "System Alert",
  "body": "Backup failure detected — last successful backup was 26 hours ago",
  "tag": "system-backup-failure",
  "url": "/admin/system/health",
  "priority": "high"
}
```

---

## Rate limiting

- Max 1 notification per `tag` per user per hour (backend deduplicates by tag+user+hour)
- Max 20 notifications per user per day
- `priority: "high"` events bypass the per-hour tag dedup but not the daily limit
- Quiet hours and snooze are applied before any sending

---

## Critical: NO PHI in any push payload

| Allowed | Forbidden |
|---------|-----------|
| Aggregate counts ("3 new bookings") | Patient names |
| Category labels ("New Booking Awaiting Confirmation") | Civil IDs |
| Generic system descriptions | Scan types / procedures |
| Navigation URLs (path only, no query params with IDs) | Clinical content |

Violating this rule may constitute a HIPAA breach under 45 CFR §164.502(a).  
The receiving service worker enforces no filtering — the backend is the only gate.

---

## Database schema additions

```sql
CREATE TABLE push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, endpoint)
);

ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS
    notification_preferences JSONB DEFAULT '{
        "newPendingBookings": true,
        "reportsAwaitingDelivery": true,
        "criticalFindingsFlagged": true,
        "systemAlerts": true
    }';

ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS
    quiet_hours JSONB DEFAULT '{"start": "18:00", "end": "07:00"}';

ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS
    skip_fridays BOOLEAN DEFAULT true;

ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS
    snooze_until TIMESTAMPTZ;
```

---

## VAPID key management

Generate a single VAPID key pair per environment (or per portal if strict isolation desired):

```bash
npx web-push generate-vapid-keys
```

- `VAPID_PUBLIC_KEY` → frontend env `VITE_VAPID_PUBLIC_KEY` (all three portals may share)
- `VAPID_PRIVATE_KEY` → backend env only, never expose to frontend
- `VAPID_SUBJECT` → `mailto:admin@yourdomain.com`

Recommend separate key pairs for admin portal vs patient/doctor portals to allow
independent subscription management if the portals are ever separated.
