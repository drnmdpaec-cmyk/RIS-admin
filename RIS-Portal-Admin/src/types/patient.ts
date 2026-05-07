export type PortalStatus = 'REGISTERED' | 'NOT_REGISTERED' | 'DISABLED';

export interface Patient {
  id: string;
  full_name: string;
  full_name_ar?: string;
  civil_id?: string;
  date_of_birth?: string;
  phone?: string;
  email?: string;
  portal_status: PortalStatus;
  last_appointment_date?: string;
  total_appointments: number;
  created_at: string;
  updated_at: string;
}

export interface UpdatePatientPayload {
  full_name?: string;
  full_name_ar?: string;
  phone?: string;
  email?: string;
}
