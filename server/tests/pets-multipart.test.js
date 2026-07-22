import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';

vi.mock('../db.js', () => ({ default: { query: vi.fn() } }));
vi.mock('../middlewares/auth.js', () => ({
    authenticateToken: (req, res, next) => {
        const uid = req.headers['x-test-user'];
        if (!uid) return res.status(401).json({ error: 'sin auth' });
        req.user = { id: Number(uid) };
        next();
    },
}));
vi.mock('../middlewares/rateLimiter.js', () => ({
    authLimiter: (req, res, next) => next(),
    searchLimiter: (req, res, next) => next(),
    reportLimiter: (req, res, next) => next(),
    globalLimiter: (req, res, next) => next(),
}));
// blockIfShelter hace 1 query a shelters. Para no ensuciar cada test con esa
// row extra, mockeamos que siempre pasa (el user no es shelter).
vi.mock('../middlewares/shelterAuth.js', () => ({
    requireShelter: (req, res, next) => next(),
    blockIfShelter: (req, res, next) => next(),
}));
vi.mock('../utils/geocode.js', () => ({
    reverseGeocode: vi.fn(() => Promise.resolve('Fake, Uruguay')),
    searchAddress: vi.fn(() => Promise.resolve([])),
}));
vi.mock('../ai.js', () => ({
    loadModel: vi.fn(),
    generateEmbedding: vi.fn(() => new Array(1280).fill(0.1)),
    generateEmbeddings: vi.fn(() => [
        new Array(1280).fill(0.1),
        new Array(1280).fill(0.2),
        new Array(1280).fill(0.3),
    ]),
}));
vi.mock('../utils/push.js', () => ({ sendExpoPush: vi.fn() }));

// Cloudinary: mockeamos upload_stream para que resuelva con una URL fake.
vi.mock('cloudinary', () => {
    const upload_stream = (opts, cb) => ({
        end: () => cb(null, { secure_url: 'https://fake.cdn/pet.jpg' }),
    });
    return {
        v2: {
            config: vi.fn(),
            uploader: { upload_stream },
        },
    };
});

const { default: pool } = await import('../db.js');
const { default: petRoutes } = await import('../routes/petRoutes.js');

const buildApp = () => {
    const app = express();
    app.use(express.json());
    // Simulamos req.app.locals.io para el fire-and-forget de notifyMatchesForReport.
    app.locals.io = { to: () => ({ emit: vi.fn() }) };
    app.use('/api/pets', petRoutes);
    return app;
};

// PNG minimal válido (1x1 transparente) — para que multer + fileFilter lo acepte.
const PNG_1x1 = Buffer.from(
    '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489000000' +
    '0d49444154789c626001000000ffff030000060005574c6bd50000000049454e44ae426082',
    'hex'
);

