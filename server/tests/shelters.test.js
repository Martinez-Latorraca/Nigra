import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';

vi.mock('../db.js', () => ({ default: { query: vi.fn() } }));
vi.mock('../middlewares/rateLimiter.js', () => ({
    waitlistLimiter: (req, res, next) => next(),
    authLimiter: (req, res, next) => next(),
    searchLimiter: (req, res, next) => next(),
    reportLimiter: (req, res, next) => next(),
    globalLimiter: (req, res, next) => next(),
    geocodeLimiter: (req, res, next) => next(),
}));
vi.mock('../middlewares/auth.js', () => ({
    authenticateToken: (req, res, next) => {
        const uid = req.headers['x-test-user'];
        if (!uid) return res.status(401).json({ error: 'sin auth' });
        req.user = { id: Number(uid) };
        next();
    },
}));

const { default: pool } = await import('../db.js');
const { default: shelterRoutes } = await import('../routes/shelterRoutes.js');
const { default: adoptionPetRoutes } = await import('../routes/adoptionPetRoutes.js');

const buildApp = () => {
    const app = express();
    app.use(express.json());
    app.use('/api/shelters', shelterRoutes);
    app.use('/api/adoption-pets', adoptionPetRoutes);
    return app;
};

const asUser = (req, id = 10) => req.set('x-test-user', String(id));
const asAdmin = (req) => req.set('x-test-user', '1');

const mockAdminRole = () => pool.query.mockResolvedValueOnce({ rows: [{ role: 'admin' }] });
// requireShelter hace 1 SELECT: shelter approved. Mock ese SELECT.
const mockShelterApproved = (shelterId = 42) =>
    pool.query.mockResolvedValueOnce({ rows: [{ id: shelterId, approved: true }] });
const mockShelterPending = (shelterId = 42) =>
    pool.query.mockResolvedValueOnce({ rows: [{ id: shelterId, approved: false }] });
const mockNoShelter = () => pool.query.mockResolvedValueOnce({ rows: [] });

describe('Shelters', () => {
    beforeEach(() => {
        pool.query.mockReset();
    });

    describe('POST /api/shelters', () => {
        it('crea un shelter nuevo con email del user como fallback', async () => {
            pool.query
                .mockResolvedValueOnce({ rows: [] }) // no tiene shelter
                .mockResolvedValueOnce({ rows: [{ email: 'refugio@x.com' }] }) // user email fallback
                .mockResolvedValueOnce({ rows: [] }) // slug único
                .mockResolvedValueOnce({ rows: [{ id: 5, slug: 'refugio-x', name: 'Refugio X', email: 'refugio@x.com', approved: false }] });

            const res = await asUser(request(buildApp()).post('/api/shelters'))
                .send({ name: 'Refugio X', city: 'Montevideo' });

            expect(res.status).toBe(201);
            expect(res.body.slug).toBe('refugio-x');
            expect(res.body.approved).toBe(false);
        });

        it('409 si el user ya tiene un shelter', async () => {
            pool.query.mockResolvedValueOnce({ rows: [{ id: 5 }] });
            const res = await asUser(request(buildApp()).post('/api/shelters'))
                .send({ name: 'Otro' });
            expect(res.status).toBe(409);
        });
    });

    describe('GET /api/shelters (directorio)', () => {
        it('sin filtros: ORDER BY created_at DESC', async () => {
            pool.query
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [{ total: 0 }] });
            await request(buildApp()).get('/api/shelters');
            const sql = pool.query.mock.calls[0][0];
            expect(sql).toMatch(/ORDER BY created_at DESC/);
            expect(sql).toMatch(/approved = TRUE AND deleted_at IS NULL/);
        });

        it('con lat/lng: ordena por distancia (haversine)', async () => {
            pool.query
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [{ total: 0 }] });
            await request(buildApp()).get('/api/shelters?lat=-34.9&lng=-56.16');
            const [sql, params] = pool.query.mock.calls[0];
            expect(sql).toMatch(/6371 \* acos/);
            expect(sql).toMatch(/ORDER BY \(6371/);
            expect(params[0]).toBe(-34.9);
            expect(params[1]).toBe(-56.16);
        });

        it('filtra por ciudad case-insensitive', async () => {
            pool.query
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [{ total: 0 }] });
            await request(buildApp()).get('/api/shelters?city=Montevideo');
            const sql = pool.query.mock.calls[0][0];
            expect(sql).toMatch(/LOWER\(city\) = LOWER\(\$1\)/);
        });
    });

    describe('admin approve', () => {
        it('PATCH /admin/:id/approve → aprobado + timestamp', async () => {
            mockAdminRole();
            pool.query.mockResolvedValueOnce({ rows: [{ id: 5, slug: 's', name: 'S', approved: true, approved_at: '2026-07-22' }] });
            const res = await asAdmin(request(buildApp()).patch('/api/shelters/admin/5/approve'))
                .send({ approved: true });
            expect(res.status).toBe(200);
            expect(res.body.approved).toBe(true);
        });

        it('403 para non-admin', async () => {
            pool.query.mockResolvedValueOnce({ rows: [{ role: 'user' }] });
            const res = await asUser(request(buildApp()).patch('/api/shelters/admin/5/approve'))
                .send({ approved: true });
            expect(res.status).toBe(403);
        });
    });
});

