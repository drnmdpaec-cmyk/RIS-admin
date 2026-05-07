export type ReportStatus = 'DRAFT' | 'SIGNED' | 'DELIVERED' | 'CRITICAL';

export interface Report {
  id: string;
  patient_id: string;
  patient_name: string;
  appointment_id: string;
  scan_type: string;
  study_date: string;
  signed_at?: string;
  signed_by?: string;
  delivered_at?: string;
  status: ReportStatus;
  has_clinical_summary: boolean;
  clinical_summary_en?: string;
  clinical_summary_ar?: string;
  is_critical: boolean;
  pdf_url?: string;
  created_at: string;
  updated_at: string;
}

export interface DeliverReportPayload {
  report_id: string;
  clinical_summary_en: string;
  clinical_summary_ar: string;
  is_critical?: boolean;
}
