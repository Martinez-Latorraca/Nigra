// Imágenes para compartir fichas (diseño: pantallas/Compartir.dc.html).
//
//   card  → 1200×630, la vista previa del link (WhatsApp, Facebook, X, Telegram).
//   story → 1080×1920, para historias de Instagram / estados de WhatsApp.
//
// Se arman con satori (layout tipo flexbox → SVG con el texto convertido a
// trazos, así no dependemos de fuentes del sistema), resvg las pasa a
// píxeles y jpeg-js a JPEG (la vista previa tiene que pesar menos de 300 KB).
// Quedan en una caché chica en memoria: los crawlers de cada red piden la
// misma imagen varias veces seguidas.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import jpeg from 'jpeg-js';
import { translateType, translateColor } from '../utils/translations.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const fontDir = path.join(here, '..', 'assets', 'fonts');

let fonts = null;
function loadFonts() {
    if (!fonts) {
        const read = (f) => fs.readFileSync(path.join(fontDir, f));
        fonts = [
            { name: 'Nunito', data: read('nunito-900.woff'), weight: 900, style: 'normal' },
            { name: 'DM Sans', data: read('dm-sans-700.woff'), weight: 700, style: 'normal' },
            { name: 'DM Sans', data: read('dm-sans-500.woff'), weight: 500, style: 'normal' },
        ];
    }
    return fonts;
}

const C = {
    coral: '#FF5C6C',
    teal: '#3ECFB2',
    violeta: '#9B6DFF',
    arena: '#F0EBE8',
    crema: '#FFF6F0',
    noche: '#1A1A2E',
};

// ── Textos ────────────────────────────────────────────────────────────────

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');

// "Barrio, Ciudad" → "Barrio" (address la arma reverseGeocode).
const barrioOf = (address) => (address ? String(address).split(',')[0].trim() : '');

export function relativeDay(iso, now = new Date()) {
    if (!iso) return '';
    const start = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const days = Math.round((start(now) - start(new Date(iso))) / 86400000);
    if (days <= 0) return 'Hoy';
    if (days === 1) return 'Ayer';
    if (days < 14) return `Hace ${days} días`;
    if (days < 60) return `Hace ${Math.round(days / 7)} semanas`;
    return `Hace ${Math.round(days / 30)} meses`;
}

const AGE = { puppy: 'Cachorro', young: 'Joven', adult: 'Adulto', senior: 'Mayor' };
const SPECIES = { dog: 'perro', cat: 'gato' };

// Todo lo que muestran la imagen y las meta tags, a partir de la fila de la DB.
// pet: fila de `pets`. adoption: fila de `adoption_pets` + shelter_name/shelter_city.
export function petShareData(pet) {
    const type = cap(translateType(pet.type)) || 'Mascota';
    const color = cap(translateColor(pet.color));
    const barrio = barrioOf(pet.address);
    const when = relativeDay(pet.created_at);
    const meta = [type, color].filter(Boolean).join(' · ');
    const resolved = !!pet.resolved_at;

    if (pet.status === 'lost') {
        const name = pet.name || `${type} perdido`;
        return {
            kind: 'pet', id: pet.id, color: C.coral, species: pet.type,
            chip: resolved ? 'Reencontrada' : 'Perdido',
            kicker: resolved ? '¡Volvió a casa!' : '¡Ayudanos a que vuelva a casa!',
            storyHead: resolved ? 'VOLVIÓ A CASA' : 'SE BUSCA',
            name, meta,
            lines: [
                barrio ? { icon: 'pin', text: `Se perdió en ${barrio}` } : null,
                when ? { icon: 'clock', text: when } : null,
            ].filter(Boolean),
            cta: resolved ? 'Gracias por compartir' : 'Si la viste, avisá en Mimo',
            title: pet.name
                ? `${pet.name} se perdió${barrio ? ` en ${barrio}` : ''} · Mimo`
                : `${type} perdido${barrio ? ` en ${barrio}` : ''} · Mimo`,
            description: `${[type, color.toLowerCase()].filter(Boolean).join(' ')}. Si la viste, avisá en Mimo.`,
            photo: pet.photo_url,
            path: `/pet/${pet.id}`,
        };
    }

    const name = `${type} encontrado`;
    return {
        kind: 'pet', id: pet.id, color: C.teal, species: pet.type,
        chip: resolved ? 'Reencontrada' : 'Encontrado',
        kicker: resolved ? '¡Volvió a casa!' : '¿Es tuyo?',
        storyHead: resolved ? 'VOLVIÓ A CASA' : 'ENCONTRADO',
        name, meta,
        lines: [
            barrio ? { icon: 'pin', text: `Encontrado en ${barrio}` } : null,
            when ? { icon: 'clock', text: when } : null,
        ].filter(Boolean),
        cta: resolved ? 'Gracias por compartir' : '¿Lo conocés? Escribí en Mimo',
        title: `${name}${barrio ? ` en ${barrio}` : ''} · Mimo`,
        description: `${[type, color.toLowerCase()].filter(Boolean).join(' ')}. ¿Es tuyo? Escribí en Mimo.`,
        photo: pet.photo_url,
        path: `/pet/${pet.id}`,
    };
}

