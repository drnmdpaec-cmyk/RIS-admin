import { z } from 'zod';
import { noscript } from './security';

export const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .email('Invalid email address')
  .max(254, 'Email too long');

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password too long');

export const clinicalTextSchema = (label: string) =>
  z
    .string()
    .min(1, `${label} is required`)
    .max(5000, `${label} is too long`)
    .refine(noscript, `${label} contains invalid characters`);

export const civilIdSchema = z
  .string()
  .regex(/^\d{12}$/, 'Civil ID must be exactly 12 digits');

export const phoneSchema = z
  .string()
  .regex(/^\+?[\d\s\-().]{7,20}$/, 'Invalid phone number');

export const mfaCodeSchema = z
  .string()
  .regex(/^\d{6}$/, 'Code must be exactly 6 digits');

export const backupCodeSchema = z
  .string()
  .min(8, 'Backup code is too short')
  .max(64, 'Backup code is too long')
  .refine(noscript, 'Backup code contains invalid characters');
