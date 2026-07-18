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
const { default: vetRoutes } = await import('../routes/vetRoutes.js');

const buildApp = () => {
    const app = express();
    app.use(express.json());
    app.use('/api/vets', vetRoutes);
    return app;
};

const asAdmin = (req) => req.set('x-test-user', '1');
const asUser = (req, id = 10) => req.set('x-test-user', String(id));

// requireAdmin usa pool.query — mockeamos el SELECT role.
const mockAdminRole = () => {
    pool.query.mockResolvedValueOnce({ rows: [{ role: 'admin' }] });
};
const mockNonAdminRole = () => {
    pool.query.mockResolvedValueOnce({ rows: [{ role: 'user' }] });
};

describe('Vets', () => {
    beforeEach(() => {
        pool.query.mockReset();
    });

    describe('POST /api/vets (auto-registro)', () => {
        it('crea una vet nueva para el user autenticado', async () => {
            pool.query
                .mockResolvedValueOnce({ rows: [] }) // no tiene vet
                .mockResolvedValueOnce({ rows: [] }) // slug único
                .mockResolvedValueOnce({ rows: [{ id: 5, slug: 'vet-amigo', name: 'Vet Amigo', approved: false }] });

            const res = await asUser(
                request(buildApp()).post('/api/vets'),
                10
            ).send({ name: 'Vet Amigo', city: 'Montevideo' });

            expect(res.status).toBe(201);
            expect(res.body.slug).toBe('vet-amigo');
            expect(res.body.approved).toBe(false);
        });

        it('genera slug único agregando -2 si colisiona', async () => {
            pool.query
                .mockResolvedValueOnce({ rows: [] }) // no tiene vet
                .mockResolvedValueOnce({ rows: [{}] }) // slug colisiona
                .mockResolvedValueOnce({ rows: [] }) // -2 libre
                .mockResolvedValueOnce({ rows: [{ id: 6, slug: 'vet-amigo-2' }] });

            const res = await asUser(request(buildApp()).post('/api/vets')).send({ name: 'Vet Amigo' });
            expect(res.status).toBe(201);
            expect(res.body.slug).toBe('vet-amigo-2');
        });

        it('rechaza con 409 si el user ya tiene una vet', async () => {
            pool.query.mockResolvedValueOnce({ rows: [{ id: 4 }] });
            const res = await asUser(request(buildApp()).post('/api/vets')).send({ name: 'Otra' });
            expect(res.status).toBe(409);
        });

        it('rechaza sin auth con 401', async () => {
            const res = await request(buildApp()).post('/api/vets').send({ name: 'Vet' });
            expect(res.status).toBe(401);
        });

        it('rechaza sin nombre con 400', async () => {
            const res = await asUser(request(buildApp()).post('/api/vets')).send({ city: 'MVD' });
            expect(res.status).toBe(400);
        });
    });

    describe('GET /api/vets (directorio público)', () => {
        it('lista solo vets aprobadas', async () => {
            pool.query
                .mockResolvedValueOnce({ rows: [{ id: 1, name: 'Vet 1' }, { id: 2, name: 'Vet 2' }] })
                .mockResolvedValueOnce({ rows: [{ total: 2 }] });

            const res = await request(buildApp()).get('/api/vets');
            expect(res.status).toBe(200);
            expect(res.body.vets).toHaveLength(2);
            expect(res.body.total).toBe(2);
            expect(pool.query.mock.calls[0][0]).toMatch(/approved = TRUE/);
        });

        it('filtra por ciudad case-insensitive', async () => {
            pool.query
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [{ total: 0 }] });

            await request(buildApp()).get('/api/vets?city=Montevideo');
            expect(pool.query.mock.calls[0][1][0]).toBe('Montevideo');
            expect(pool.query.mock.calls[0][0]).toMatch(/LOWER\(city\)/);
        });
    });

    describe('GET /api/vets/nearby', () => {
        it('usa haversine para el radio y ordena por distancia', async () => {
            pool.query.mockResolvedValueOnce({ rows: [{ id: 1, distance_km: 2.3 }] });
            const res = await request(buildApp()).get('/api/vets/nearby?lat=-34.9&lng=-56.16&radius_km=10');
            expect(res.status).toBe(200);
            const sql = pool.query.mock.calls[0][0];
            expect(sql).toMatch(/6371 \* acos/);
            expect(sql).toMatch(/ORDER BY distance_km ASC/);
        });

        it('rechaza sin lat/lng con 400', async () => {
            const res = await request(buildApp()).get('/api/vets/nearby');
            expect(res.status).toBe(400);
        });
    });

    describe('GET /api/vets/:slug', () => {
        it('devuelve la vet si está aprobada', async () => {
            pool.query.mockResolvedValueOnce({ rows: [{ id: 3, slug: 'vet-foo', name: 'Foo' }] });
            const res = await request(buildApp()).get('/api/vets/vet-foo');
            expect(res.status).toBe(200);
            expect(res.body.slug).toBe('vet-foo');
        });

        it('404 si no existe o no está aprobada', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] });
            const res = await request(buildApp()).get('/api/vets/no-existe');
            expect(res.status).toBe(404);
        });
    });

    describe('GET /api/vets/me', () => {
        it('devuelve la vet del user autenticado (approved o no)', async () => {
            pool.query.mockResolvedValueOnce({ rows: [{ id: 7, approved: false }] });
            const res = await asUser(request(buildApp()).get('/api/vets/me'), 10);
            expect(res.status).toBe(200);
            expect(res.body.approved).toBe(false);
        });

        it('404 si el user no tiene vet', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] });
            const res = await asUser(request(buildApp()).get('/api/vets/me'));
            expect(res.status).toBe(404);
        });
    });

    describe('PATCH /api/vets/me', () => {
        it('actualiza campos parciales', async () => {
            pool.query
                .mockResolvedValueOnce({ rows: [{ id: 5, slug: 'vet-foo' }] })
                .mockResolvedValueOnce({ rows: [{ id: 5, slug: 'vet-foo', name: 'Nuevo Nombre' }] });

            const res = await asUser(request(buildApp()).patch('/api/vets/me')).send({ name: 'Nuevo Nombre' });
            expect(res.status).toBe(200);
            expect(res.body.name).toBe('Nuevo Nombre');
        });

        it('re-genera slug único si cambia', async () => {
            pool.query
                .mockResolvedValueOnce({ rows: [{ id: 5, slug: 'vet-foo' }] })
                .mockResolvedValueOnce({ rows: [] }) // nuevo slug libre
                .mockResolvedValueOnce({ rows: [{ id: 5, slug: 'vet-bar' }] });

            const res = await asUser(request(buildApp()).patch('/api/vets/me')).send({ slug: 'vet-bar' });
            expect(res.status).toBe(200);
            expect(res.body.slug).toBe('vet-bar');
        });
    });

    describe('DELETE /api/vets/me', () => {
        it('borra la vet del user', async () => {
            pool.query.mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 5 }] });
            const res = await asUser(request(buildApp()).delete('/api/vets/me'));
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });

        it('404 si el user no tiene vet', async () => {
            pool.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });
            const res = await asUser(request(buildApp()).delete('/api/vets/me'));
            expect(res.status).toBe(404);
        });
    });

    describe('GET /api/vets/me/dashboard', () => {
        it('devuelve vet + stats + últimos pets + últimas alertas', async () => {
            pool.query
                .mockResolvedValueOnce({
                    rows: [{
                        id: 5, name: 'Vet Amigo', slug: 'vet-amigo', plan: 'sponsor_pro',
                        verified_at: '2026-01-01', approved: true,
                        receives_lost: true, receives_found: true, alert_radius_km: 15,
                        logo_url: null,
                    }],
                }) // SELECT vet
                .mockResolvedValueOnce({
                    rows: [{ total_pets: '3', resolved_pets: '1', total_alerts: '10', unread_alerts: '2' }],
                }) // stats
                .mockResolvedValueOnce({ rows: [{ id: 100 }, { id: 101 }] }) // recent_pets
                .mockResolvedValueOnce({ rows: [{ id: 200, type: 'nearby_vet_lost' }] }); // recent_alerts

            const res = await asUser(request(buildApp()).get('/api/vets/me/dashboard'));
            expect(res.status).toBe(200);
            expect(res.body.vet.name).toBe('Vet Amigo');
            expect(res.body.vet.is_sponsor).toBe(true);
            expect(res.body.stats).toEqual({
                total_pets: 3, resolved_pets: 1, total_alerts: 10, unread_alerts: 2,
            });
            expect(res.body.recent_pets).toHaveLength(2);
            expect(res.body.recent_alerts).toHaveLength(1);
        });

        it('is_sponsor=false para ally (verified_at null)', async () => {
            pool.query
                .mockResolvedValueOnce({
                    rows: [{
                        id: 5, name: 'Vet Ally', slug: 'x', plan: 'ally',
                        verified_at: null, approved: true,
                        receives_lost: false, receives_found: false, alert_radius_km: 5,
                        logo_url: null,
                    }],
                })
                .mockResolvedValueOnce({ rows: [{ total_pets: '0', resolved_pets: '0', total_alerts: '0', unread_alerts: '0' }] })
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [] });

            const res = await asUser(request(buildApp()).get('/api/vets/me/dashboard'));
            expect(res.status).toBe(200);
            expect(res.body.vet.is_sponsor).toBe(false);
        });

        it('404 si el user no tiene vet', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] });
            const res = await asUser(request(buildApp()).get('/api/vets/me/dashboard'));
            expect(res.status).toBe(404);
        });

        it('401 sin auth', async () => {
            const res = await request(buildApp()).get('/api/vets/me/dashboard');
            expect(res.status).toBe(401);
        });
    });

    describe('PATCH /api/vets/me/alerts', () => {
        it('actualiza receives_lost/receives_found + radio ally hasta 5km', async () => {
            pool.query
                .mockResolvedValueOnce({ rows: [{ id: 5, plan: 'ally' }] })
                .mockResolvedValueOnce({ rows: [{ id: 5, receives_lost: true, receives_found: false, alert_radius_km: 5, plan: 'ally' }] });

            const res = await asUser(request(buildApp()).patch('/api/vets/me/alerts')).send({
                receives_lost: true, receives_found: false, alert_radius_km: 5,
            });
            expect(res.status).toBe(200);
            expect(res.body.receives_lost).toBe(true);
            expect(res.body.alert_radius_km).toBe(5);
        });

        it('ally no puede setear radio > 5km (403)', async () => {
            pool.query.mockResolvedValueOnce({ rows: [{ id: 5, plan: 'ally' }] });
            const res = await asUser(request(buildApp()).patch('/api/vets/me/alerts')).send({ alert_radius_km: 15 });
            expect(res.status).toBe(403);
        });

        it('sponsor puede setear radio hasta 50km', async () => {
            pool.query
                .mockResolvedValueOnce({ rows: [{ id: 5, plan: 'sponsor_pro' }] })
                .mockResolvedValueOnce({ rows: [{ id: 5, alert_radius_km: 50, plan: 'sponsor_pro' }] });

            const res = await asUser(request(buildApp()).patch('/api/vets/me/alerts')).send({ alert_radius_km: 50 });
            expect(res.status).toBe(200);
            expect(res.body.alert_radius_km).toBe(50);
        });

        it('404 si el user no tiene vet', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] });
            const res = await asUser(request(buildApp()).patch('/api/vets/me/alerts')).send({ receives_lost: true });
            expect(res.status).toBe(404);
        });

        it('rechaza body vacío (400)', async () => {
            const res = await asUser(request(buildApp()).patch('/api/vets/me/alerts')).send({});
            expect(res.status).toBe(400);
        });
    });

    describe('Admin endpoints', () => {
        it('GET /admin/pending — lista solo pending para admin', async () => {
            mockAdminRole();
            pool.query.mockResolvedValueOnce({ rows: [{ id: 1, approved: false }] });
            const res = await asAdmin(request(buildApp()).get('/api/vets/admin/pending'));
            expect(res.status).toBe(200);
            expect(res.body.vets).toHaveLength(1);
        });

        it('GET /admin/pending — 403 para user no-admin', async () => {
            mockNonAdminRole();
            const res = await asUser(request(buildApp()).get('/api/vets/admin/pending'));
            expect(res.status).toBe(403);
        });

        it('PATCH /admin/:id/approve — setea approved + timestamp', async () => {
            mockAdminRole();
            pool.query.mockResolvedValueOnce({
                rows: [{ id: 5, slug: 'x', name: 'X', approved: true, approved_at: new Date() }],
            });
            const res = await asAdmin(request(buildApp()).patch('/api/vets/admin/5/approve')).send({ approved: true });
            expect(res.status).toBe(200);
            expect(res.body.approved).toBe(true);
            const sql = pool.query.mock.calls[1][0];
            expect(sql).toMatch(/approved = \$1/);
            expect(sql).toMatch(/approved_at/);
        });

        it('PATCH /admin/:id/approve — 403 para non-admin', async () => {
            mockNonAdminRole();
            const res = await asUser(request(buildApp()).patch('/api/vets/admin/5/approve')).send({ approved: true });
            expect(res.status).toBe(403);
        });
    });
});
