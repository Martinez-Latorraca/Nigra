// Fallback provider-agnostic: apunta al dominio custom. Si cambiamos de PaaS,
// mimo.uy sigue apuntando al backend nuevo y no hay que tocar código.
export const API_URL =
  process.env.EXPO_PUBLIC_API_URL || 'https://mimo.uy';

// OAuth client IDs — set these in mobile/.env (prefix with EXPO_PUBLIC_)
// so they get inlined at build time.
export const GOOGLE_CLIENT_ID_WEB = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB;
export const GOOGLE_CLIENT_ID_IOS = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS;
export const GOOGLE_CLIENT_ID_ANDROID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID;
