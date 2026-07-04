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
const { default: notificationsRoutes } = await import('../routes/notificationsRoutes.js');

const buildApp = () => {
    const app = express();
    app.use(express.json());
    app.use('/api/notifications', notificationsRoutes);
    return app;
};

describe('Notifications', () => {
    beforeEach(() => {
        pool.query.mockReset();
    });

    describe('GET /api/notifications', () => {
        it('requiere auth', async () => {
            const res = await request(buildApp()).get('/api/notifications');
            expect(res.status).toBe(401);
        });

        it('devuelve las notificaciones del usuario (más recientes primero)', async () => {
            pool.query.mockResolvedValueOnce({
                rows: [
                    { id: 2, type: 'match', data: { pet_id: 5 }, read_at: null, created_at: '2026-07-04T12:00:00Z' },
                    { id: 1, type: 'match', data: { pet_id: 3 }, read_at: '2026-07-03T10:00:00Z', created_at: '2026-07-03T09:00:00Z' },
                ],
            });
            const res = await request(buildApp()).get('/api/notifications').set('x-test-user', '7');
            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(2);
            expect(res.body[0].id).toBe(2);

            // La query debe filtrar por user_id
            const [sql, params] = pool.query.mock.calls[0];
            expect(sql).toMatch(/user_id\s*=\s*\$1/i);
            expect(params).toEqual([7]);
        });

        it('devuelve lista vacía si el user no tiene notificaciones', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] });
            const res = await request(buildApp()).get('/api/notifications').set('x-test-user', '7');
            expect(res.status).toBe(200);
            expect(res.body).toEqual([]);
        });

        it('500 si la DB falla', async () => {
            pool.query.mockRejectedValueOnce(new Error('db down'));
            const res = await request(buildApp()).get('/api/notifications').set('x-test-user', '7');
            expect(res.status).toBe(500);
        });
    });

    describe('PATCH /api/notifications/:id/read', () => {
        it('requiere auth', async () => {
            const res = await request(buildApp()).patch('/api/notifications/1/read');
            expect(res.status).toBe(401);
        });

        it('marca la notificación como leída (rowCount 1)', async () => {
            pool.query.mockResolvedValueOnce({ rowCount: 1 });
            const res = await request(buildApp())
                .patch('/api/notifications/42/read')
                .set('x-test-user', '7');
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.updated).toBe(1);

            // El WHERE debe combinar id + user_id (no permite marcar la de otro user)
            const [sql, params] = pool.query.mock.calls[0];
            expect(sql).toMatch(/read_at\s*=\s*NOW\(\)/i);
            expect(sql).toMatch(/user_id\s*=\s*\$2/i);
            expect(params).toEqual(['42', 7]);
        });

        it('rowCount 0 si la notificación no era del user o ya estaba leída (no falla)', async () => {
            pool.query.mockResolvedValueOnce({ rowCount: 0 });
            const res = await request(buildApp())
                .patch('/api/notifications/999/read')
                .set('x-test-user', '7');
            expect(res.status).toBe(200);
            expect(res.body.updated).toBe(0);
        });

        it('500 si la DB falla', async () => {
            pool.query.mockRejectedValueOnce(new Error('db down'));
            const res = await request(buildApp())
                .patch('/api/notifications/1/read')
                .set('x-test-user', '7');
            expect(res.status).toBe(500);
        });
    });
});
