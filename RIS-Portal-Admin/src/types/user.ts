export type UserType = 'ADMIN' | 'STAFF' | 'RADIOLOGIST' | 'REFERRING_DOCTOR' | 'PATIENT';
export type UserStatus = 'ACTIVE' | 'DISABLED' | 'LOCKED';

export interface User {
  id: string;
  email: string;
  full_name: string;
  full_name_ar?: string;
  user_type: UserType;
  status: UserStatus;
  permissions: string[];
  phone?: string;
  require_mfa: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

export interface AuthUser extends User {
  access_token: string;
}

export interface CreateUserPayload {
  email: string;
  full_name: string;
  full_name_ar?: string;
  user_type: 'STAFF' | 'RADIOLOGIST' | 'REFERRING_DOCTOR';
  permissions: string[];
  phone?: string;
  require_mfa: boolean;
  send_invite?: boolean;
  initial_password?: string;
}

export interface UpdateUserPayload extends Partial<CreateUserPayload> {
  status?: UserStatus;
}
