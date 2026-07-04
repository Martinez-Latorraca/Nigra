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

const AUTH_ENDPOINTS = ['/api/auth/login', '/api/auth/register', '/api/oauth/'];
let logoutInFlight = false;

function isTokenError(status, message) {
  if (status === 401) return true;
  if (status !== 403) return false;
  return /token|expir/i.test(message || '');
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const url = error?.config?.url || '';
    const message = error?.response?.data?.error || '';
    const isAuthCall = AUTH_ENDPOINTS.some((p) => url.includes(p));

    if (!isAuthCall && isTokenError(status, message) && !logoutInFlight) {
      logoutInFlight = true;
      store.dispatch(clearCredentials());
      Alert.alert('Sesión expirada', 'Iniciá sesión de nuevo para continuar.');
      router.replace('/login');
      setTimeout(() => { logoutInFlight = false; }, 1000);
    }

    return Promise.reject(error);
  }
);

export default api;
