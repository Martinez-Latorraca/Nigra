import api from './api';

export async function exchangeGoogleToken(idToken) {
  const { data } = await api.post('/api/auth/google', { idToken });
  return data;
}

export async function exchangeAppleToken(identityToken, fullName) {
  const payload = { identityToken };
  if (fullName) payload.fullName = fullName;
  const { data } = await api.post('/api/auth/apple', payload);
  return data;
}

export async function exchangeFacebookToken(accessToken) {
  const { data } = await api.post('/api/auth/facebook', { accessToken });
  return data;
}

export async function fetchOAuthLinks() {
  const { data } = await api.get('/api/auth/links');
  return data;
}

export async function linkGoogleToAccount(idToken) {
  const { data } = await api.post('/api/auth/link/google', { idToken });
  return data;
}

export async function linkFacebookToAccount(accessToken) {
  const { data } = await api.post('/api/auth/link/facebook', { accessToken });
  return data;
}

export async function unlinkOAuthProvider(provider) {
  const { data } = await api.delete(`/api/auth/link/${provider}`);
  return data;
}

export function formatAppleFullName(fullName) {
  if (!fullName) return undefined;
  const parts = [fullName.givenName, fullName.familyName].filter(Boolean);
  return parts.length ? parts.join(' ') : undefined;
}
