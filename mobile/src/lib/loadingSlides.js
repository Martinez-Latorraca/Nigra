import { useEffect, useState } from 'react';
import api from './api';

// Slides del carrusel de la pantalla de espera del reporte. Vienen del
// servidor (GET /api/ads/loading, server/lib/loadingSlides.js) para poder
// cambiarlos sin publicar la app. Si no hay slides, el carrusel no se muestra.
//
// Hoy el servidor sirve solo donación y consejos. Los slides de publicidad
// (vet socia, producto, refugio) están implementados pero no se cargan hasta
// tener usuarios reales. Para verlos en desarrollo:
// EXPO_PUBLIC_LOADING_SLIDES_MOCK=1 en mobile/.env (y reiniciar Metro).
const USE_MOCK = __DEV__ && process.env.EXPO_PUBLIC_LOADING_SLIDES_MOCK === '1';

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
    id: 'mock-refugio',
    type: 'refugio',
    title: 'Refugio de ejemplo',
    text: 'Tenemos 12 perros y gatos buscando familia. Conocelos y, si podés, dales un hogar.',
    button_text: 'Ver refugio',
    route: '/shelters',
    shelter: { name: 'Refugio de ejemplo' },
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
      .then((slides) => (USE_MOCK ? [...MOCK_SLIDES, ...slides] : slides));
  }
  return cache;
}

// audience: 'lost' | 'found'. Los slides con otra audience se descartan.
export function useLoadingSlides(audience) {
  const [slides, setSlides] = useState([]);
  useEffect(() => {
    let alive = true;
    loadLoadingSlides().then(
      (s) => alive && setSlides(s.filter((x) => !x.audience || !audience || x.audience === audience))
    );
    return () => {
      alive = false;
    };
  }, [audience]);
  return slides;
}