export function adoptionShareData(ap) {
    const type = cap(SPECIES[ap.species]) || 'Mascota';
    const female = ap.sex === 'female';
    const age = AGE[ap.age_group];
    const neutered = ap.neutered ? (female ? 'Castrada' : 'Castrado') : null;
    const meta = [type, age, neutered].filter(Boolean).join(' · ');
    const place = [ap.shelter_name, ap.shelter_city].filter(Boolean).join(' · ');
    const adopted = !!ap.adopted_at;
    const name = ap.name || `${type} en adopción`;
    const photos = Array.isArray(ap.photos) ? ap.photos : [];
    return {
        kind: 'adoption', id: ap.id, color: C.violeta, species: ap.species,
        chip: adopted ? 'Adoptado' : 'En adopción',
        kicker: adopted ? 'Final feliz' : 'Busca familia',
        storyHead: adopted ? 'ADOPTADO' : 'EN ADOPCIÓN',
        name, meta,
        lines: [
            place ? { icon: 'pin', text: place } : null,
            ap.vaccinated ? { icon: 'check', text: female ? 'Vacunada' : 'Vacunado' } : null,
        ].filter(Boolean),
        cta: adopted ? 'Gracias por compartir' : (female ? 'Conocela en Mimo' : 'Conocelo en Mimo'),
        title: adopted ? `${name} ya tiene familia · Mimo` : `${name} busca familia · Mimo`,
        description: `${meta}. ${adopted ? 'Encontró su casa gracias a Mimo.' : (female ? 'Conocela en Mimo.' : 'Conocelo en Mimo.')}`,
        photo: photos[0] || null,
        path: `/adoptions/${ap.id}`,
    };
}

// ── Gráficos ──────────────────────────────────────────────────────────────

const svgUri = (svg) => `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;

const ICONS = {
    pin: '<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    dog: '<path d="M11.25 16.25h1.5L12 17z"/><path d="M16 14v.5"/><path d="M4.42 11.247A13.152 13.152 0 0 0 4 14.556C4 18.728 7.582 21 12 21s8-2.272 8-6.444a11.702 11.702 0 0 0-.493-3.309"/><path d="M8 14v.5"/><path d="M8.5 8.5c-.384 1.05-1.083 2.028-2.344 2.5-1.931.722-3.576-.297-3.656-1-.113-.994 1.177-6.53 4-7 1.923-.321 3.651.845 3.651 2.235A7.497 7.497 0 0 1 14 5.277c0-1.39 1.844-2.598 3.767-2.277 2.823.47 4.113 6.006 4 7-.08.703-1.725 1.722-3.656 1-1.261-.472-1.855-1.45-2.239-2.5"/>',
    cat: '<path d="M12 5c.67 0 1.35.09 2 .26 1.78-2 5.03-2.84 6.42-2.26 1.4.58-.42 7-.42 7 .57 1.07 1 2.24 1 3.44C21 17.9 16.97 21 12 21s-9-3-9-7.56c0-1.25.5-2.4 1-3.44 0 0-1.89-6.42-.5-7 1.39-.58 4.72.23 6.5 2.23A9.04 9.04 0 0 1 12 5Z"/><path d="M8 14v.5"/><path d="M16 14v.5"/><path d="M11.25 16.25h1.5L12 17l-.75-.75Z"/>',
};
const iconUri = (name, color, strokeWidth = 2) => svgUri(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`
);

