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
        it('crea una vet nueva para el user autenticado con email del user como fallback', async () => {
            pool.query
                .mockResolvedValueOnce({ rows: [] }) // no tiene vet
                .mockResolvedValueOnce({ rows: [{ email: 'contacto@vetamigo.com' }] }) // user email fallback
                .mockResolvedValueOnce({ rows: [] }) // slug único
                .mockResolvedValueOnce({ rows: [{ id: 5, slug: 'vet-amigo', name: 'Vet Amigo', email: 'contacto@vetamigo.com', approved: false }] });

            const res = await asUser(
                request(buildApp()).post('/api/vets'),
                10
            ).send({ name: 'Vet Amigo', city: 'Montevideo' });

            expect(res.status).toBe(201);
            expect(res.body.slug).toBe('vet-amigo');
            expect(res.body.approved).toBe(false);
            // Verifica que la INSERT usó el email del user (posición 4 = $4).
            expect(pool.query.mock.calls[3][1][3]).toBe('contacto@vetamigo.com');
        });

        it('usa email del body si viene explícito (override del fallback)', async () => {
            pool.query
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [{ id: 6, email: 'atencion@vetamigo.com' }] });

            const res = await asUser(request(buildApp()).post('/api/vets')).send({
                name: 'Vet Amigo',
                email: 'atencion@vetamigo.com',
            });
            expect(res.status).toBe(201);
            // No consulta el email del user cuando body ya trae uno.
            expect(pool.query.mock.calls[1][0]).toMatch(/SELECT 1 FROM vets WHERE slug/);
            expect(pool.query.mock.calls[2][1][3]).toBe('atencion@vetamigo.com');
        });

        it('genera slug único agregando -2 si colisiona', async () => {
            pool.query
                .mockResolvedValueOnce({ rows: [] }) // no tiene vet
                .mockResolvedValueOnce({ rows: [{}] }) // slug colisiona
                .mockResolvedValueOnce({ rows: [] }) // -2 libre
                .mockResolvedValueOnce({ rows: [{ id: 6, slug: 'vet-amigo-2' }] });

            const res = await asUser(request(buildApp()).post('/api/vets')).send({
                name: 'Vet Amigo',
                email: 'x@y.com',
            });
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

        it('filtra por servicios (array overlap OR)', async () => {
            pool.query
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [{ total: 0 }] });

            await request(buildApp()).get('/api/vets?services=Consultas,Cirug%C3%ADa');
            const [sql, params] = pool.query.mock.calls[0];
            expect(sql).toMatch(/services && \$\d+::text\[\]/);
            expect(params[0]).toEqual(['Consultas', 'Cirugía']);
        });

        it('filtra por geoloc (haversine) y ordena por distancia', async () => {
            pool.query
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [{ total: 0 }] });

            await request(buildApp()).get('/api/vets?lat=-34.9&lng=-56.16&radius_km=10');
            const [sql, params] = pool.query.mock.calls[0];
            expect(sql).toMatch(/6371 \* acos/);
            // Nation > Pro > Basic > Ally, después distancia.
            expect(sql).toMatch(/ORDER BY CASE plan[\s\S]*sponsor_nation[\s\S]*sponsor_pro[\s\S]*sponsor_basic[\s\S]*END DESC, \(6371 \* acos/);
            expect(params[0]).toBe(-34.9);
            expect(params[1]).toBe(-56.16);
            expect(params[2]).toBe(10);
        });

        it('sin geoloc: tier ranking primero, después verified_at + created_at', async () => {
            pool.query
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [{ total: 0 }] });

            await request(buildApp()).get('/api/vets');
            const sql = pool.query.mock.calls[0][0];
            expect(sql).toMatch(/ORDER BY CASE plan[\s\S]*sponsor_nation[\s\S]*END DESC, verified_at DESC/);
        });

        it('400 si viene lat sin lng (validation: and)', async () => {
            const res = await request(buildApp()).get('/api/vets?lat=-34.9');
            expect(res.status).toBe(400);
        });
    });

    describe('GET /api/vets/ads', () => {
        it('sin geoloc: mix ponderado con 3 queries paralelas (nation/pro/basic)', async () => {
            // 3 fetches en paralelo, cada uno filtra por plan y limita a
            // ceil(N*ratio). Todos devuelven vacio para simplificar.
            pool.query
                .mockResolvedValueOnce({ rows: [] }) // nation
                .mockResolvedValueOnce({ rows: [] }) // pro
                .mockResolvedValueOnce({ rows: [] }); // basic (0 rows → no llega al rebalanceo)
            await request(buildApp()).get('/api/vets/ads');
            // Verificamos las 3 queries: cada una es WHERE plan = $1 ORDER BY random()
            const call0 = pool.query.mock.calls[0];
            const call1 = pool.query.mock.calls[1];
            const call2 = pool.query.mock.calls[2];
            const plans = [call0[1][0], call1[1][0], call2[1][0]].sort();
            expect(plans).toEqual(['sponsor_basic', 'sponsor_nation', 'sponsor_pro']);
            // limit por tier ponderado: nation=4 (50%), pro=3 (30%), basic=1 (resto de 8)
            const limitsByPlan = Object.fromEntries(
                [call0, call1, call2].map((c) => [c[1][0], c[1][1]])
            );
            expect(limitsByPlan.sponsor_nation).toBe(4);
            expect(limitsByPlan.sponsor_pro).toBe(3);
            expect(limitsByPlan.sponsor_basic).toBe(1);
        });

        it('con lat/lng: filtra por radio del tier y ordena tier DESC + distancia', async () => {
            pool.query.mockResolvedValueOnce({ rows: [{ id: 1, distance_km: 2.5 }] });
            const res = await request(buildApp()).get('/api/vets/ads?lat=-34.9&lng=-56.16&limit=5');
            expect(res.status).toBe(200);
            const [sql, params] = pool.query.mock.calls[0];
            expect(sql).toMatch(/6371 \* acos/);
            // Cap por tier: nation 50, pro 20, basic 5.
            expect(sql).toMatch(/CASE plan[\s\S]*sponsor_nation'\s*THEN 50[\s\S]*sponsor_pro'\s*THEN 20[\s\S]*sponsor_basic'\s*THEN 5/);
            // Order: tier ranking DESC primero, después distancia.
            expect(sql).toMatch(/ORDER BY[\s\S]*CASE plan[\s\S]*END\s+DESC,\s*distance_km ASC/);
            expect(params).toEqual([-34.9, -56.16, 5]);
        });

        it('caps limit en 20 (protege de flood)', async () => {
            // Con limit=20: nation=10, pro=6, basic=4. Verificamos primer call.
            pool.query
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [] });
            await request(buildApp()).get('/api/vets/ads?limit=999');
            // Suman al cap 20 exactamente.
            const limits = pool.query.mock.calls.slice(0, 3).map((c) => c[1][1]);
            expect(limits.reduce((a, b) => a + b, 0)).toBe(20);
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
                .mockResolvedValueOnce({ rows: [{ id: 200, type: 'nearby_vet_lost' }] }) // recent_alerts
                .mockResolvedValueOnce({ rows: [] }); // ad_stats_30d

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

        it('ally puede setear radio hasta 50km (sin gate por plan)', async () => {
            // El radio de alertas es una pref de push, no un beneficio de
            // sponsor. Cualquier vet elige libremente 1-50.
            pool.query
                .mockResolvedValueOnce({ rows: [{ id: 5 }] })
                .mockResolvedValueOnce({ rows: [{ id: 5, alert_radius_km: 30, plan: 'ally' }] });
            const res = await asUser(request(buildApp()).patch('/api/vets/me/alerts')).send({ alert_radius_km: 30 });
            expect(res.status).toBe(200);
            expect(res.body.alert_radius_km).toBe(30);
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

        it('GET /admin/active — lista aprobadas ordenadas por tier DESC', async () => {
            mockAdminRole();
            pool.query.mockResolvedValueOnce({
                rows: [
                    { id: 1, name: 'Vet Pro', plan: 'sponsor_pro' },
                    { id: 2, name: 'Vet Ally', plan: 'ally' },
                ],
            });
            const res = await asAdmin(request(buildApp()).get('/api/vets/admin/active'));
            expect(res.status).toBe(200);
            expect(res.body.vets).toHaveLength(2);
            // La 1a query es requireAdmin (SELECT role), la 2a es la real.
            const sql = pool.query.mock.calls[1][0];
            expect(sql).toMatch(/v\.approved = TRUE/);
            expect(sql).toMatch(/sponsor_nation.*THEN 3/s);
        });

        it('PATCH /admin/:id/plan — cambia el plan y setea verified_at si sponsor', async () => {
            mockAdminRole();
            pool.query.mockResolvedValueOnce({
                rows: [{ id: 5, slug: 'v', name: 'V', plan: 'sponsor_pro', verified_at: '2026-07-21' }],
            });
            const res = await asAdmin(request(buildApp()).patch('/api/vets/admin/5/plan')).send({ plan: 'sponsor_pro' });
            expect(res.status).toBe(200);
            expect(res.body.plan).toBe('sponsor_pro');
            const [sql, params] = pool.query.mock.calls[1];
            expect(sql).toMatch(/SET plan = \$1/);
            expect(params).toEqual(['sponsor_pro', true, '5']);
        });

        it('PATCH /admin/:id/plan — 400 si plan inválido', async () => {
            mockAdminRole();
            const res = await asAdmin(request(buildApp()).patch('/api/vets/admin/5/plan')).send({ plan: 'premium_diamond' });
            expect(res.status).toBe(400);
            expect(res.body.error).toMatch(/plan inválido/i);
        });

        it('PATCH /admin/:id/plan — 403 para non-admin', async () => {
            mockNonAdminRole();
            const res = await asUser(request(buildApp()).patch('/api/vets/admin/5/plan')).send({ plan: 'sponsor_pro' });
            expect(res.status).toBe(403);
        });
    });

    describe('Analytics / tracking', () => {
        it('POST /:id/click inserta un ad_click y devuelve 204', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] });
            const res = await request(buildApp()).post('/api/vets/12/click');
            expect(res.status).toBe(204);
            const [sql, params] = pool.query.mock.calls[0];
            expect(sql).toMatch(/INSERT INTO vet_events/);
            expect(sql).toMatch(/'ad_click'/);
            expect(params).toEqual([12]);
        });

        it('POST /:id/contact-click inserta un contact_click y devuelve 204', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] });
            const res = await request(buildApp()).post('/api/vets/7/contact-click');
            expect(res.status).toBe(204);
            const [sql, params] = pool.query.mock.calls[0];
            expect(sql).toMatch(/'contact_click'/);
            expect(params).toEqual([7]);
        });

        it('POST /:id/click con id inválido devuelve 400', async () => {
            const res = await request(buildApp()).post('/api/vets/abc/click');
            expect(res.status).toBe(400);
            expect(pool.query).not.toHaveBeenCalled();
        });

        it('POST /:id/click 204 aún si el INSERT tira error (analytics no rompe UX)', async () => {
            pool.query.mockRejectedValueOnce(new Error('db down'));
            const res = await request(buildApp()).post('/api/vets/12/click');
            expect(res.status).toBe(204);
        });

        it('POST /events/impressions inserta batch con UNNEST', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] });
            const res = await request(buildApp())
                .post('/api/vets/events/impressions')
                .send({ vet_ids: [1, 2, 3] });
            expect(res.status).toBe(204);
            const [sql, params] = pool.query.mock.calls[0];
            expect(sql).toMatch(/UNNEST/);
            expect(sql).toMatch(/'impression'/);
            expect(params).toEqual([[1, 2, 3]]);
        });

        it('POST /events/impressions rechaza body sin vet_ids', async () => {
            const res = await request(buildApp())
                .post('/api/vets/events/impressions')
                .send({});
            expect(res.status).toBe(400);
        });

        it('POST /events/impressions cap 50 vet_ids', async () => {
            const many = Array.from({ length: 51 }, (_, i) => i + 1);
            const res = await request(buildApp())
                .post('/api/vets/events/impressions')
                .send({ vet_ids: many });
            expect(res.status).toBe(400);
        });

        it('GET /me/dashboard incluye ad_stats_30d agregado por kind', async () => {
            pool.query
                // 1) vet del owner
                .mockResolvedValueOnce({ rows: [{
                    id: 3, name: 'Vet X', slug: 'vet-x', plan: 'sponsor_pro',
                    verified_at: '2026-06-01', approved: true,
                    receives_lost: true, receives_found: false, alert_radius_km: 15,
                    logo_url: null,
                }] })
                // 2) stats de pets/alertas
                .mockResolvedValueOnce({ rows: [{
                    total_pets: '2', resolved_pets: '1',
                    total_alerts: '5', unread_alerts: '2',
                }] })
                // 3) recent pets
                .mockResolvedValueOnce({ rows: [] })
                // 4) recent alerts
                .mockResolvedValueOnce({ rows: [] })
                // 5) ad_stats_30d
                .mockResolvedValueOnce({ rows: [
                    { kind: 'impression', n: 1247 },
                    { kind: 'ad_click', n: 47 },
                    { kind: 'contact_click', n: 12 },
                ] });

            const res = await asUser(request(buildApp()).get('/api/vets/me/dashboard'));
            expect(res.status).toBe(200);
            expect(res.body.ad_stats_30d).toEqual({
                impressions: 1247, ad_clicks: 47, contact_clicks: 12,
            });
        });

        it('GET /me/dashboard con 0 eventos devuelve 0s (no rompe si nada trackeado)', async () => {
            pool.query
                .mockResolvedValueOnce({ rows: [{
                    id: 3, name: 'Vet Y', slug: 'vet-y', plan: 'ally',
                    verified_at: null, approved: true,
                    receives_lost: false, receives_found: false, alert_radius_km: 5,
                    logo_url: null,
                }] })
                .mockResolvedValueOnce({ rows: [{
                    total_pets: '0', resolved_pets: '0', total_alerts: '0', unread_alerts: '0',
                }] })
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [] });

            const res = await asUser(request(buildApp()).get('/api/vets/me/dashboard'));
            expect(res.status).toBe(200);
            expect(res.body.ad_stats_30d).toEqual({
                impressions: 0, ad_clicks: 0, contact_clicks: 0,
            });
        });
    });
});
