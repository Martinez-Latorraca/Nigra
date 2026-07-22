import { useEffect, useRef } from 'react';
import { trackImpressions } from './vetTracking';

// Set global de vet_ids ya reportados en esta sesión — evita que un scroll
// arriba/abajo del feed cuente 2 veces la misma card. Se resetea al reload.
const seen = new Set();

// Buffer con debounce corto: junta varios vet_ids que entren al viewport casi
// simultáneos y los manda en un solo request.
let buffer = [];
let flushTimer = null;
const FLUSH_MS = 800;

const flush = () => {
    if (buffer.length === 0) return;
    trackImpressions(buffer);
    buffer = [];
};

const enqueue = (vetId) => {
    if (seen.has(vetId)) return;
    seen.add(vetId);
    buffer.push(vetId);
    if (flushTimer) clearTimeout(flushTimer);
    flushTimer = setTimeout(flush, FLUSH_MS);
};

// Devuelve una ref-callback que registra impresión cuando la card entra al
// viewport (IntersectionObserver, threshold 0.5). Un observer por elemento
// para poder desconectar al desmontar.
export function useTrackImpression(vetId) {
    const observerRef = useRef(null);

    useEffect(() => () => {
        if (observerRef.current) observerRef.current.disconnect();
    }, []);

    return (node) => {
        if (observerRef.current) {
            observerRef.current.disconnect();
            observerRef.current = null;
        }
        if (!node || !vetId || typeof IntersectionObserver === 'undefined') return;
        if (seen.has(vetId)) return;
        const obs = new IntersectionObserver((entries) => {
            for (const e of entries) {
                if (e.isIntersecting) {
                    enqueue(vetId);
                    obs.disconnect();
                    observerRef.current = null;
                }
            }
        }, { threshold: 0.5 });
        obs.observe(node);
        observerRef.current = obs;
    };
}
