export type AppointmentStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW';

export interface Appointment {
  id: string;
  patient_id: string;
  patient_name: string;
  patient_phone?: string;
  patient_civil_id?: string;
  scan_type: string;
  scheduled_at: string;
  status: AppointmentStatus;
  clinical_indication?: string;
  confirmation_code?: string;
  booking_timestamp?: string;
  technologist_id?: string;
  room?: string;
  created_at: string;
  updated_at: string;
}

export interface ConfirmAppointmentPayload {
  appointment_id: string;
}

export interface ReschedulePayload {
  appointment_id: string;
  new_scheduled_at: string;
  reason?: string;
}
