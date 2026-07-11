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

const { default: pool } = await import('../db.js');
const { default: waitlistRoutes } = await import('../routes/waitlistRoutes.js');

const buildApp = () => {
    const app = express();
    app.use(express.json());
    app.use('/api/waitlist', waitlistRoutes);
    return app;
};

describe('Waitlist', () => {
    beforeEach(() => {
        pool.query.mockReset();
    });

    describe('POST /api/waitlist', () => {
        it('registra un nuevo email', async () => {
            pool.query.mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 42 }] });
            const res = await request(buildApp())
                .post('/api/waitlist')
                .send({ name: 'Nico', email: 'nico@test.com', city: 'Montevideo' });
            expect(res.status).toBe(201);
            expect(res.body).toEqual({ success: true, alreadyRegistered: false });
            expect(pool.query).toHaveBeenCalledOnce();
        });

        it('idempotente: email duplicado devuelve success con flag', async () => {
            pool.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });
            const res = await request(buildApp())
                .post('/api/waitlist')
                .send({ name: 'Nico', email: 'dup@test.com' });
            expect(res.status).toBe(201);
            expect(res.body).toEqual({ success: true, alreadyRegistered: true });
        });

        it('rechaza email inválido con 400', async () => {
            const res = await request(buildApp())
                .post('/api/waitlist')
                .send({ name: 'Nico', email: 'no-es-email' });
            expect(res.status).toBe(400);
            expect(pool.query).not.toHaveBeenCalled();
        });

        it('rechaza nombre vacío con 400', async () => {
            const res = await request(buildApp())
                .post('/api/waitlist')
                .send({ email: 'x@x.com' });
            expect(res.status).toBe(400);
            expect(pool.query).not.toHaveBeenCalled();
        });

        it('normaliza email a lowercase', async () => {
            pool.query.mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 1 }] });
            await request(buildApp())
                .post('/api/waitlist')
                .send({ name: 'Ana', email: 'ANA@Test.COM', city: 'Salto' });
            expect(pool.query.mock.calls[0][1][1]).toBe('ana@test.com');
        });
    });

    describe('GET /api/waitlist/count', () => {
        it('devuelve el count como número', async () => {
            pool.query.mockResolvedValueOnce({ rows: [{ count: '123' }] });
            const res = await request(buildApp()).get('/api/waitlist/count');
            expect(res.status).toBe(200);
            expect(res.body).toEqual({ count: 123 });
        });

        it('devuelve 500 si la DB falla', async () => {
            pool.query.mockRejectedValueOnce(new Error('boom'));
            const res = await request(buildApp()).get('/api/waitlist/count');
            expect(res.status).toBe(500);
        });
    });
});
