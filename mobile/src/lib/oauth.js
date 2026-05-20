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

export function formatAppleFullName(fullName) {
  if (!fullName) return undefined;
  const parts = [fullName.givenName, fullName.familyName].filter(Boolean);
  return parts.length ? parts.join(' ') : undefined;
}
