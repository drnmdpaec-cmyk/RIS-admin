import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { TIMEZONE } from '@/lib/constants';

dayjs.extend(utc);
dayjs.extend(timezone);

/** Display a UTC ISO string in Kuwait local time (UTC+3). */
export function formatDateTime(iso: string): string {
  return dayjs.utc(iso).tz(TIMEZONE).format('DD MMM YYYY HH:mm');
}

/** Short time-only display for schedule lists. */
export function formatTime(iso: string): string {
  return dayjs.utc(iso).tz(TIMEZONE).format('HH:mm');
}

/** Date-only display. */
export function formatDate(iso: string): string {
  return dayjs.utc(iso).tz(TIMEZONE).format('DD MMM YYYY');
}

/** Human-readable elapsed time ("2 hours ago"). */
export function formatRelative(iso: string): string {
  const diff = dayjs().diff(dayjs.utc(iso), 'minute');
  if (diff < 1) return 'just now';
  if (diff < 60) return `${diff}m ago`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
  return `${Math.floor(diff / 1440)}d ago`;
}

/** ISO 8601 with timezone, for audit log entries (21 CFR Part 11 §11.10(e)). */
export function formatAuditTimestamp(iso: string): string {
  return dayjs.utc(iso).tz(TIMEZONE).format('YYYY-MM-DD HH:mm:ss [AST]');
}

/** Patient age from date-of-birth string. */
export function formatAge(dob: string): string {
  const years = dayjs().diff(dayjs(dob), 'year');
  return `${years}y`;
}
