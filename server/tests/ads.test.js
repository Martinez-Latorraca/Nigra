import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';

const { default: adsRoutes } = await import('../routes/adsRoutes.js');
const { activeLoadingSlides } = await import('../lib/loadingSlides.js');

const buildApp = () => {
    const app = express();
    app.use('/api/ads', adsRoutes);
    return app;
};

describe('Ads', () => {
    describe('GET /api/ads/loading', () => {
        it('por ahora solo sirve donación y consejos (sin publicidad)', async () => {
            const res = await request(buildApp()).get('/api/ads/loading');
            expect(res.status).toBe(200);
            const types = new Set(res.body.slides.map((s) => s.type));
            expect([...types].sort()).toEqual(['consejo', 'donacion']);
        });
    });

    describe('activeLoadingSlides', () => {
        const now = new Date('2026-11-22T12:00:00Z');

        it('filtra por vigencia y tipo, y ordena por order', () => {
            const slides = [
                { id: 'b', type: 'consejo', order: 2 },
                { id: 'a', type: 'donacion', order: 1 },
                { id: 'viejo', type: 'vet', order: 0, ends_at: '2026-11-01T00:00:00Z' },
                { id: 'futuro', type: 'producto', order: 0, starts_at: '2026-12-01T00:00:00Z' },
                { id: 'raro', type: 'popup', order: 0 },
                { id: 'vigente', type: 'vet', order: 3, starts_at: '2026-11-01T00:00:00Z', ends_at: '2026-12-01T00:00:00Z' },
            ];
            expect(activeLoadingSlides(slides, now).map((s) => s.id)).toEqual(['a', 'b', 'vigente']);
        });
    });
});
