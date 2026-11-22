// Slides del carrusel de la pantalla de espera del reporte (mobile).
//
// Se sirven desde acá y no desde la app para poder cambiarlos sin publicar
// una versión nueva. Por ahora la lista está VACÍA a propósito: el carrusel
// se oculta mientras no haya veterinarias socias ni anunciantes reales
// (decisión de 2026-11-22). La app trae un mock propio solo en desarrollo.
//
// Forma de cada slide:
//   id          string único
//   type        'vet' | 'producto' | 'donacion' | 'consejo'
//   order       número, menor primero
//   starts_at   ISO opcional: no se muestra antes
//   ends_at     ISO opcional: no se muestra después
//   title, text
//   image_url   opcional (vet, producto)
//   button_text opcional (sin botón si falta)
//   link        URL externa, o route: ruta interna de la app (p. ej. '/vets/<slug>')
//   vet:        { name, plan, logo_url? }     solo type 'vet' (plan = sponsor_basic|pro|nation)
//   brand, code solo type 'producto'
//   items       string[], solo type 'consejo'
//
// Si algún día hay que administrarlos desde el panel, esto pasa a una tabla
// con las mismas columnas y activeLoadingSlides() no cambia de firma.
export const LOADING_SLIDES = [];

export const SLIDE_TYPES = ['vet', 'producto', 'donacion', 'consejo'];

export function activeLoadingSlides(slides = LOADING_SLIDES, now = new Date()) {
    const t = now.getTime();
    return slides
        .filter((s) => SLIDE_TYPES.includes(s.type))
        .filter((s) => !s.starts_at || new Date(s.starts_at).getTime() <= t)
        .filter((s) => !s.ends_at || new Date(s.ends_at).getTime() > t)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}