// Pin de la marca (client/public/landing/pin.svg) con los colores invertidos:
// sobre fondo de color va el pin claro y la huella del color del fondo.
let pinTemplate = null;
function pinUri(pinColor, pawColor) {
    if (!pinTemplate) pinTemplate = fs.readFileSync(path.join(here, '..', 'assets', 'pin.svg'), 'utf8');
    return svgUri(pinTemplate.replace('#FF5C6C', '@@PIN@@').replaceAll('#FFF6F0', pawColor).replace('@@PIN@@', pinColor));
}

// Foto recortada al tamaño exacto por Cloudinary (g_auto centra en lo
// importante) y embebida como data URI.
async function loadPhoto(url, w, h) {
    if (!url) return null;
    const sized = url.includes('/upload/')
        ? url.replace('/upload/', `/upload/c_fill,g_auto,w_${w},h_${h},f_jpg,q_80/`)
        : url;
    try {
        const res = await fetch(sized);
        if (!res.ok) return null;
        const buf = Buffer.from(await res.arrayBuffer());
        return `data:image/jpeg;base64,${buf.toString('base64')}`;
    } catch {
        return null;
    }
}

// Mini-helper para escribir el árbol de satori sin JSX.
const h = (type, style, ...children) => ({
    type,
    props: { style, children: children.flat().filter((c) => c !== null && c !== false && c !== undefined) },
});
const img = (src, style) => ({ type: 'img', props: { src, style } });

function photoBox(d, photo, w, h_, radius) {
    if (photo) return img(photo, { width: w, height: h_, borderRadius: radius, objectFit: 'cover' });
    // Sin foto: recuadro Arena con el ícono de perro o gato.
    return h('div', {
        width: w, height: h_, borderRadius: radius, background: C.arena,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
    }, img(iconUri(d.species === 'cat' ? 'cat' : 'dog', d.color, 1.5), { width: w * 0.4, height: w * 0.4 }));
}

const nameSize = (name, base) => (name.length > 16 ? base * 0.62 : name.length > 11 ? base * 0.8 : base);

