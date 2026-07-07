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

    describe('DELETE /api/auth/me (deleteAccount)', () => {
        it('requiere auth', async () => {
            const res = await request(buildApp()).delete('/api/auth/me').send({});
            expect(res.status).toBe(401);
        });

        it('cuenta con password local: 400 si no viene password', async () => {
            const hash = await bcrypt.hash('mypass', 10);
            pool.query.mockResolvedValueOnce({ rows: [{ password: hash }] });
            const res = await request(buildApp())
                .delete('/api/auth/me')
                .set('x-test-user', '7')
                .send({});
            expect(res.status).toBe(400);
            expect(res.body.error).toMatch(/contrase/i);
        });

        it('cuenta con password local: 401 si password no coincide', async () => {
            const hash = await bcrypt.hash('correct-pass', 10);
            pool.query.mockResolvedValueOnce({ rows: [{ password: hash }] });
            const res = await request(buildApp())
                .delete('/api/auth/me')
                .set('x-test-user', '7')
                .send({ password: 'wrong' });
            expect(res.status).toBe(401);
            expect(res.body.error).toMatch(/incorrecta/i);
        });

        it('cuenta con password local: borra si el password coincide', async () => {
            const hash = await bcrypt.hash('mypass', 10);
            pool.query
                .mockResolvedValueOnce({ rows: [{ password: hash }] })     // SELECT password
                .mockResolvedValueOnce({ rowCount: 3 })                    // DELETE messages
                .mockResolvedValueOnce({ rowCount: 1 })                    // DELETE pets
                .mockResolvedValueOnce({ rows: [{ id: 7 }] });             // DELETE user
            const res = await request(buildApp())
                .delete('/api/auth/me')
                .set('x-test-user', '7')
                .send({ password: 'mypass' });
            expect(res.status).toBe(200);
        });

        it('cuenta OAuth (sin password): borra directamente sin pedir password', async () => {
            pool.query
                .mockResolvedValueOnce({ rows: [{ password: null }] })     // OAuth-only
                .mockResolvedValueOnce({ rowCount: 0 })
                .mockResolvedValueOnce({ rowCount: 0 })
                .mockResolvedValueOnce({ rows: [{ id: 7 }] });
            const res = await request(buildApp())
                .delete('/api/auth/me')
                .set('x-test-user', '7')
                .send({});
            expect(res.status).toBe(200);
        });

        it('404 si el user no existe', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] });
            const res = await request(buildApp())
                .delete('/api/auth/me')
                .set('x-test-user', '999')
                .send({ password: 'x' });
            expect(res.status).toBe(404);
        });
    });
});
