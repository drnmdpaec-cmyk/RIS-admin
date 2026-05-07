import { apiClient } from '@/api/client';
import { ENDPOINTS } from '@/api/endpoints';

// ---------------------------------------------------------------------------
// PHI Disclosure Audit  (HIPAA 45 CFR §164.312(b), 21 CFR Part 11 §11.10(e))
// ---------------------------------------------------------------------------

export type PhiDisclosureType =
  | 'FULL_NAME_REVEALED'
  | 'CIVIL_ID_REVEALED'
  | 'PATIENT_DETAIL_VIEWED'
  | 'REPORT_VIEWED'
  | 'DATA_EXPORTED';

/**
 * Fire-and-forget audit log entry when PHI is deliberately exposed to a user.
 * Never throws — a logging failure must not break the UI action.
 */
export function auditPhiDisclosure(
  type: PhiDisclosureType,
  resourceId: string,
  resourceLabel?: string
): void {
  void apiClient
    .post(ENDPOINTS.AUDIT_LOGS, {
      action: type,
      resource_type: 'PHI',
      resource_id: resourceId,
      resource_label: resourceLabel,
    })
    .catch(() => {
      // Swallow — best-effort; backend also logs all API access server-side
    });
}

// ---------------------------------------------------------------------------
// Input sanitization (defence-in-depth against stored XSS)
// ---------------------------------------------------------------------------

// Covers: <script tags, javascript: URIs, and inline event handlers (onerror=, onclick=, etc.)
// The on\w+ arm catches any HTML attribute that could execute JavaScript without a <script> tag.
const DANGEROUS_PATTERN = /<\s*script|javascript\s*:|on\w+\s*=/i;

/** Returns true if the string contains script injection patterns. */
export function containsScriptInjection(value: string): boolean {
  return DANGEROUS_PATTERN.test(value);
}

/**
 * Validate that a free-text clinical field does not contain script tags.
 * Use in zod `.refine()` calls on clinical summary / prep instruction inputs.
 */
export function noscript(value: string): boolean {
  return !containsScriptInjection(value);
}

// ---------------------------------------------------------------------------
// Type guard: admin user check
// ---------------------------------------------------------------------------

import { ADMIN_USER_TYPES } from '@/lib/constants';
import type { UserType } from '@/types/user';

/** Type-safe check; avoids `as` casts in components (21 CFR Part 11 §11.2(a)). */
export function isAdminUserType(userType: string): userType is (typeof ADMIN_USER_TYPES)[number] {
  return (ADMIN_USER_TYPES as readonly string[]).includes(userType);
}

export function assertAdminUserType(userType: UserType): boolean {
  return isAdminUserType(userType);
}