describe('Pets multipart', () => {
    beforeEach(() => {
        pool.query.mockReset();
    });

    describe('POST /api/pets/report-pet', () => {
        it('requiere auth', async () => {
            const res = await request(buildApp())
                .post('/api/pets/report-pet')
                .field('description', 'Perro perdido en Pocitos')
                .field('status', 'lost')
                .field('type', 'dog')
                .field('color', 'brown')
                .attach('image', PNG_1x1, 'test.png');
            expect(res.status).toBe(401);
        });

        it('400 si falta la imagen', async () => {
            const res = await request(buildApp())
                .post('/api/pets/report-pet')
                .set('x-test-user', '7')
                .field('description', 'Perro perdido en Pocitos')
                .field('status', 'lost')
                .field('type', 'dog')
                .field('color', 'brown');
            expect(res.status).toBe(400);
        });

        it('400 si el schema no valida (type inválido)', async () => {
            const res = await request(buildApp())
                .post('/api/pets/report-pet')
                .set('x-test-user', '7')
                .field('description', 'Test')
                .field('status', 'lost')
                .field('type', 'elefante')
                .field('color', 'brown')
                .attach('image', PNG_1x1, 'test.png');
            expect(res.status).toBe(400);
            expect(res.body.error).toMatch(/tipo debe ser/i);
        });

        it('400 si el schema no valida (description < 3 chars)', async () => {
            const res = await request(buildApp())
                .post('/api/pets/report-pet')
                .set('x-test-user', '7')
                .field('description', 'x')
                .field('status', 'lost')
                .field('type', 'dog')
                .field('color', 'brown')
                .attach('image', PNG_1x1, 'test.png');
            expect(res.status).toBe(400);
        });

        it('happy path: sube imagen, guarda pet y dispara match check', async () => {
            // INSERT pet returning the new row
            pool.query.mockResolvedValueOnce({
                rows: [{
                    id: 42, description: 'Perro perdido', status: 'lost',
                    photo_url: 'https://fake.cdn/pet.jpg', name: 'Rocky',
                    extra_photos: '[]', created_at: new Date().toISOString(),
                    address: 'Fake, Uruguay',
                }],
            });
            // notifyMatchesForReport hace UNA query para buscar matches (SELECT).
            // Como es fire-and-forget con .then/.catch, cualquier resultado sirve.
            pool.query.mockResolvedValueOnce({ rows: [] });

            const res = await request(buildApp())
                .post('/api/pets/report-pet')
                .set('x-test-user', '7')
                .field('description', 'Perro perdido en Pocitos')
                .field('status', 'lost')
                .field('type', 'dog')
                .field('color', 'brown')
                .field('name', 'Rocky')
                .field('lat', '-34.9')
                .field('lng', '-56.16')
                .attach('image', PNG_1x1, 'test.png');
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.pet.id).toBe(42);

            // El INSERT debe recibir el URL de Cloudinary y el vector JSON
            const [, params] = pool.query.mock.calls[0];
            expect(params[3]).toBe('https://fake.cdn/pet.jpg'); // photo_url
            expect(typeof params[4]).toBe('string'); // embedding JSON
        });
    });

    describe('POST /api/pets/search-pet', () => {
        it('400 si falta la imagen (aunque los campos estén completos, no pasa multer)', async () => {
            const res = await request(buildApp())
                .post('/api/pets/search-pet')
                .field('type', 'dog')
                .field('color', 'brown')
                .field('status', 'lost');
            // Sin file, el schema pasa pero el controller devuelve 400.
            expect(res.status).toBe(400);
        });

        it('400 si el schema no valida (color inválido)', async () => {
            const res = await request(buildApp())
                .post('/api/pets/search-pet')
                .field('type', 'dog')
                .field('color', 'violeta')
                .field('status', 'lost')
                .attach('image', PNG_1x1, 'test.png');
            expect(res.status).toBe(400);
        });

        it('sin lat/lng: usa la query no-geo', async () => {
            pool.query.mockResolvedValueOnce({
                rows: [
                    { id: 1, visual_distance: 0.1, name: 'A' },
                    { id: 2, visual_distance: 0.5, name: 'B' }, // debería filtrarse (>0.25)
                ],
            });
            const res = await request(buildApp())
                .post('/api/pets/search-pet')
                .field('type', 'dog')
                .field('color', 'brown')
                .field('status', 'lost')
                .attach('image', PNG_1x1, 'test.png');
            expect(res.status).toBe(200);
            // Solo el que pasa el threshold
            expect(res.body).toHaveLength(1);
            expect(res.body[0].id).toBe(1);

            const [sql] = pool.query.mock.calls[0];
            expect(sql).not.toMatch(/distance_km/); // no geo
            expect(sql).toMatch(/resolved_at IS NULL/);
        });

        it('con lat/lng: usa la query geo con radio', async () => {
            pool.query.mockResolvedValueOnce({
                rows: [{ id: 3, visual_distance: 0.15, distance_km: 2, name: 'C' }],
            });
            const res = await request(buildApp())
                .post('/api/pets/search-pet')
                .field('type', 'cat')
                .field('color', 'black')
                .field('status', 'found')
                .field('lat', '-34.9')
                .field('lng', '-56.16')
                .field('searchRatio', '5')
                .attach('image', PNG_1x1, 'test.png');
            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(1);
            expect(res.body[0].id).toBe(3);

            const [sql, params] = pool.query.mock.calls[0];
            expect(sql).toMatch(/distance_km/);
            expect(params[0]).toBe(-34.9);
            expect(params[1]).toBe(-56.16);
            expect(params[4]).toBe(5); // radio
        });
    });
});
