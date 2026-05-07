import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from '@/lib/constants';

// EN namespaces
import enCommon from './locales/en/common.json';
import enAuth from './locales/en/auth.json';
import enOperations from './locales/en/operations.json';
import enUsers from './locales/en/users.json';
import enPatients from './locales/en/patients.json';
import enAppointments from './locales/en/appointments.json';
import enReports from './locales/en/reports.json';
import enAnalytics from './locales/en/analytics.json';
import enAudit from './locales/en/audit.json';
import enSettings from './locales/en/settings.json';
import enErrors from './locales/en/errors.json';

// AR namespaces
import arCommon from './locales/ar/common.json';
import arAuth from './locales/ar/auth.json';
import arOperations from './locales/ar/operations.json';
import arUsers from './locales/ar/users.json';
import arPatients from './locales/ar/patients.json';
import arAppointments from './locales/ar/appointments.json';
import arReports from './locales/ar/reports.json';
import arAnalytics from './locales/ar/analytics.json';
import arAudit from './locales/ar/audit.json';
import arSettings from './locales/ar/settings.json';
import arErrors from './locales/ar/errors.json';

void i18n.use(initReactI18next).init({
  lng: DEFAULT_LANGUAGE,
  supportedLngs: SUPPORTED_LANGUAGES,
  fallbackLng: 'en',
  defaultNS: 'common',
  resources: {
    en: {
      common: enCommon,
      auth: enAuth,
      operations: enOperations,
      users: enUsers,
      patients: enPatients,
      appointments: enAppointments,
      reports: enReports,
      analytics: enAnalytics,
      audit: enAudit,
      settings: enSettings,
      errors: enErrors,
    },
    ar: {
      common: arCommon,
      auth: arAuth,
      operations: arOperations,
      users: arUsers,
      patients: arPatients,
      appointments: arAppointments,
      reports: arReports,
      analytics: arAnalytics,
      audit: arAudit,
      settings: arSettings,
      errors: arErrors,
    },
  },
  interpolation: { escapeValue: false },
});

export default i18n;
