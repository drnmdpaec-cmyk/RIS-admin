export type AuditResult = 'SUCCESS' | 'FAILURE';

export interface AuditLog {
  id: string;
  timestamp: string;
  user_id: string;
  user_name: string;
  user_role: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  resource_label?: string;
  ip_address: string;
  user_agent: string;
  result: AuditResult;
  details?: Record<string, unknown>;
}

export interface SecurityEvent {
  id: string;
  timestamp: string;
  event_type: 'FAILED_LOGIN' | 'ACCOUNT_LOCKED' | 'SUSPICIOUS_PATTERN' | 'FORCE_LOGOUT';
  email?: string;
  ip_address: string;
  user_agent?: string;
  geo_city?: string;
  details?: Record<string, unknown>;
}
