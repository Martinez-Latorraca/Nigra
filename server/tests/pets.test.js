import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';

vi.mock('../db.js', () => ({ default: { query: vi.fn() } }));
vi.mock('../middlewares/auth.js', () => ({
    authenticateToken: (req, res, next) => {
        const uid = req.headers['x-test-user'];
        if (!uid) return res.status(401).json({ error: 'sin auth' });
        req.user = { id: Number(uid), role: req.headers['x-test-role'] || 'user' };
        next();
    },
}));
vi.mock('../middlewares/rateLimiter.js', () => ({
    authLimiter: (req, res, next) => next(),
    searchLimiter: (req, res, next) => next(),
    reportLimiter: (req, res, next) => next(),
    globalLimiter: (req, res, next) => next(),
}));
vi.mock('../utils/geocode.js', () => ({
    reverseGeocode: vi.fn(() => Promise.resolve('Fake address')),
    searchAddress: vi.fn(() => Promise.resolve([])),
}));
vi.mock('../ai.js', () => ({
    loadModel: vi.fn(),
    generateEmbedding: vi.fn(() => new Array(1280).fill(0.1)),
    generateEmbeddings: vi.fn(() => [new Array(1280).fill(0.1), new Array(1280).fill(0.2), new Array(1280).fill(0.3)]),
}));
vi.mock('../utils/push.js', () => ({ sendExpoPush: vi.fn() }));
vi.mock('cloudinary', () => ({ v2: { config: vi.fn() } }));

const { default: pool } = await import('../db.js');
const { default: petRoutes } = await import('../routes/petRoutes.js');

// io mock — capturamos las emisiones de pet_resolved / pet_reopened.
const makeIoMock = () => {
    const emit = vi.fn();
    const to = vi.fn(() => ({ emit }));
    return { to, _emit: emit };
};

const buildApp = (io = null) => {
    const app = express();
    app.use(express.json());
    if (io) app.locals.io = io;
    app.use('/api/pets', petRoutes);
    return app;
};

