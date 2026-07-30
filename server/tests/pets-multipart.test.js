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

        it('vectoriza las fotos extra en pet_embeddings (multi-vector)', async () => {
            pool.query.mockResolvedValue({ rows: [] });
            pool.query.mockResolvedValueOnce({
                rows: [{ id: 99, description: 'x', status: 'lost', photo_url: 'https://fake.cdn/pet.jpg', name: 'Rex', extra_photos: '[]' }],
            });

            const res = await request(buildApp())
                .post('/api/pets/report-pet')
                .set('x-test-user', '7')
                .field('description', 'Perro perdido en Pocitos')
                .field('status', 'lost')
                .field('type', 'dog')
                .field('color', 'brown')
                .attach('image', PNG_1x1, 'test.png')
                .attach('extra_images', PNG_1x1, 'extra1.png')
                .attach('extra_images', PNG_1x1, 'extra2.png');
            expect(res.status).toBe(200);

            // embedExtraPhotos es fire-and-forget: dejamos correr los awaits.
            await new Promise((r) => setTimeout(r, 50));

            const embeddingInserts = pool.query.mock.calls.filter(
                ([sql]) => /INSERT INTO pet_embeddings/.test(sql)
            );
            // Una fila por foto extra, todas apuntando al pet recién creado.
            expect(embeddingInserts).toHaveLength(2);
            expect(embeddingInserts[0][1][0]).toBe(99); // pet_id
            expect(typeof embeddingInserts[0][1][1]).toBe('string'); // embedding JSON
        });

        it('notifyMatches: gatea por match_score pero guarda la distancia visual cruda', async () => {
            // Candidato de OTRO color: la distancia visual (0.20) pasa el
            // umbral, y aun con la penalidad de color (score 0.23) sigue
            // entrando. Antes este match se perdía por el filtro duro de color.
            const candidate = {
                id: 5, user_id: 8, name: 'Luna', description: 'd', color: 'black',
                visual_distance: 0.2, match_score: 0.23,
                push_token: null, deleted_at: null, original_email: null,
            };
            pool.query.mockImplementation((sql) => {
                if (/INSERT INTO pets/.test(sql)) {
                    return Promise.resolve({ rows: [{ id: 77, status: 'lost', photo_url: 'u', name: 'Rex' }] });
                }
                if (/original_email/.test(sql)) return Promise.resolve({ rows: [candidate] });
                if (/INSERT INTO notifications/.test(sql)) return Promise.resolve({ rows: [{ id: 900 }] });
                return Promise.resolve({ rows: [] });
            });

            await request(buildApp())
                .post('/api/pets/report-pet')
                .set('x-test-user', '7')
                .field('description', 'Perro perdido en Pocitos')
                .field('status', 'lost')
                .field('type', 'dog')
                .field('color', 'brown')
                .field('lat', '-34.9')
                .field('lng', '-56.16')
                .attach('image', PNG_1x1, 'test.png');
            await new Promise((r) => setTimeout(r, 50));

            const meCall = pool.query.mock.calls.find(([sql]) => /INSERT INTO match_events/.test(sql));
            expect(meCall).toBeDefined();
            // El dataset de ML guarda la distancia VISUAL cruda (0.2), no el
            // score penalizado (0.23) — el score es solo para gatear.
            expect(meCall[1][5]).toBe(0.2);
        });

        it('notifyMatches: descarta al candidato cuyo match_score supera el umbral', async () => {
            const tooFar = {
                id: 6, user_id: 9, name: 'Otro', description: 'd', color: 'black',
                visual_distance: 0.24, match_score: 0.27, // la penalidad lo saca
                push_token: null, deleted_at: null, original_email: null,
            };
            pool.query.mockImplementation((sql) => {
                if (/INSERT INTO pets/.test(sql)) {
                    return Promise.resolve({ rows: [{ id: 78, status: 'lost', photo_url: 'u', name: 'Rex' }] });
                }
                if (/original_email/.test(sql)) return Promise.resolve({ rows: [tooFar] });
                return Promise.resolve({ rows: [] });
            });

            await request(buildApp())
                .post('/api/pets/report-pet')
                .set('x-test-user', '7')
                .field('description', 'Perro perdido en Pocitos')
                .field('status', 'lost')
                .field('type', 'dog')
                .field('color', 'brown')
                .field('lat', '-34.9')
                .field('lng', '-56.16')
                .attach('image', PNG_1x1, 'test.png');
            await new Promise((r) => setTimeout(r, 50));

            expect(pool.query.mock.calls.find(([sql]) => /INSERT INTO match_events/.test(sql))).toBeUndefined();
        });

        it('sin fotos extra no toca pet_embeddings', async () => {
            pool.query.mockResolvedValue({ rows: [] });
            pool.query.mockResolvedValueOnce({
                rows: [{ id: 100, description: 'x', status: 'lost', photo_url: 'https://fake.cdn/pet.jpg', name: 'Rex', extra_photos: '[]' }],
            });

            await request(buildApp())
                .post('/api/pets/report-pet')
                .set('x-test-user', '7')
                .field('description', 'Perro perdido en Pocitos')
                .field('status', 'lost')
                .field('type', 'dog')
                .field('color', 'brown')
                .attach('image', PNG_1x1, 'test.png');
            await new Promise((r) => setTimeout(r, 50));

            const embeddingInserts = pool.query.mock.calls.filter(
                ([sql]) => /INSERT INTO pet_embeddings/.test(sql)
            );
            expect(embeddingInserts).toHaveLength(0);
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
                    { id: 1, visual_distance: 0.1, match_score: 0.1, name: 'A' },
                    { id: 2, visual_distance: 0.5, match_score: 0.5, name: 'B' }, // debería filtrarse (>0.25)
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
                rows: [{ id: 3, visual_distance: 0.15, match_score: 0.15, distance_km: 2, name: 'C' }],
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

        it('el color NO es filtro duro: es una penalidad en el score', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] });
            await request(buildApp())
                .post('/api/pets/search-pet')
                .field('type', 'dog')
                .field('color', 'brown')
                .field('status', 'lost')
                .attach('image', PNG_1x1, 'test.png');

            const [sql] = pool.query.mock.calls[0];
            // Ya no se descarta por color en el WHERE...
            expect(sql).not.toMatch(/AND\s+p\.color\s*=/);
            // ...sino que se penaliza en el score y se ordena por él.
            expect(sql).toMatch(/CASE WHEN color =/);
            expect(sql).toMatch(/ORDER BY match_score/);
        });

        it('considera los embeddings extra de cada mascota (max-similarity)', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] });
            await request(buildApp())
                .post('/api/pets/search-pet')
                .field('type', 'dog')
                .field('color', 'brown')
                .field('status', 'lost')
                .attach('image', PNG_1x1, 'test.png');

            const [sql] = pool.query.mock.calls[0];
            expect(sql).toMatch(/FROM pet_embeddings pe WHERE pe\.pet_id = p\.id/);
            expect(sql).toMatch(/MIN\(LEAST\(/); // menor distancia entre todas las fotos
        });
    });
});
