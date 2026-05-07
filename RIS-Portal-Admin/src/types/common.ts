export type Theme = 'light' | 'dark';
export type Language = 'en' | 'ar';
export type Direction = 'ltr' | 'rtl';

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface ApiError {
  detail: string;
  status_code?: number;
}

export interface BilingualText {
  en: string;
  ar: string;
}
