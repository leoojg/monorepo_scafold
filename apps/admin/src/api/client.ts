import Axios, { type AxiosRequestConfig, type AxiosError } from 'axios';
import i18n from '@/i18n';

const AXIOS_INSTANCE = Axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1',
  withCredentials: true,
});

AXIOS_INSTANCE.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token!);
    }
  });
  failedQueue = [];
}

AXIOS_INSTANCE.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config;

    if (
      error.response?.status !== 401 ||
      !originalRequest ||
      (originalRequest as any)._retry ||
      originalRequest.url === '/auth/refresh' ||
      originalRequest.url === '/auth/login'
    ) {
      if (error.response?.status === 401) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_operator');
        window.location.href = '/login';
      }

      const errorCode = (error.response?.data as any)?.errorCode;
      if (errorCode) {
        const key = `errors.${errorCode}`;
        (error as any).translatedMessage = i18n.exists(`common:${key}`)
          ? i18n.t(`common:${key}`)
          : i18n.t('common:errors.UNKNOWN');
      }

      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({
          resolve: (token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(AXIOS_INSTANCE(originalRequest));
          },
          reject,
        });
      });
    }

    isRefreshing = true;
    (originalRequest as any)._retry = true;

    try {
      const { data } = await AXIOS_INSTANCE.post('/auth/refresh');
      const newToken = data.accessToken;

      localStorage.setItem('auth_token', newToken);
      if (data.operator) {
        localStorage.setItem('auth_operator', JSON.stringify(data.operator));
      }

      originalRequest.headers.Authorization = `Bearer ${newToken}`;
      processQueue(null, newToken);

      return AXIOS_INSTANCE(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_operator');
      window.location.href = '/login';
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

export const customInstance = <T>(config: AxiosRequestConfig): Promise<T> => {
  const promise = AXIOS_INSTANCE(config).then(({ data }) => data);
  return promise;
};

export default customInstance;
