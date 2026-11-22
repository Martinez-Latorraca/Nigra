// Slides del carrusel de la pantalla de espera del reporte (mobile).
//
// Se sirven desde acá y no desde la app para poder cambiarlos sin publicar
// una versión nueva. Si la lista queda vacía, la app no muestra el carrusel.
//
// Decisión 2026-11-22: por ahora solo donación y consejos. Los slides de
// publicidad (vet socia, producto, refugio) ya están implementados en la app
// pero no se cargan hasta tener usuarios reales con vets y sponsors.
//
// Forma de cada slide:
//   id          string único
//   type        'vet' | 'producto' | 'refugio' | 'donacion' | 'consejo'
//   order       número, menor primero
//   audience    opcional: 'lost' (perdí) | 'found' (encontré). Sin esto se muestra a todos.
//   starts_at   ISO opcional: no se muestra antes
//   ends_at     ISO opcional: no se muestra después
//   title, text
//   image_url   opcional (vet, producto, refugio)
//   button_text opcional (sin botón si falta)
//   link        URL externa, o route: ruta interna de la app (p. ej. '/vets/<slug>')
//   vet:        { name, plan, logo_url? }   solo type 'vet' (plan = sponsor_basic|pro|nation)
//   shelter:    { name, logo_url? }         solo type 'refugio'
//   brand, code solo type 'producto'
//   items       string[], solo type 'consejo'
//
// Si algún día hay que administrarlos desde el panel, esto pasa a una tabla
// con las mismas columnas y activeLoadingSlides() no cambia de firma.
export const LOADING_SLIDES = [
    {
        id: 'donacion',
        type: 'donacion',
        order: 1,
        title: 'Mimo es gratis gracias a la comunidad',
        text: 'Cada búsqueda como esta tiene un costo. Si podés, un cafecito nos ayuda a seguir conectando familias.',
        button_text: 'Donar por Mercado Pago',
    },
    {
        id: 'consejo-perdi',
        type: 'consejo',
        order: 2,
        audience: 'lost',
        title: 'Las primeras horas son las más importantes',
        items: [
            'Recorré la zona y llamala por su nombre.',
            'Avisá a las veterinarias y refugios cercanos.',
            'Compartí el reporte en los grupos del barrio.',
        ],
    },
    {
        id: 'consejo-encontre',
        type: 'consejo',
        order: 2,
        audience: 'found',
        title: 'Mientras buscamos a su familia',
        items: [
            'Fijate si tiene chapita o un collar con teléfono.',
            'Una veterinaria puede leerle el chip, si tiene.',
            'Dejala en un lugar seguro, con agua y sombra.',
        ],
    },
];

export const SLIDE_TYPES = ['vet', 'producto', 'refugio', 'donacion', 'consejo'];

export function activeLoadingSlides(slides = LOADING_SLIDES, now = new Date()) {
    const t = now.getTime();
    return slides
        .filter((s) => SLIDE_TYPES.includes(s.type))
        .filter((s) => !s.starts_at || new Date(s.starts_at).getTime() <= t)
        .filter((s) => !s.ends_at || new Date(s.ends_at).getTime() > t)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}
