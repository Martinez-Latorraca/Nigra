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
const { default: messageRoutes } = await import('../routes/messagesRoutes.js');

const buildApp = () => {
    const app = express();
    app.use(express.json());
    app.use('/api/messages', messageRoutes);
    return app;
};

describe('Messages', () => {
    beforeEach(() => {
        pool.query.mockReset();
    });

    describe('GET /api/messages/inbox', () => {
        it('requiere auth', async () => {
            const res = await request(buildApp()).get('/api/messages/inbox');
            expect(res.status).toBe(401);
        });

        it('devuelve los chats del usuario', async () => {
            pool.query.mockResolvedValueOnce({
                rows: [
                    {
                        pet_id: 1,
                        content: 'hola',
                        sender_id: 2,
                        receiver_id: 7,
                        is_read: false,
                        created_at: new Date().toISOString(),
                        photo_url: 'p',
                        description: 'd',
                        reporter_id: 7,
                        sender_name: 'X',
                        receiver_name: 'Yo',
                        other_user_id: 2,
                        other_user_name: 'X',
                    },
                ],
            });
            const res = await request(buildApp()).get('/api/messages/inbox').set('x-test-user', '7');
            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(1);
            expect(res.body[0].other_user_id).toBe(2);
        });
    });

    describe('GET /api/messages/:pet_id/:otherUserId', () => {
        it('devuelve historial reverseado a orden cronológico + meta de paginación', async () => {
            pool.query
                .mockResolvedValueOnce({ rows: [{ count: '3' }] })
                .mockResolvedValueOnce({
                    rows: [
                        { id: 3, content: 'C', sender_id: 7, receiver_id: 2, pet_id: 1, created_at: new Date().toISOString() },
                        { id: 2, content: 'B', sender_id: 2, receiver_id: 7, pet_id: 1, created_at: new Date().toISOString() },
                        { id: 1, content: 'A', sender_id: 7, receiver_id: 2, pet_id: 1, created_at: new Date().toISOString() },
                    ],
                });
            const res = await request(buildApp()).get('/api/messages/1/2').set('x-test-user', '7');
            expect(res.status).toBe(200);
            expect(res.body.messages[0].content).toBe('A');
            expect(res.body.messages[2].content).toBe('C');
            expect(res.body.total).toBe(3);
            expect(res.body.totalPages).toBe(1);
        });
    });

    describe('PUT /api/messages/read', () => {
        it('marca como leídos', async () => {
            pool.query.mockResolvedValueOnce({ rowCount: 2 });
            const res = await request(buildApp())
                .put('/api/messages/read')
                .set('x-test-user', '7')
                .send({ pet_id: 1, other_user_id: 2 });
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });

        it('400 si falta pet_id u other_user_id (schema)', async () => {
            const res = await request(buildApp())
                .put('/api/messages/read')
                .set('x-test-user', '7')
                .send({ pet_id: 1 });
            expect(res.status).toBe(400);
        });
    });

    describe('POST /api/messages/messages', () => {
        it('envía un mensaje', async () => {
            pool.query.mockResolvedValueOnce({
                rows: [{ id: 99, content: 'hi', sender_id: 7, receiver_id: 2, pet_id: 1 }],
            });
            const res = await request(buildApp())
                .post('/api/messages/messages')
                .set('x-test-user', '7')
                .send({ receiver_id: 2, pet_id: 1, content: 'hi' });
            expect(res.status).toBe(200);
            expect(res.body.data.id).toBe(99);
        });

        it('rechaza enviarse un mensaje a sí mismo', async () => {
            const res = await request(buildApp())
                .post('/api/messages/messages')
                .set('x-test-user', '7')
                .send({ receiver_id: 7, pet_id: 1, content: 'self' });
            expect(res.status).toBe(400);
        });
    });
});
