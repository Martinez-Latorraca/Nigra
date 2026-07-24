// Fallback: hostname interno de Render. En prod se overridea con EXPO_PUBLIC_API_URL
// = https://mimo.uy. Cambio nigra-server → mimo-server tras el rebrand.
export const API_URL =
  process.env.EXPO_PUBLIC_API_URL || 'https://mimo-server.onrender.com';

// OAuth client IDs — set these in mobile/.env (prefix with EXPO_PUBLIC_)
// so they get inlined at build time.
export const GOOGLE_CLIENT_ID_WEB = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB;
export const GOOGLE_CLIENT_ID_IOS = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS;
export const GOOGLE_CLIENT_ID_ANDROID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID;
