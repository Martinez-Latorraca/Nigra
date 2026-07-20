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

const { default: pool } = await import('../db.js');
const { default: usersRoutes } = await import('../routes/usersRoutes.js');

const buildApp = () => {
    const app = express();
    app.use(express.json());
    app.use('/api/users', usersRoutes);
    return app;
};

describe('Users', () => {
    beforeEach(() => {
        pool.query.mockReset();
    });

    it('POST /api/users/push-token guarda el token', async () => {
        pool.query.mockResolvedValueOnce({ rowCount: 1 });
        const res = await request(buildApp())
            .post('/api/users/push-token')
            .set('x-test-user', '7')
            .send({ token: 'ExponentPushToken[abc]' });
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(pool.query).toHaveBeenCalledWith(
            expect.stringMatching(/UPDATE users SET push_token/i),
            ['ExponentPushToken[abc]', 7]
        );
    });

    it('POST /api/users/push-token sin token → 400', async () => {
        const res = await request(buildApp())
            .post('/api/users/push-token')
            .set('x-test-user', '7')
            .send({});
        expect(res.status).toBe(400);
    });

    it('POST /api/users/push-token requiere auth', async () => {
        const res = await request(buildApp())
            .post('/api/users/push-token')
            .send({ token: 'x' });
        expect(res.status).toBe(401);
    });

    describe('GET /api/users/me', () => {
        it('requiere auth', async () => {
            const res = await request(buildApp()).get('/api/users/me');
            expect(res.status).toBe(401);
        });

        it('devuelve el perfil (incluye notify_* y radio)', async () => {
            pool.query.mockResolvedValueOnce({
                rows: [{
                    id: 7, name: 'Ana', email: 'a@a.com', role: 'user', avatar_url: null,
                    notify_nearby: true, notify_lost: true, notify_found: false, notify_radius_km: 15,
                }],
            });
            const res = await request(buildApp()).get('/api/users/me').set('x-test-user', '7');
            expect(res.status).toBe(200);
            expect(res.body.notify_nearby).toBe(true);
            expect(res.body.notify_lost).toBe(true);
            expect(res.body.notify_found).toBe(false);
            expect(res.body.notify_radius_km).toBe(15);
        });

        it('404 si el user no existe', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] });
            const res = await request(buildApp()).get('/api/users/me').set('x-test-user', '999');
            expect(res.status).toBe(404);
        });
    });

    describe('PATCH /api/users/location', () => {
        it('requiere auth', async () => {
            const res = await request(buildApp())
                .patch('/api/users/location')
                .send({ lat: -34.9, lng: -56.16 });
            expect(res.status).toBe(401);
        });

        it('400 si lat/lng inválidos (schema)', async () => {
            const res = await request(buildApp())
                .patch('/api/users/location')
                .set('x-test-user', '7')
                .send({ lat: 500, lng: -56.16 });
            expect(res.status).toBe(400);
        });

        it('guarda lat/lng + last_location_at', async () => {
            pool.query.mockResolvedValueOnce({ rowCount: 1 });
            const res = await request(buildApp())
                .patch('/api/users/location')
                .set('x-test-user', '7')
                .send({ lat: -34.9, lng: -56.16 });
            expect(res.status).toBe(200);
            const [sql, params] = pool.query.mock.calls[0];
            expect(sql).toMatch(/last_lat = \$1/);
            expect(sql).toMatch(/last_location_at = NOW\(\)/);
            expect(params).toEqual([-34.9, -56.16, 7]);
        });
    });

    describe('PATCH /api/users/notify-nearby', () => {
        it('requiere auth', async () => {
            const res = await request(buildApp())
                .patch('/api/users/notify-nearby')
                .send({ enabled: true });
            expect(res.status).toBe(401);
        });

        it('400 si enabled no es boolean (schema)', async () => {
            const res = await request(buildApp())
                .patch('/api/users/notify-nearby')
                .set('x-test-user', '7')
                .send({ enabled: 'yes' });
            expect(res.status).toBe(400);
        });

        it('actualiza el toggle (forma legacy enabled) y devuelve el estado', async () => {
            pool.query.mockResolvedValueOnce({
                rows: [{ notify_nearby: true, notify_lost: true, notify_found: true, notify_radius_km: 5 }],
            });
            const res = await request(buildApp())
                .patch('/api/users/notify-nearby')
                .set('x-test-user', '7')
                .send({ enabled: true });
            expect(res.status).toBe(200);
            expect(res.body.notify_nearby).toBe(true);
            expect(res.body.notify_lost).toBe(true);
            expect(res.body.notify_found).toBe(true);
        });

        it('acepta la forma granular con radio', async () => {
            pool.query.mockResolvedValueOnce({
                rows: [{ notify_nearby: true, notify_lost: true, notify_found: false, notify_radius_km: 15 }],
            });
            const res = await request(buildApp())
                .patch('/api/users/notify-nearby')
                .set('x-test-user', '7')
                .send({ notify_lost: true, notify_found: false, notify_radius_km: 15 });
            expect(res.status).toBe(200);
            expect(res.body.notify_radius_km).toBe(15);
        });
    });

    describe('PATCH /api/users/me', () => {
        it('requiere auth', async () => {
            const res = await request(buildApp())
                .patch('/api/users/me')
                .send({ name: 'Nuevo' });
            expect(res.status).toBe(401);
        });

        it('400 si name es vacio (schema)', async () => {
            const res = await request(buildApp())
                .patch('/api/users/me')
                .set('x-test-user', '7')
                .send({ name: '   ' });
            expect(res.status).toBe(400);
        });

        it('actualiza el nombre y devuelve el perfil publico', async () => {
            pool.query.mockResolvedValueOnce({
                rows: [{ id: 7, name: 'Nuevo Nombre', email: 'a@a.com', role: 'user', avatar_url: null }],
            });
            const res = await request(buildApp())
                .patch('/api/users/me')
                .set('x-test-user', '7')
                .send({ name: '  Nuevo Nombre  ' });
            expect(res.status).toBe(200);
            expect(res.body.name).toBe('Nuevo Nombre');
            const [sql, params] = pool.query.mock.calls[0];
            expect(sql).toMatch(/UPDATE users SET name = \$1/);
            expect(params[0]).toBe('Nuevo Nombre');
        });
    });

});
