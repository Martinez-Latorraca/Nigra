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
// requireAdmin consulta la DB para saber el rol. Lo dejamos real (no mockeado)
// para que el test verifique el 403 cuando no sos admin.

const { default: pool } = await import('../db.js');
const { default: adminRoutes } = await import('../routes/adminRoutes.js');

const buildApp = () => {
    const app = express();
    app.use(express.json());
    app.use('/api/admin', adminRoutes);
    return app;
};

// Helper: primer mock devuelve el rol admin (para requireAdmin).
const mockAdminRole = () => pool.query.mockResolvedValueOnce({ rows: [{ role: 'admin' }] });

describe('Admin', () => {
    beforeEach(() => {
        pool.query.mockReset();
    });

    describe('requireAdmin middleware', () => {
        it('401 si no hay auth', async () => {
            const res = await request(buildApp()).get('/api/admin/stats');
            expect(res.status).toBe(401);
        });

        it('403 si el user no es admin', async () => {
            pool.query.mockResolvedValueOnce({ rows: [{ role: 'user' }] });
            const res = await request(buildApp()).get('/api/admin/stats').set('x-test-user', '2');
            expect(res.status).toBe(403);
        });

        it('404 si el user id no existe', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] });
            const res = await request(buildApp()).get('/api/admin/stats').set('x-test-user', '999');
            expect(res.status).toBe(404);
        });
    });

    describe('GET /api/admin/stats', () => {
        it('devuelve counts y listas recientes', async () => {
            mockAdminRole();
            // 5 counts en paralelo
            pool.query
                .mockResolvedValueOnce({ rows: [{ count: '10' }] })
                .mockResolvedValueOnce({ rows: [{ count: '25' }] })
                .mockResolvedValueOnce({ rows: [{ count: '100' }] })
                .mockResolvedValueOnce({ rows: [{ count: '15' }] })
                .mockResolvedValueOnce({ rows: [{ count: '10' }] })
                // recentPets
                .mockResolvedValueOnce({ rows: [{ id: 1, name: 'Rocky' }] })
                // recentUsers
                .mockResolvedValueOnce({ rows: [{ id: 1, name: 'Ana' }] });
            const res = await request(buildApp()).get('/api/admin/stats').set('x-test-user', '1');
            expect(res.status).toBe(200);
            expect(res.body.totalUsers).toBe(10);
            expect(res.body.totalPets).toBe(25);
            expect(res.body.totalMessages).toBe(100);
            expect(res.body.totalLost).toBe(15);
            expect(res.body.totalFound).toBe(10);
            expect(res.body.recentPets[0].name).toBe('Rocky');
            expect(res.body.recentUsers[0].name).toBe('Ana');
        });
    });

    describe('GET /api/admin/users', () => {
        it('devuelve users paginados sin search', async () => {
            mockAdminRole();
            pool.query
                .mockResolvedValueOnce({ rows: [{ count: '2' }] })
                .mockResolvedValueOnce({ rows: [{ id: 1, name: 'Ana' }, { id: 2, name: 'Beto' }] });
            const res = await request(buildApp())
                .get('/api/admin/users?page=1&limit=20')
                .set('x-test-user', '1');
            expect(res.status).toBe(200);
            expect(res.body.total).toBe(2);
            expect(res.body.users).toHaveLength(2);
        });

        it('filtra con ?search=', async () => {
            mockAdminRole();
            pool.query
                .mockResolvedValueOnce({ rows: [{ count: '1' }] })
                .mockResolvedValueOnce({ rows: [{ id: 1, name: 'Ana', email: 'ana@x.com' }] });
            const res = await request(buildApp())
                .get('/api/admin/users?search=ana')
                .set('x-test-user', '1');
            expect(res.status).toBe(200);
            // El primer query (count) debe tener el ILIKE bindeado
            const [, countParams] = pool.query.mock.calls[1];
            expect(countParams[0]).toBe('%ana%');
        });
    });

    describe('PATCH /api/admin/users/:id/role', () => {
        it('actualiza el rol', async () => {
            mockAdminRole();
            pool.query.mockResolvedValueOnce({
                rows: [{ id: 5, name: 'X', email: 'x@x.com', role: 'admin' }],
            });
            const res = await request(buildApp())
                .patch('/api/admin/users/5/role')
                .set('x-test-user', '1')
                .send({ role: 'admin' });
            expect(res.status).toBe(200);
            expect(res.body.user.role).toBe('admin');
        });

        it('rechaza cambiar el propio rol', async () => {
            mockAdminRole();
            const res = await request(buildApp())
                .patch('/api/admin/users/1/role')
                .set('x-test-user', '1')
                .send({ role: 'user' });
            expect(res.status).toBe(400);
        });

        it('404 si el user no existe', async () => {
            mockAdminRole();
            pool.query.mockResolvedValueOnce({ rows: [] });
            const res = await request(buildApp())
                .patch('/api/admin/users/999/role')
                .set('x-test-user', '1')
                .send({ role: 'user' });
            expect(res.status).toBe(404);
        });

        it('400 si el rol es inválido (schema)', async () => {
            mockAdminRole();
            const res = await request(buildApp())
                .patch('/api/admin/users/5/role')
                .set('x-test-user', '1')
                .send({ role: 'superadmin' });
            expect(res.status).toBe(400);
        });
    });

    describe('DELETE /api/admin/users/:id', () => {
        it('borra el user + sus mensajes + sus mascotas', async () => {
            mockAdminRole();
            pool.query
                .mockResolvedValueOnce({ rows: [{ role: 'user' }] })   // userCheck
                .mockResolvedValueOnce({ rowCount: 3 })                // delete messages
                .mockResolvedValueOnce({ rowCount: 1 })                // delete pets
                .mockResolvedValueOnce({ rowCount: 1 });               // delete user
            const res = await request(buildApp())
                .delete('/api/admin/users/5')
                .set('x-test-user', '1');
            expect(res.status).toBe(200);
        });

        it('rechaza autoeliminación', async () => {
            mockAdminRole();
            const res = await request(buildApp())
                .delete('/api/admin/users/1')
                .set('x-test-user', '1');
            expect(res.status).toBe(400);
        });

        it('rechaza eliminar a otro admin', async () => {
            mockAdminRole();
            pool.query.mockResolvedValueOnce({ rows: [{ role: 'admin' }] });
            const res = await request(buildApp())
                .delete('/api/admin/users/2')
                .set('x-test-user', '1');
            expect(res.status).toBe(400);
        });

        it('404 si el user no existe', async () => {
            mockAdminRole();
            pool.query.mockResolvedValueOnce({ rows: [] });
            const res = await request(buildApp())
                .delete('/api/admin/users/999')
                .set('x-test-user', '1');
            expect(res.status).toBe(404);
        });
    });

    describe('GET /api/admin/pets', () => {
        it('lista mascotas con filtros', async () => {
            mockAdminRole();
            pool.query
                .mockResolvedValueOnce({ rows: [{ count: '1' }] })
                .mockResolvedValueOnce({ rows: [{ id: 1, name: 'Rocky', status: 'lost' }] });
            const res = await request(buildApp())
                .get('/api/admin/pets?status=lost&type=perro')
                .set('x-test-user', '1');
            expect(res.status).toBe(200);
            expect(res.body.pets).toHaveLength(1);
            // Params bindeados en el count
            const [, countParams] = pool.query.mock.calls[1];
            expect(countParams).toEqual(['lost', 'perro']);
        });
    });

    describe('DELETE /api/admin/pets/:id', () => {
        it('borra reporte + mensajes asociados', async () => {
            mockAdminRole();
            pool.query
                .mockResolvedValueOnce({ rowCount: 5 })                    // delete messages
                .mockResolvedValueOnce({ rows: [{ id: 1 }] });             // delete pet returning
            const res = await request(buildApp())
                .delete('/api/admin/pets/1')
                .set('x-test-user', '1');
            expect(res.status).toBe(200);
        });

        it('404 si la mascota no existe', async () => {
            mockAdminRole();
            pool.query
                .mockResolvedValueOnce({ rowCount: 0 })
                .mockResolvedValueOnce({ rows: [] });
            const res = await request(buildApp())
                .delete('/api/admin/pets/999')
                .set('x-test-user', '1');
            expect(res.status).toBe(404);
        });
    });

    describe('GET /api/admin/conversations', () => {
        it('lista conversaciones agrupadas', async () => {
            mockAdminRole();
            pool.query
                .mockResolvedValueOnce({ rows: [{ count: '1' }] })
                .mockResolvedValueOnce({
                    rows: [{
                        pet_id: 1, user_a_id: 2, user_b_id: 7,
                        user_a_name: 'Ana', user_b_name: 'Beto',
                        pet_name: 'Rocky', message_count: '5',
                        last_message_at: new Date().toISOString(),
                    }],
                });
            const res = await request(buildApp())
                .get('/api/admin/conversations')
                .set('x-test-user', '1');
            expect(res.status).toBe(200);
            expect(res.body.conversations).toHaveLength(1);
            expect(res.body.conversations[0].pet_name).toBe('Rocky');
        });
    });

    describe('GET /api/admin/conversations/:pet_id/:user_a/:user_b', () => {
        it('devuelve los mensajes de la conversación', async () => {
            mockAdminRole();
            pool.query.mockResolvedValueOnce({
                rows: [
                    { id: 1, content: 'A', sender_id: 2, receiver_id: 7 },
                    { id: 2, content: 'B', sender_id: 7, receiver_id: 2 },
                ],
            });
            const res = await request(buildApp())
                .get('/api/admin/conversations/1/2/7')
                .set('x-test-user', '1');
            expect(res.status).toBe(200);
            expect(res.body.messages).toHaveLength(2);
        });
    });

    describe('DELETE /api/admin/messages/:id', () => {
        it('borra el mensaje', async () => {
            mockAdminRole();
            pool.query.mockResolvedValueOnce({ rows: [{ id: 42 }] });
            const res = await request(buildApp())
                .delete('/api/admin/messages/42')
                .set('x-test-user', '1');
            expect(res.status).toBe(200);
        });

        it('404 si el mensaje no existe', async () => {
            mockAdminRole();
            pool.query.mockResolvedValueOnce({ rows: [] });
            const res = await request(buildApp())
                .delete('/api/admin/messages/999')
                .set('x-test-user', '1');
            expect(res.status).toBe(404);
        });
    });
});
