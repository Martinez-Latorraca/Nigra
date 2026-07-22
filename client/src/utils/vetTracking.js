// Analytics de vets sponsor (impresiones + clicks). Fire-and-forget: los
// errores se silencian porque analytics no debe romper UX.
//
// La dedupe de impresiones vive en useTrackImpressions.jsx (Set por sesión).

const API = import.meta.env.VITE_API_URL || '';

const post = (path, body) => {
    try {
        fetch(`${API}${path}`, {
            method: 'POST',
            headers: body ? { 'Content-Type': 'application/json' } : undefined,
            body: body ? JSON.stringify(body) : undefined,
            keepalive: true,
        }).catch(() => {});
    } catch { /* noop */ }
};

export const trackAdClick = (vetId) => {
    if (!vetId) return;
    post(`/api/vets/${vetId}/click`);
};

export const trackContactClick = (vetId) => {
    if (!vetId) return;
    post(`/api/vets/${vetId}/contact-click`);
};

export const trackImpressions = (vetIds) => {
    if (!Array.isArray(vetIds) || vetIds.length === 0) return;
    post('/api/vets/events/impressions', { vet_ids: vetIds });
};
