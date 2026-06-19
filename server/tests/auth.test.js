import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import bcrypt from 'bcrypt';

vi.mock('../db.js', () => ({ default: { query: vi.fn() } }));
vi.mock('../middlewares/rateLimiter.js', () => ({
    authLimiter: (req, res, next) => next(),
    searchLimiter: (req, res, next) => next(),
    reportLimiter: (req, res, next) => next(),
    globalLimiter: (req, res, next) => next(),
}));
// OAuth controllers tienen dependencias externas (google-auth-library, jwks-rsa)
// que no nos interesa testear acá. Las mockeamos como no-ops.
vi.mock('../controllers/oauthController.js', () => ({
    loginWithGoogle: (req, res) => res.json({ stub: true }),
    loginWithApple: (req, res) => res.json({ stub: true }),
    loginWithFacebook: (req, res) => res.json({ stub: true }),
}));

const { default: pool } = await import('../db.js');
const { default: authRoutes } = await import('../routes/authRoutes.js');

const buildApp = () => {
    const app = express();
    app.use(express.json());
    app.use('/api/auth', authRoutes);
    return app;
};

describe('Auth', () => {
    beforeEach(() => {
        pool.query.mockReset();
    });

    describe('POST /api/auth/register', () => {
        it('registra un usuario nuevo', async () => {
            pool.query
                .mockResolvedValueOnce({ rows: [] }) // check email no existe
                .mockResolvedValueOnce({ rows: [{ id: 1, name: 'Test', email: 't@t.com', role: 'user' }] });
            const res = await request(buildApp())
                .post('/api/auth/register')
                .send({ name: 'Test', email: 't@t.com', password: 'password123' });
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.user.email).toBe('t@t.com');
        });

        it('rechaza email duplicado con 400', async () => {
            pool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
            const res = await request(buildApp())
                .post('/api/auth/register')
                .send({ name: 'Test', email: 'used@t.com', password: 'password123' });
            expect(res.status).toBe(400);
            expect(res.body.error).toMatch(/ya est[áa] registrado/i);
        });
    });

    describe('POST /api/auth/login', () => {
        it('login con credenciales válidas devuelve token + user', async () => {
            const hash = await bcrypt.hash('password123', 10);
            pool.query.mockResolvedValueOnce({
                rows: [{ id: 1, name: 'Test', email: 't@t.com', role: 'user', password: hash }],
            });
            const res = await request(buildApp())
                .post('/api/auth/login')
                .send({ email: 't@t.com', password: 'password123' });
            expect(res.status).toBe(200);
            expect(typeof res.body.token).toBe('string');
            expect(res.body.user.email).toBe('t@t.com');
            // El password NUNCA debe volver al cliente
            expect(res.body.user.password).toBeUndefined();
        });

        it('email inexistente devuelve 401', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] });
            const res = await request(buildApp())
                .post('/api/auth/login')
                .send({ email: 'nope@t.com', password: 'whatever1' });
            expect(res.status).toBe(401);
        });

        it('password incorrecto devuelve 401', async () => {
            const hash = await bcrypt.hash('correct1', 10);
            pool.query.mockResolvedValueOnce({ rows: [{ id: 1, password: hash }] });
            const res = await request(buildApp())
                .post('/api/auth/login')
                .send({ email: 't@t.com', password: 'wrong-pass1' });
            expect(res.status).toBe(401);
        });
    });
});
