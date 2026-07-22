import api from './api';

// Analytics de vets sponsor. Fire-and-forget: los errores se silencian porque
// analytics no debe romper UX.
//
// La dedupe de impresiones vive en el caller (Set por sesión, ver useTrackImpressions).

const post = (path, body) => {
    api.post(path, body).catch(() => {});
};

export const trackAdClick = (vetId) => {
    if (!vetId) return;
    post(`/api/vets/${vetId}/click`);
};

export const trackContactClick = (vetId) => {
    if (!vetId) return;
    post(`/api/vets/${vetId}/contact-click`);
};

// Set global de vet_ids ya reportados en esta sesión.
const seen = new Set();
let buffer = [];
let flushTimer = null;
const FLUSH_MS = 800;

const flush = () => {
    if (buffer.length === 0) return;
    post('/api/vets/events/impressions', { vet_ids: buffer });
    buffer = [];
};

export const trackImpressionOnce = (vetId) => {
    if (!vetId || seen.has(vetId)) return;
    seen.add(vetId);
    buffer.push(vetId);
    if (flushTimer) clearTimeout(flushTimer);
    flushTimer = setTimeout(flush, FLUSH_MS);
};
