import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

vi.mock('../db.js', () => ({ default: { query: vi.fn() } }));
// Mailer: mockeamos el envío para no depender de red/SMTP.
vi.mock('../lib/mailer.js', () => ({
    sendResetEmail: vi.fn(() => Promise.resolve({ skipped: true })),
}));
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
    linkGoogle: (req, res) => res.json({ stub: true }),
    linkApple: (req, res) => res.json({ stub: true }),
    linkFacebook: (req, res) => res.json({ stub: true }),
    listOAuthLinks: (req, res) => res.json({ stub: true }),
    unlinkOAuthProvider: (req, res) => res.json({ stub: true }),
}));

const { default: pool } = await import('../db.js');
const { default: authRoutes } = await import('../routes/authRoutes.js');
const { sendResetEmail } = await import('../lib/mailer.js');

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

    describe('POST /api/auth/forgot-password', () => {
        beforeEach(() => {
            sendResetEmail.mockClear();
        });

        it('400 si el email es inválido (schema)', async () => {
            const res = await request(buildApp())
                .post('/api/auth/forgot-password')
                .send({ email: 'not-an-email' });
            expect(res.status).toBe(400);
        });

        it('user no existe: devuelve 200 sin mandar mail (no leakea existencia)', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] });
            const res = await request(buildApp())
                .post('/api/auth/forgot-password')
                .send({ email: 'nobody@x.com' });
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(sendResetEmail).not.toHaveBeenCalled();
        });

        it('user OAuth-only (sin password): devuelve 200 sin mandar mail', async () => {
            pool.query.mockResolvedValueOnce({ rows: [{ id: 7, name: 'Ana', password: null }] });
            const res = await request(buildApp())
                .post('/api/auth/forgot-password')
                .send({ email: 'ana@x.com' });
            expect(res.status).toBe(200);
            expect(sendResetEmail).not.toHaveBeenCalled();
        });

        it('user con password local: inserta token + manda mail', async () => {
            pool.query
                .mockResolvedValueOnce({ rows: [{ id: 7, name: 'Ana', password: 'hash' }] })  // SELECT user
                .mockResolvedValueOnce({ rows: [] });                                          // INSERT reset
            const res = await request(buildApp())
                .post('/api/auth/forgot-password')
                .send({ email: 'ana@x.com' });
            expect(res.status).toBe(200);

            // Insert con user_id + tokenHash (SHA-256 hex de 64 chars) + expires futuro
            const [sql, params] = pool.query.mock.calls[1];
            expect(sql).toMatch(/INSERT INTO password_resets/i);
            expect(params[0]).toBe(7);
            expect(params[1]).toMatch(/^[0-9a-f]{64}$/);
            expect(new Date(params[2]).getTime()).toBeGreaterThan(Date.now());

            // Mail disparado con el TOKEN CRUDO (no el hash) — se resuelve
            // fire-and-forget, esperamos un microtask.
            await new Promise((r) => setImmediate(r));
            expect(sendResetEmail).toHaveBeenCalledWith(expect.objectContaining({
                to: 'ana@x.com',
                name: 'Ana',
                token: expect.stringMatching(/^[0-9a-f]{64}$/),
            }));
            // El token que va al mail NO es el hash guardado en DB
            const insertedHash = params[1];
            const emailedToken = sendResetEmail.mock.calls[0][0].token;
            expect(emailedToken).not.toBe(insertedHash);
        });
    });

    describe('POST /api/auth/reset-password', () => {
        const validToken = 'a'.repeat(64);

        it('400 si el token no matchea el formato (schema)', async () => {
            const res = await request(buildApp())
                .post('/api/auth/reset-password')
                .send({ token: 'nope', password: 'newpass1' });
            expect(res.status).toBe(400);
        });

        it('400 si el password es muy corto (schema)', async () => {
            const res = await request(buildApp())
                .post('/api/auth/reset-password')
                .send({ token: validToken, password: 'ab' });
            expect(res.status).toBe(400);
        });

        it('400 si el token no existe, expiró o ya se usó', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] });
            const res = await request(buildApp())
                .post('/api/auth/reset-password')
                .send({ token: validToken, password: 'nueva-pass' });
            expect(res.status).toBe(400);
            expect(res.body.error).toMatch(/expir|v[aá]lid/i);
        });

        it('happy path: actualiza password + marca token used + invalida otros pendientes', async () => {
            pool.query
                .mockResolvedValueOnce({ rows: [{ id: 42, user_id: 7 }] })       // SELECT reset
                .mockResolvedValueOnce({ rowCount: 1 })                          // UPDATE users
                .mockResolvedValueOnce({ rowCount: 1 })                          // UPDATE reset used
                .mockResolvedValueOnce({ rowCount: 0 });                         // UPDATE otros pendientes
            const res = await request(buildApp())
                .post('/api/auth/reset-password')
                .send({ token: validToken, password: 'nueva-pass' });
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);

            // El SELECT busca por token_hash (sha256 hex), no por el token crudo
            const [selectSql, selectParams] = pool.query.mock.calls[0];
            expect(selectSql).toMatch(/token_hash/);
            const expectedHash = crypto.createHash('sha256').update(validToken).digest('hex');
            expect(selectParams[0]).toBe(expectedHash);

            // El password guardado es un hash bcrypt, no el password crudo
            const [updateSql, updateParams] = pool.query.mock.calls[1];
            expect(updateSql).toMatch(/UPDATE users SET password/i);
            expect(updateParams[0]).not.toBe('nueva-pass');
            const isValid = await bcrypt.compare('nueva-pass', updateParams[0]);
            expect(isValid).toBe(true);
        });
    });
});