describe('AdoptionPets', () => {
    beforeEach(() => {
        pool.query.mockReset();
    });

    describe('POST /api/adoption-pets', () => {
        it('crea una publicación (requireShelter + INSERT)', async () => {
            mockShelterApproved(42);
            pool.query.mockResolvedValueOnce({
                rows: [{ id: 100, shelter_id: 42, name: 'Firulais', species: 'dog', photos: ['https://x/a.jpg'] }],
            });
            const res = await asUser(request(buildApp()).post('/api/adoption-pets'))
                .send({
                    name: 'Firulais', species: 'dog', size: 'medium',
                    photos: ['https://x/a.jpg'],
                });
            expect(res.status).toBe(201);
            expect(res.body.name).toBe('Firulais');
        });

        it('403 si el shelter está pendiente de aprobación', async () => {
            mockShelterPending();
            const res = await asUser(request(buildApp()).post('/api/adoption-pets'))
                .send({ species: 'dog', photos: ['https://x/a.jpg'] });
            expect(res.status).toBe(403);
        });

        it('403 si el user no tiene shelter registrado', async () => {
            mockNoShelter();
            const res = await asUser(request(buildApp()).post('/api/adoption-pets'))
                .send({ species: 'dog', photos: ['https://x/a.jpg'] });
            expect(res.status).toBe(403);
        });

        it('400 si species no es válido', async () => {
            mockShelterApproved();
            const res = await asUser(request(buildApp()).post('/api/adoption-pets'))
                .send({ species: 'dragon', photos: ['https://x/a.jpg'] });
            expect(res.status).toBe(400);
        });

        it('400 si photos está vacío', async () => {
            mockShelterApproved();
            const res = await asUser(request(buildApp()).post('/api/adoption-pets'))
                .send({ species: 'dog', photos: [] });
            expect(res.status).toBe(400);
        });

        it('400 si photos supera 6', async () => {
            mockShelterApproved();
            const many = Array.from({ length: 7 }, (_, i) => `https://x/${i}.jpg`);
            const res = await asUser(request(buildApp()).post('/api/adoption-pets'))
                .send({ species: 'dog', photos: many });
            expect(res.status).toBe(400);
        });
    });

    describe('POST /api/adoption-pets/:id/adopted', () => {
        it('marca adopted_at solo si el pet es del shelter caller', async () => {
            mockShelterApproved(42);
            pool.query.mockResolvedValueOnce({ rows: [{ id: 100, adopted_at: '2026-07-22' }] });
            const res = await asUser(request(buildApp()).post('/api/adoption-pets/100/adopted'));
            expect(res.status).toBe(200);
            const [sql, params] = pool.query.mock.calls[1];
            // Guardrail: WHERE con shelter_id impide marcar pets ajenos.
            expect(sql).toMatch(/shelter_id = \$2/);
            expect(params).toEqual([100, 42]);
        });

        it('404 si el pet no existe o no es del shelter', async () => {
            mockShelterApproved();
            pool.query.mockResolvedValueOnce({ rows: [] });
            const res = await asUser(request(buildApp()).post('/api/adoption-pets/999/adopted'));
            expect(res.status).toBe(404);
        });
    });

    describe('GET /api/adoption-pets (feed público)', () => {
        it('por default excluye adoptadas', async () => {
            pool.query
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [{ total: 0 }] });
            await request(buildApp()).get('/api/adoption-pets');
            const sql = pool.query.mock.calls[0][0];
            expect(sql).toMatch(/adopted_at IS NULL/);
        });

        it('include_adopted=true no filtra adoptadas', async () => {
            pool.query
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [{ total: 0 }] });
            await request(buildApp()).get('/api/adoption-pets?include_adopted=true');
            const sql = pool.query.mock.calls[0][0];
            expect(sql).not.toMatch(/adopted_at IS NULL/);
        });

        it('filtra por species + size', async () => {
            pool.query
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [{ total: 0 }] });
            await request(buildApp()).get('/api/adoption-pets?species=cat&size=small');
            const [sql, params] = pool.query.mock.calls[0];
            expect(sql).toMatch(/ap\.species = \$1/);
            expect(sql).toMatch(/ap\.size = \$2/);
            expect(params[0]).toBe('cat');
            expect(params[1]).toBe('small');
        });
    });
});
