import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';

vi.mock('../db.js', () => ({ default: { query: vi.fn() } }));

const { default: pool } = await import('../db.js');
const { default: reportRoutes } = await import('../routes/reportRoutes.js');
const { default: adminRoutes } = await import('../routes/adminRoutes.js');
const { isBlockedPair } = await import('../lib/socketHandlers.js');

const JWT_SECRET = process.env.JWT_SECRET;
const tokenFor = (id, role = 'user') => jwt.sign({ id, role }, JWT_SECRET);

const buildApp = () => {
    const app = express();
    app.use(express.json());
    app.use('/api/reports', reportRoutes);
    app.use('/api/admin', adminRoutes);
    return app;
};

describe('Reports & blocks', () => {
    beforeEach(() => {
        pool.query.mockReset();
    });

    describe('POST /api/reports', () => {
        it('crea denuncia + bloqueo cuando block=true', async () => {
            pool.query
                .mockResolvedValueOnce({ rows: [{ id: 99, status: 'pending', created_at: 'x' }] }) // INSERT report
                .mockResolvedValueOnce({ rows: [] }); // INSERT block
            const res = await request(buildApp())
                .post('/api/reports')
                .set('Authorization', `Bearer ${tokenFor(7)}`)
                .send({ reported_user_id: 12, reason: 'harassment', block: true });
            expect(res.status).toBe(201);
            expect(res.body).toEqual({ id: 99, blocked: true });
            // 2da query es el INSERT del bloqueo.
            expect(pool.query.mock.calls[1][0]).toMatch(/INSERT INTO user_blocks/);
            expect(pool.query.mock.calls[1][1]).toEqual([7, 12]);
        });

        it('sin block=true no inserta en user_blocks', async () => {
            pool.query.mockResolvedValueOnce({ rows: [{ id: 1, status: 'pending', created_at: 'x' }] });
            const res = await request(buildApp())
                .post('/api/reports')
                .set('Authorization', `Bearer ${tokenFor(7)}`)
                .send({ reported_user_id: 12, reason: 'spam' });
            expect(res.status).toBe(201);
            expect(res.body.blocked).toBe(false);
            expect(pool.query).toHaveBeenCalledTimes(1);
        });

        it('valida message_id: solo lo acepta si lo mandó el denunciado', async () => {
            pool.query
                .mockResolvedValueOnce({ rows: [{ content: 'insulto', sender_id: 12 }] }) // SELECT message
                .mockResolvedValueOnce({ rows: [{ id: 5, status: 'pending', created_at: 'x' }] }); // INSERT
            const res = await request(buildApp())
                .post('/api/reports')
                .set('Authorization', `Bearer ${tokenFor(7)}`)
                .send({ reported_user_id: 12, message_id: 55, reason: 'harassment' });
            expect(res.status).toBe(201);
            // El snapshot del contenido va en el INSERT (posición 5 = $5).
            const insertParams = pool.query.mock.calls[1][1];
            expect(insertParams[2]).toBe(55);       // message_id
            expect(insertParams[4]).toBe('insulto'); // message_snapshot
        });

        it('descarta message_id si el mensaje no es del denunciado', async () => {
            pool.query
                .mockResolvedValueOnce({ rows: [{ content: 'hola', sender_id: 999 }] }) // no es el reportado
                .mockResolvedValueOnce({ rows: [{ id: 6, status: 'pending', created_at: 'x' }] });
            const res = await request(buildApp())
                .post('/api/reports')
                .set('Authorization', `Bearer ${tokenFor(7)}`)
                .send({ reported_user_id: 12, message_id: 55, reason: 'harassment' });
            expect(res.status).toBe(201);
            const insertParams = pool.query.mock.calls[1][1];
            expect(insertParams[2]).toBe(null);  // message_id descartado
            expect(insertParams[4]).toBe(null);  // sin snapshot
        });

        it('400 si el motivo es inválido', async () => {
            const res = await request(buildApp())
                .post('/api/reports')
                .set('Authorization', `Bearer ${tokenFor(7)}`)
                .send({ reported_user_id: 12, reason: 'no_me_gusta' });
            expect(res.status).toBe(400);
        });

        it('400 al auto-denunciarse', async () => {
            const res = await request(buildApp())
                .post('/api/reports')
                .set('Authorization', `Bearer ${tokenFor(7)}`)
                .send({ reported_user_id: 7, reason: 'spam' });
            expect(res.status).toBe(400);
        });

        it('401 sin token', async () => {
            const res = await request(buildApp())
                .post('/api/reports')
                .send({ reported_user_id: 12, reason: 'spam' });
            expect(res.status).toBe(401);
        });
    });

    describe('blocks CRUD', () => {
        it('GET /blocks devuelve ids bloqueados', async () => {
            pool.query.mockResolvedValueOnce({ rows: [{ blocked_id: 3 }, { blocked_id: 8 }] });
            const res = await request(buildApp())
                .get('/api/reports/blocks')
                .set('Authorization', `Bearer ${tokenFor(7)}`);
            expect(res.status).toBe(200);
            expect(res.body.blocked_ids).toEqual([3, 8]);
        });

        it('DELETE /blocks/:userId desbloquea', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] });
            const res = await request(buildApp())
                .delete('/api/reports/blocks/8')
                .set('Authorization', `Bearer ${tokenFor(7)}`);
            expect(res.status).toBe(204);
            expect(pool.query.mock.calls[0][1]).toEqual([7, 8]);
        });
    });

    describe('admin', () => {
        it('GET /api/admin/reports lista para admin', async () => {
            pool.query
                .mockResolvedValueOnce({ rows: [{ role: 'admin' }] }) // requireAdmin
                .mockResolvedValueOnce({ rows: [{ id: 1, reason: 'scam', reporter_name: 'Ana' }] });
            const res = await request(buildApp())
                .get('/api/admin/reports')
                .set('Authorization', `Bearer ${tokenFor(1, 'admin')}`);
            expect(res.status).toBe(200);
            expect(res.body.reports[0].reason).toBe('scam');
        });

        it('GET /api/admin/reports 403 para non-admin', async () => {
            pool.query.mockResolvedValueOnce({ rows: [{ role: 'user' }] });
            const res = await request(buildApp())
                .get('/api/admin/reports')
                .set('Authorization', `Bearer ${tokenFor(7)}`);
            expect(res.status).toBe(403);
        });

        it('PATCH /api/admin/reports/:id cambia estado', async () => {
            pool.query
                .mockResolvedValueOnce({ rows: [{ role: 'admin' }] })
                .mockResolvedValueOnce({ rows: [{ id: 1, status: 'reviewed' }] });
            const res = await request(buildApp())
                .patch('/api/admin/reports/1')
                .set('Authorization', `Bearer ${tokenFor(1, 'admin')}`)
                .send({ status: 'reviewed' });
            expect(res.status).toBe(200);
            expect(res.body.status).toBe('reviewed');
        });

        it('PATCH rechaza status inválido', async () => {
            pool.query.mockResolvedValueOnce({ rows: [{ role: 'admin' }] });
            const res = await request(buildApp())
                .patch('/api/admin/reports/1')
                .set('Authorization', `Bearer ${tokenFor(1, 'admin')}`)
                .send({ status: 'banned' });
            expect(res.status).toBe(400);
        });
    });

    describe('isBlockedPair (enforcement helper)', () => {
        it('true si existe un bloqueo en cualquier dirección', async () => {
            const fakePool = { query: vi.fn().mockResolvedValueOnce({ rows: [{ '?column?': 1 }] }) };
            expect(await isBlockedPair(fakePool, 5, 9)).toBe(true);
        });
        it('false si no hay bloqueo', async () => {
            const fakePool = { query: vi.fn().mockResolvedValueOnce({ rows: [] }) };
            expect(await isBlockedPair(fakePool, 5, 9)).toBe(false);
        });
    });
});
