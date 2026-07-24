import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';

vi.mock('../db.js', () => ({ default: { query: vi.fn() } }));

const { default: pool } = await import('../db.js');
const { default: donationRoutes } = await import('../routes/donationRoutes.js');

const JWT_SECRET = process.env.JWT_SECRET;

const buildApp = () => {
    const app = express();
    app.use(express.json());
    app.use('/api/donations', donationRoutes);
    return app;
};

const tokenFor = (id, role = 'user') => jwt.sign({ id, role }, JWT_SECRET);

describe('Donations', () => {
    beforeEach(() => {
        pool.query.mockReset();
    });

    describe('POST /api/donations/click', () => {
        it('registra click con user_id cuando hay token', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] });
            const res = await request(buildApp())
                .post('/api/donations/click')
                .set('Authorization', `Bearer ${tokenFor(7)}`)
                .send({ pet_id: 42 });
            expect(res.status).toBe(204);
            const [sql, params] = pool.query.mock.calls[0];
            expect(sql).toMatch(/INSERT INTO donation_clicks/);
            expect(params).toEqual([42, 7]);
        });

        it('registra click anónimo (sin token) con user_id null', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] });
            const res = await request(buildApp())
                .post('/api/donations/click')
                .send({ pet_id: 42 });
            expect(res.status).toBe(204);
            expect(pool.query.mock.calls[0][1]).toEqual([42, null]);
        });

        it('acepta body sin pet_id (guarda null)', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] });
            const res = await request(buildApp())
                .post('/api/donations/click')
                .send({});
            expect(res.status).toBe(204);
            expect(pool.query.mock.calls[0][1]).toEqual([null, null]);
        });

        it('token inválido no rompe: registra como anónimo', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] });
            const res = await request(buildApp())
                .post('/api/donations/click')
                .set('Authorization', 'Bearer garbage')
                .send({ pet_id: 1 });
            expect(res.status).toBe(204);
            expect(pool.query.mock.calls[0][1]).toEqual([1, null]);
        });

        it('204 aún si el INSERT falla (analytics no rompe UX)', async () => {
            pool.query.mockRejectedValueOnce(new Error('db down'));
            const res = await request(buildApp())
                .post('/api/donations/click')
                .send({ pet_id: 1 });
            expect(res.status).toBe(204);
        });
    });

    describe('GET /api/donations/stats', () => {
        it('403 para non-admin', async () => {
            // requireAdmin consulta el rol en la DB.
            pool.query.mockResolvedValueOnce({ rows: [{ role: 'user' }] });
            const res = await request(buildApp())
                .get('/api/donations/stats')
                .set('Authorization', `Bearer ${tokenFor(7)}`);
            expect(res.status).toBe(403);
        });

        it('401 sin token', async () => {
            const res = await request(buildApp()).get('/api/donations/stats');
            expect(res.status).toBe(401);
        });

        it('devuelve totales + clicks 30d + top pets para admin', async () => {
            pool.query
                .mockResolvedValueOnce({ rows: [{ role: 'admin' }] }) // requireAdmin
                .mockResolvedValueOnce({ rows: [{ total: 120 }] })    // totals
                .mockResolvedValueOnce({ rows: [{ n: 34 }] })         // last30
                .mockResolvedValueOnce({ rows: [{ pet_id: 5, clicks: 9, pet_name: 'Rocky', photo_url: 'x' }] }); // topPets
            const res = await request(buildApp())
                .get('/api/donations/stats')
                .set('Authorization', `Bearer ${tokenFor(1, 'admin')}`);
            expect(res.status).toBe(200);
            expect(res.body.total_clicks).toBe(120);
            expect(res.body.clicks_30d).toBe(34);
            expect(res.body.top_pets[0].pet_name).toBe('Rocky');
        });
    });
});
