import { useEffect, useState } from 'react';
import api from './api';

// Slides del carrusel de la pantalla de espera del reporte. Vienen del
// servidor (GET /api/ads/loading, server/lib/loadingSlides.js) para poder
// cambiarlos sin publicar la app. Mientras no haya veterinarias socias ni
// anunciantes reales el servidor devuelve [] y el carrusel no se muestra.
//
// En desarrollo, si el servidor no trae nada, se usa MOCK_SLIDES para poder
// ver el carrusel. Para probar cómo queda sin carrusel en desarrollo:
// EXPO_PUBLIC_LOADING_SLIDES_MOCK=0 en mobile/.env (y reiniciar Metro).
const USE_MOCK = __DEV__ && process.env.EXPO_PUBLIC_LOADING_SLIDES_MOCK !== '0';

// Contenido de ejemplo, sin marcas reales.
const MOCK_SLIDES = [
  {
    id: 'mock-vet',
    type: 'vet',
    title: 'Veterinaria de ejemplo',
    text: 'Urgencias 24 h cerca de donde reportaste. Si la encontrás lastimada, te atendemos sin turno.',
    button_text: 'Ver perfil',
    route: '/vets',
    vet: { name: 'Veterinaria de ejemplo', plan: 'sponsor_pro' },
  },
  {
    id: 'mock-donacion',
    type: 'donacion',
    title: 'Mimo es gratis gracias a la comunidad',
    text: 'Cada búsqueda como esta tiene un costo. Si podés, un cafecito nos ayuda a seguir conectando familias.',
    button_text: 'Donar por Mercado Pago',
  },
  {
    id: 'mock-producto',
    type: 'producto',
    brand: 'Marca de ejemplo',
    title: 'Collar con rastreo GPS',
    text: 'Que no se vuelva a perder. 20 % de descuento con el código:',
    code: 'MIMO20',
    button_text: 'Ver oferta',
    link: 'https://mimo.uy',
  },
  {
    id: 'mock-consejo',
    type: 'consejo',
    title: 'Las primeras horas son las más importantes',
    items: [
      'Recorré la zona y llamala por su nombre.',
      'Avisá a las veterinarias y refugios cercanos.',
      'Compartí el reporte en los grupos del barrio.',
    ],
  },
];

let cache = null; // promesa compartida: se pide una vez por sesión

export function loadLoadingSlides() {
  if (!cache) {
    cache = api
      .get('/api/ads/loading', { timeout: 6000 })
      .then(({ data }) => (Array.isArray(data?.slides) ? data.slides : []))
      .catch(() => {
        cache = null; // reintentar la próxima vez
        return [];
      })
      .then((slides) => (slides.length === 0 && USE_MOCK ? MOCK_SLIDES : slides));
  }
  return cache;
}

export function useLoadingSlides() {
  const [slides, setSlides] = useState([]);
  useEffect(() => {
    let alive = true;
    loadLoadingSlides().then((s) => alive && setSlides(s));
    return () => {
      alive = false;
    };
  }, []);
  return slides;
}
