import axios from 'axios';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { store } from '../store/store';
import { clearCredentials } from '../store/userSlice';
import { API_URL } from './config';

const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
  const token = store.getState().user.token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const AUTH_ENDPOINTS = ['/api/auth/login', '/api/auth/register', '/api/oauth/'];

export function isTokenError(status, message) {
  if (status === 401) return true;
  if (status !== 403) return false;
  return /token|expir/i.test(message || '');
}

// Estado del lockout que evita alerts apilados si varias requests fallan
// en paralelo con el mismo token expirado. Fábrica con clock inyectable
// para poder testear sin timers reales.
export function createAuthErrorHandler({ dispatch, alert, navigate, setTimeoutFn = setTimeout } = {}) {
  let logoutInFlight = false;
  return function handleAuthError(error) {
    const status = error?.response?.status;
    const url = error?.config?.url || '';
    const message = error?.response?.data?.error || '';
    const isAuthCall = AUTH_ENDPOINTS.some((p) => url.includes(p));

    if (!isAuthCall && isTokenError(status, message) && !logoutInFlight) {
      logoutInFlight = true;
      dispatch(clearCredentials());
      alert('Sesión expirada', 'Iniciá sesión de nuevo para continuar.');
      navigate('/login');
      setTimeoutFn(() => { logoutInFlight = false; }, 1000);
    }

    return Promise.reject(error);
  };
}

const handleAuthError = createAuthErrorHandler({
  dispatch: store.dispatch,
  alert: Alert.alert,
  navigate: (path) => router.replace(path),
});

api.interceptors.response.use((response) => response, handleAuthError);

export default api;
