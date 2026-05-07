export interface KpiData {
  label: string;
  value: number;
  change_pct?: number;
  period?: string;
}

export interface TimeSeriesPoint {
  date: string;
  value: number;
}

export interface ScanMixItem {
  scan_type: string;
  count: number;
  pct: number;
}

export interface AnalyticsSummary {
  total_appointments: KpiData;
  avg_turnaround_hours: KpiData;
  portal_adoption_pct: KpiData;
  no_show_rate_pct: KpiData;
  appointment_volume: TimeSeriesPoint[];
  scan_mix: ScanMixItem[];
  turnaround_distribution: { bucket: string; count: number }[];
}
