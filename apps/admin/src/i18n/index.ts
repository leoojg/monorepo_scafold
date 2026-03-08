import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import commonEn from './locales/en/common.json';
import authEn from './locales/en/auth.json';
import tenantsEn from './locales/en/tenants.json';
import companiesEn from './locales/en/companies.json';
import usersEn from './locales/en/users.json';
import activityEn from './locales/en/activity.json';

import commonPtBR from './locales/pt-BR/common.json';
import authPtBR from './locales/pt-BR/auth.json';
import tenantsPtBR from './locales/pt-BR/tenants.json';
import companiesPtBR from './locales/pt-BR/companies.json';
import usersPtBR from './locales/pt-BR/users.json';
import activityPtBR from './locales/pt-BR/activity.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        common: commonEn,
        auth: authEn,
        tenants: tenantsEn,
        companies: companiesEn,
        users: usersEn,
        activity: activityEn,
      },
      'pt-BR': {
        common: commonPtBR,
        auth: authPtBR,
        tenants: tenantsPtBR,
        companies: companiesPtBR,
        users: usersPtBR,
        activity: activityPtBR,
      },
    },
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: ['common', 'auth', 'tenants', 'companies', 'users', 'activity'],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
  });

export default i18n;
