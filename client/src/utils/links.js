// Links externos que aparecen en más de un lugar.
//
// El link de donación estaba escrito a mano en cuatro archivos y uno quedó
// desincronizado: el footer apuntaba a `https://mpago.la/1`, un short link
// genérico de Mercado Pago que resuelve al país por defecto y mandaba a la
// gente a Mercado Pago Brasil. Una donación perdida por copiar y pegar.
//
// El dominio importa: tiene que ser `.com.uy`, no el short link.
export const MP_DONATION_URL = 'https://link.mercadopago.com.uy/mimouy';

export const INSTAGRAM_URL = 'https://www.instagram.com/somos.mimo.uy/';

// Mapas: tiles de CARTO (Positron / Dark Matter). Desde el 25/9/2026 CARTO
// pide una key; sin ella los tiles muestran "API KEY REQUIRED". La key es
// gratuita (uso comercial hasta 1M de tiles/mes) y es pública por diseño:
// viaja en cada pedido de tile, así que va en el código y no en un secreto.
// Se puede pisar con VITE_CARTO_KEY.
export const CARTO_KEY = import.meta.env.VITE_CARTO_KEY || 'cb1_5e1i_1_6721bb1683f152b9c1d9733e';
export const CARTO_LIGHT_TILES = `https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png?key=${CARTO_KEY}`;

// Mail de contacto/soporte. Estaba escrito a mano en 9 lugares entre web y
// mobile — el mismo patrón que hizo que el link de donación quedara viejo en
// el footer. Si algún día se migra a un dominio propio (soporte@mimo.uy), se
// cambia acá y en mobile/src/lib/config.js, y listo.
export const CONTACT_EMAIL = 'somos.mimo.app@gmail.com';

// mailto con asunto ya armado, que es como se usa en casi todos los casos.
export const mailtoContact = (subject) =>
    `mailto:${CONTACT_EMAIL}${subject ? `?subject=${encodeURIComponent(subject)}` : ''}`;
