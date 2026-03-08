import Axios, { type AxiosRequestConfig } from 'axios';
import i18n from '@/i18n';

const AXIOS_INSTANCE = Axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1',
});

AXIOS_INSTANCE.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

AXIOS_INSTANCE.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }

    const errorCode = error.response?.data?.errorCode;
    if (errorCode) {
      const key = `errors.${errorCode}`;
      error.translatedMessage = i18n.exists(`common:${key}`)
        ? i18n.t(`common:${key}`)
        : i18n.t('common:errors.UNKNOWN');
    }

    return Promise.reject(error);
  },
);

export const customInstance = <T>(config: AxiosRequestConfig): Promise<T> => {
  const promise = AXIOS_INSTANCE(config).then(({ data }) => data);
  return promise;
};

export default customInstance;