function cardTree(d, photo) {
    return h('div', {
        width: 1200, height: 630, display: 'flex', background: d.color, padding: 24,
        fontFamily: 'DM Sans', color: C.crema,
    },
    photoBox(d, photo, 450, 582, 32),
    h('div', { flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '14px 12px 8px 44px' },
        h('div', { display: 'flex', flexDirection: 'column', alignItems: 'flex-start' },
            h('div', {
                display: 'flex', background: C.crema, color: d.color, borderRadius: 999,
                padding: '6px 18px', fontSize: 20, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase',
            }, d.chip),
            h('div', { display: 'flex', marginTop: 26, fontSize: 30, fontWeight: 700 }, d.kicker),
            h('div', {
                display: 'flex', fontFamily: 'Nunito', fontWeight: 900, fontSize: nameSize(d.name, 92),
                lineHeight: 1.05, marginTop: 6, maxWidth: 640,
            }, d.name),
            d.meta ? h('div', { display: 'flex', marginTop: 12, fontSize: 28, fontWeight: 500 }, d.meta) : null,
            h('div', { display: 'flex', flexDirection: 'column', marginTop: 22, gap: 10 },
                d.lines.map((l) => h('div', { display: 'flex', alignItems: 'center', gap: 12, fontSize: 28, fontWeight: 700 },
                    img(iconUri(l.icon, C.crema), { width: 28, height: 28 }),
                    l.text,
                )),
            ),
        ),
        h('div', { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
            h('div', { display: 'flex', alignItems: 'center', gap: 12 },
                img(pinUri(C.crema, d.color), { width: 40, height: 49 }),
                h('div', { display: 'flex', fontFamily: 'Nunito', fontWeight: 900, fontSize: 46 }, 'mimo'),
            ),
            h('div', { display: 'flex', fontSize: 24, fontWeight: 700 }, d.cta),
        ),
    ));
}

function storyTree(d, photo, link) {
    return h('div', {
        width: 1080, height: 1920, display: 'flex', flexDirection: 'column', alignItems: 'center',
        background: d.color, padding: '96px 72px 88px', fontFamily: 'DM Sans', color: C.crema,
    },
    h('div', { display: 'flex', alignItems: 'center', gap: 14 },
        img(pinUri(C.crema, d.color), { width: 44, height: 54 }),
        h('div', { display: 'flex', fontFamily: 'Nunito', fontWeight: 900, fontSize: 52 }, 'mimo'),
    ),
    h('div', { display: 'flex', marginTop: 36, fontFamily: 'Nunito', fontWeight: 900, fontSize: 112, letterSpacing: 2 }, d.storyHead),
    h('div', { display: 'flex', marginTop: 36 }, photoBox(d, photo, 840, 840, 56)),
    h('div', {
        display: 'flex', marginTop: 40, fontFamily: 'Nunito', fontWeight: 900, fontSize: nameSize(d.name, 104),
        textAlign: 'center', lineHeight: 1.05,
    }, d.name),
    d.meta ? h('div', { display: 'flex', marginTop: 16, fontSize: 40, fontWeight: 500 }, d.meta) : null,
    d.lines.length
        ? h('div', { display: 'flex', alignItems: 'center', gap: 12, marginTop: 20, fontSize: 36, fontWeight: 700 },
            img(iconUri(d.lines[0].icon, C.crema), { width: 36, height: 36 }),
            d.lines.map((l) => l.text).join(' · '))
        : null,
    h('div', { flex: 1, display: 'flex' }),
    h('div', {
        width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
        background: C.crema, color: C.noche, borderRadius: 40, padding: '40px 32px',
    },
        h('div', { display: 'flex', fontSize: 46, fontWeight: 700 }, d.cta),
        h('div', { display: 'flex', fontSize: 32, fontWeight: 500 }, link),
    ));
}

// ── Render + caché ────────────────────────────────────────────────────────

const cache = new Map();
const CACHE_MAX = 60;

function toJpeg(svg, quality) {
    const rendered = new Resvg(svg, { font: { loadSystemFonts: false } }).render();
    return jpeg.encode({ data: rendered.pixels, width: rendered.width, height: rendered.height }, quality).data;
}

// variant: 'card' | 'story'. baseUrl: para escribir el link en la historia.
export async function renderShareImage(d, variant, baseUrl) {
    const key = JSON.stringify([variant, d]);
    if (cache.has(key)) return cache.get(key);

    const isStory = variant === 'story';
    const photo = isStory ? await loadPhoto(d.photo, 840, 840) : await loadPhoto(d.photo, 450, 582);
    const link = `${String(baseUrl).replace(/^https?:\/\//, '')}${d.path}`;
    const tree = isStory ? storyTree(d, photo, link) : cardTree(d, photo);
    const size = isStory ? { width: 1080, height: 1920 } : { width: 1200, height: 630 };
    const svg = await satori(tree, { ...size, fonts: loadFonts() });
    const buf = toJpeg(svg, isStory ? 85 : 82);

    if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
    cache.set(key, buf);
    return buf;
}