describe('Pets', () => {
    beforeEach(() => {
        pool.query.mockReset();
    });

    describe('GET /api/pets/:id', () => {
        it('devuelve la mascota cuando existe', async () => {
            pool.query.mockResolvedValueOnce({
                rows: [{ id: 1, status: 'lost', user_id: 1, photo_url: 'url', resolved_at: null }],
            });
            const res = await request(buildApp()).get('/api/pets/1');
            expect(res.status).toBe(200);
            expect(res.body.id).toBe(1);
        });

        it('404 si no existe', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] });
            const res = await request(buildApp()).get('/api/pets/999');
            expect(res.status).toBe(404);
        });
    });

    describe('GET /api/pets (feed)', () => {
        it('lista paginada y excluye resueltas', async () => {
            pool.query
                .mockResolvedValueOnce({ rows: [{ count: '2' }] })
                .mockResolvedValueOnce({ rows: [{ id: 1 }, { id: 2 }] });
            const res = await request(buildApp()).get('/api/pets?page=1&limit=12');
            expect(res.status).toBe(200);
            expect(res.body.total).toBe(2);
            expect(res.body.pets).toHaveLength(2);
            // La query debe filtrar las resueltas
            const sql = pool.query.mock.calls[0][0];
            expect(sql).toMatch(/resolved_at IS NULL/i);
        });
    });

    describe('GET /api/pets/my-reports', () => {
        it('requiere auth', async () => {
            const res = await request(buildApp()).get('/api/pets/my-reports');
            expect(res.status).toBe(401);
        });

        it('devuelve mis reportes paginados', async () => {
            pool.query
                .mockResolvedValueOnce({ rows: [{ count: '1' }] })
                .mockResolvedValueOnce({ rows: [{ id: 5, user_id: 7 }] });
            const res = await request(buildApp()).get('/api/pets/my-reports').set('x-test-user', '7');
            expect(res.status).toBe(200);
            expect(res.body.reports[0].id).toBe(5);
            expect(res.body.total).toBe(1);
        });
    });

    describe('PATCH /api/pets/:id/resolve', () => {
        it('marca como reunida (dueño)', async () => {
            pool.query
                .mockResolvedValueOnce({ rows: [{ user_id: 7 }] })   // SELECT owner
                .mockResolvedValueOnce({ rowCount: 1 })              // UPDATE pets
                .mockResolvedValueOnce({ rowCount: 0 });             // UPDATE messages (mark read)
            const res = await request(buildApp())
                .patch('/api/pets/1/resolve')
                .set('x-test-user', '7')
                .send({ resolved: true });
            expect(res.status).toBe(200);
            expect(res.body.resolved_at).toBeTruthy();
        });

        it('marca como leídos los mensajes pendientes del pet (fix de campanita fantasma)', async () => {
            pool.query
                .mockResolvedValueOnce({ rows: [{ user_id: 7 }] })
                .mockResolvedValueOnce({ rowCount: 1 })
                .mockResolvedValueOnce({ rowCount: 3 });
            await request(buildApp())
                .patch('/api/pets/5/resolve')
                .set('x-test-user', '7')
                .send({ resolved: true });

            // Verifica que se haya disparado el UPDATE messages con is_read=true
            const messagesCall = pool.query.mock.calls.find(([sql]) =>
                /UPDATE messages SET is_read = true/i.test(sql)
            );
            expect(messagesCall).toBeDefined();
            expect(messagesCall[1]).toEqual(['5']); // pet_id llega como string desde req.params
        });

        it('reabrir (resolved=false) NO toca los messages (no volvemos a marcarlos como no-leídos)', async () => {
            pool.query
                .mockResolvedValueOnce({ rows: [{ user_id: 7 }] })
                .mockResolvedValueOnce({ rowCount: 1 });
            await request(buildApp())
                .patch('/api/pets/5/resolve')
                .set('x-test-user', '7')
                .send({ resolved: false });

            const messagesCall = pool.query.mock.calls.find(([sql]) =>
                /UPDATE messages SET is_read/i.test(sql)
            );
            expect(messagesCall).toBeUndefined();
        });

        it('reabre el reporte (resolved=false)', async () => {
            pool.query
                .mockResolvedValueOnce({ rows: [{ user_id: 7 }] })
                .mockResolvedValueOnce({ rowCount: 1 });
            const res = await request(buildApp())
                .patch('/api/pets/1/resolve')
                .set('x-test-user', '7')
                .send({ resolved: false });
            expect(res.status).toBe(200);
            expect(res.body.resolved_at).toBeNull();
        });

        it('403 si no soy el dueño', async () => {
            pool.query.mockResolvedValueOnce({ rows: [{ user_id: 99 }] });
            const res = await request(buildApp())
                .patch('/api/pets/1/resolve')
                .set('x-test-user', '7')
                .send({ resolved: true });
            expect(res.status).toBe(403);
        });

        it('404 si no existe', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] });
            const res = await request(buildApp())
                .patch('/api/pets/9999/resolve')
                .set('x-test-user', '7')
                .send({ resolved: true });
            expect(res.status).toBe(404);
        });

        it('400 si falta el campo resolved', async () => {
            const res = await request(buildApp())
                .patch('/api/pets/1/resolve')
                .set('x-test-user', '7')
                .send({});
            expect(res.status).toBe(400);
        });

        it('guarda resolved_with_user_id + emite pet_resolved a ambas partes', async () => {
            pool.query
                .mockResolvedValueOnce({ rows: [{ user_id: 7, name: 'Rocky' }] })
                .mockResolvedValueOnce({ rowCount: 1 })
                .mockResolvedValueOnce({ rowCount: 0 }); // UPDATE messages mark read
            const io = makeIoMock();
            const res = await request(buildApp(io))
                .patch('/api/pets/1/resolve')
                .set('x-test-user', '7')
                .send({ resolved: true, resolved_with_user_id: 42 });

            expect(res.status).toBe(200);
            expect(res.body.resolved_with_user_id).toBe(42);

            // El UPDATE de pets debe llevar el resolvedWith en el segundo binding
            const [, updateParams] = pool.query.mock.calls[1];
            expect(updateParams[1]).toBe(42);

            // Emit a la sala del owner y del finder
            expect(io.to).toHaveBeenCalledWith('user_7');
            expect(io.to).toHaveBeenCalledWith('user_42');
            expect(io._emit).toHaveBeenCalledWith('pet_resolved', expect.objectContaining({
                pet_id: 1,
                pet_name: 'Rocky',
                resolved_with_user_id: 42,
                owner_id: 7,
            }));
        });

        it('sin resolved_with_user_id emite solo al owner (no rompe)', async () => {
            pool.query
                .mockResolvedValueOnce({ rows: [{ user_id: 7, name: 'Rocky' }] })
                .mockResolvedValueOnce({ rowCount: 1 })
                .mockResolvedValueOnce({ rowCount: 0 }); // UPDATE messages mark read
            const io = makeIoMock();
            await request(buildApp(io))
                .patch('/api/pets/1/resolve')
                .set('x-test-user', '7')
                .send({ resolved: true });

            expect(io.to).toHaveBeenCalledWith('user_7');
            // No emite a otro user_ id
            expect(io.to).toHaveBeenCalledTimes(1);
        });

        it('reabrir (resolved=false) emite pet_reopened y limpia resolved_with_user_id', async () => {
            pool.query
                .mockResolvedValueOnce({ rows: [{ user_id: 7, name: 'Rocky' }] })
                .mockResolvedValueOnce({ rowCount: 1 });
            const io = makeIoMock();
            const res = await request(buildApp(io))
                .patch('/api/pets/1/resolve')
                .set('x-test-user', '7')
                .send({ resolved: false, resolved_with_user_id: 42 });

            expect(res.body.resolved_at).toBeNull();
            expect(res.body.resolved_with_user_id).toBeNull();
            expect(io._emit).toHaveBeenCalledWith('pet_reopened', { pet_id: 1 });
        });
    });

    describe('DELETE /api/pets/:id', () => {
        it('borra mi reporte', async () => {
            pool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
            const res = await request(buildApp()).delete('/api/pets/1').set('x-test-user', '7');
            expect(res.status).toBe(200);
        });

        it('404 si no es mío o no existe', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] });
            const res = await request(buildApp()).delete('/api/pets/1').set('x-test-user', '7');
            expect(res.status).toBe(404);
        });
    });
});
