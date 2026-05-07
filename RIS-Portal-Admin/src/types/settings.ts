export interface DepartmentSettings {
  name_en: string;
  name_ar: string;
  address_en?: string;
  address_ar?: string;
  phone?: string;
  email?: string;
  working_days: number[];
  working_hours_start: string;
  working_hours_end: string;
  timezone: string;
  logo_url?: string;
  logo_dark_url?: string;
}

export interface ScanType {
  id: string;
  name_en: string;
  name_ar: string;
  slot_duration_minutes: number;
  daily_max_bookings: number;
  prep_instruction_id?: string;
  required_equipment?: string;
  active: boolean;
}

export interface PrepInstruction {
  id: string;
  scan_type_id: string;
  content_en: string;
  content_ar: string;
  updated_at: string;
}

export interface PacsConnection {
  id: string;
  name: string;
  ae_title: string;
  host: string;
  port: number;
  type: 'DICOM_SCP' | 'DICOMWEB' | 'ORTHANC';
  active: boolean;
}
