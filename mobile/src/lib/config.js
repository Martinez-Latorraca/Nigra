// Fallback provider-agnostic: apunta al dominio custom. Si cambiamos de PaaS,
// mimo.uy sigue apuntando al backend nuevo y no hay que tocar código.
export const API_URL =
  process.env.EXPO_PUBLIC_API_URL || 'https://mimo.uy';

// Link de donación de Mercado Pago. Vive acá y no en cada componente: en la
// web el mismo link estaba copiado en varios archivos y uno quedó viejo
// (apuntaba a un short link genérico que mandaba a Mercado Pago Brasil).
// El dominio tiene que ser `.com.uy`.
export const MP_DONATION_URL = 'https://link.mercadopago.com.uy/mimouy';

// Mail de contacto/soporte. Mismo motivo que arriba: estaba escrito a mano en
// varias pantallas. Si se migra a un dominio propio (soporte@mimo.uy) se
// cambia acá y en client/src/utils/links.js.
export const CONTACT_EMAIL = 'somos.mimo.app@gmail.com';

export const mailtoContact = (subject) =>
  `mailto:${CONTACT_EMAIL}${subject ? `?subject=${encodeURIComponent(subject)}` : ''}`;

// OAuth client IDs — set these in mobile/.env (prefix with EXPO_PUBLIC_)
// so they get inlined at build time.
export const GOOGLE_CLIENT_ID_WEB = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB;
export const GOOGLE_CLIENT_ID_IOS = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS;
export const GOOGLE_CLIENT_ID_ANDROID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID;
