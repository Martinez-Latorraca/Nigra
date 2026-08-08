// Datos de contacto públicos de Mimo.
//
// Estaban escritos a mano en varios lugares (política de privacidad, reply-to
// de los mails transaccionales, y 9 puntos más entre web y mobile). El mismo
// patrón hizo que el link de donación del footer quedara viejo y mandara a
// Mercado Pago Brasil, así que se centraliza.
//
// Ojo: esto NO es el mail de las cuentas de desarrollador de Google/Meta/Apple
// —ese es personal de Nico y vive en la config de cada plataforma—. Este es el
// contacto que ve el público: soporte, verificación de refugios y la política
// de privacidad. Si algún día hay dominio propio, pasa a soporte@mimo.uy acá,
// en client/src/utils/links.js y en mobile/src/lib/config.js.
export const CONTACT_EMAIL = process.env.CONTACT_EMAIL || 'somos.mimo.app@gmail.com';
