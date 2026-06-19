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
});
