import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mocks para poder importar petController sin volar por deps externas
// del reportPet/searchPet. Sólo nos interesa notifyNearbyUsers.
vi.mock('../db.js', () => ({ default: { query: vi.fn() } }));
vi.mock('../ai.js', () => ({
    loadModel: vi.fn(),
    generateEmbedding: vi.fn(),
    generateEmbeddings: vi.fn(),
}));
vi.mock('../utils/geocode.js', () => ({
    reverseGeocode: vi.fn(),
    searchAddress: vi.fn(),
}));
vi.mock('../utils/push.js', () => ({ sendExpoPush: vi.fn() }));
vi.mock('cloudinary', () => ({ v2: { config: vi.fn() } }));

const { notifyNearbyUsers, notifyNearbyVets } = await import('../controllers/petController.js');

const makeDeps = () => {
    const emit = vi.fn();
    const io = { to: vi.fn(() => ({ emit })), _emit: emit };
    const sendExpoPush = vi.fn();
    const pool = { query: vi.fn() };
    return { pool, io, sendExpoPush };
};

const basePet = {
    id: 42, status: 'lost', type: 'dog', photo_url: 'https://cdn/x.jpg',
    name: 'Rocky', address: 'Pocitos, Montevideo',
    lat: -34.9128, lng: -56.1478,
};

describe('notifyNearbyUsers', () => {
    let deps;
    beforeEach(() => { deps = makeDeps(); });

    it('sin coords: no hace nada', async () => {
        await notifyNearbyUsers({ ...deps, newPet: { ...basePet, lat: null }, reporterId: 1 });
        expect(deps.pool.query).not.toHaveBeenCalled();
    });

    it('status distinto de lost/found: skip', async () => {
        await notifyNearbyUsers({ ...deps, newPet: { ...basePet, status: 'resolved' }, reporterId: 1 });
        expect(deps.pool.query).not.toHaveBeenCalled();
    });

    it('sin candidatos: no dispara push ni notification', async () => {
        deps.pool.query.mockResolvedValueOnce({ rows: [] }); // SELECT users cerca
        await notifyNearbyUsers({ ...deps, newPet: basePet, reporterId: 1 });
        expect(deps.pool.query).toHaveBeenCalledTimes(1); // sólo el SELECT
        expect(deps.sendExpoPush).not.toHaveBeenCalled();
    });

    it('lost: genera notif type=nearby_lost + push + socket para cada candidato', async () => {
        deps.pool.query
            .mockResolvedValueOnce({ rows: [{ id: 7, name: 'Ana', push_token: 'T1' }] })  // candidatos
            .mockResolvedValueOnce({ rows: [] })                                          // dedupe: no existe
            .mockResolvedValueOnce({                                                       // insert notif
                rows: [{ id: 100, user_id: 7, type: 'nearby_lost', data: {}, read_at: null, created_at: '' }],
            });

        await notifyNearbyUsers({ ...deps, newPet: basePet, reporterId: 1 });

        // 1) La query de candidatos usa haversine con el radio propio del user
        // (u.notify_radius_km) y filtra por el opt-in que corresponde al tipo
        // de reporte (notify_lost para lost) + fresh location + no reporter.
        // NO filtra por push_token — la notification se genera igual para users web-only.
        const [selectSql, selectParams] = deps.pool.query.mock.calls[0];
        expect(selectSql).toMatch(/u\.notify_lost = true/);
        expect(selectSql).toMatch(/last_location_at > NOW\(\) - INTERVAL '30 days'/);
        expect(selectSql).toMatch(/u\.id <> \$3/);
        expect(selectSql).toMatch(/6371 \* acos/); // haversine
        expect(selectSql).toMatch(/<= u\.notify_radius_km/);
        expect(selectSql).not.toMatch(/push_token IS NOT NULL/);
        expect(selectParams).toEqual([basePet.lat, basePet.lng, 1]); // sin radio hardcoded

        // 2) INSERT notification con type nearby_lost + payload correcto
        const [insertSql, insertParams] = deps.pool.query.mock.calls[2];
        expect(insertSql).toMatch(/INSERT INTO notifications/);
        expect(insertParams[0]).toBe(7);
        expect(insertParams[1]).toBe('nearby_lost');
        const data = JSON.parse(insertParams[2]);
        expect(data.pet_id).toBe(42);
        expect(data.pet_status).toBe('lost');
        expect(data.name).toBe('Rocky');

        // 3) Socket emit a la sala del user cercano
        expect(deps.io.to).toHaveBeenCalledWith('user_7');
        expect(deps.io._emit).toHaveBeenCalledWith(
            'new_match_notification',
            expect.objectContaining({ type: 'nearby_lost' })
        );

        // 4) Push
        expect(deps.sendExpoPush).toHaveBeenCalledWith('T1', expect.objectContaining({
            title: expect.stringMatching(/perdida/i),
            body: expect.stringContaining('Rocky'),
            data: expect.objectContaining({
                type: 'nearby_lost',
                pet_id: 42,
                receiver_id: 7,
            }),
        }));
    });

    it('found: type=nearby_found + filtra por notify_found + copy coherente', async () => {
        deps.pool.query
            .mockResolvedValueOnce({ rows: [{ id: 7, name: 'Ana', push_token: 'T1' }] })
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({ rows: [{ id: 100 }] });

        await notifyNearbyUsers({ ...deps, newPet: { ...basePet, status: 'found' }, reporterId: 1 });

        const [selectSql] = deps.pool.query.mock.calls[0];
        expect(selectSql).toMatch(/u\.notify_found = true/);
        const [, insertParams] = deps.pool.query.mock.calls[2];
        expect(insertParams[1]).toBe('nearby_found');
        expect(deps.sendExpoPush).toHaveBeenCalledWith('T1', expect.objectContaining({
            title: expect.stringMatching(/encontr/i),
        }));
    });

    it('dedupe: si ya hay notification del mismo pet para el user, skip insert + push', async () => {
        deps.pool.query
            .mockResolvedValueOnce({ rows: [{ id: 7, name: 'Ana', push_token: 'T1' }] })
            .mockResolvedValueOnce({ rows: [{ 1: 1 }] }); // exists

        await notifyNearbyUsers({ ...deps, newPet: basePet, reporterId: 1 });

        // Sólo 2 queries: candidatos + dedupe. NO se ejecuta el INSERT.
        expect(deps.pool.query).toHaveBeenCalledTimes(2);
        expect(deps.sendExpoPush).not.toHaveBeenCalled();
        expect(deps.io._emit).not.toHaveBeenCalled();
    });

    it('user sin push_token igual recibe la notification en el inbox (fix: web-only users)', async () => {
        deps.pool.query
            .mockResolvedValueOnce({ rows: [{ id: 7, name: 'Ana', push_token: null }] })  // sin push_token
            .mockResolvedValueOnce({ rows: [] })                                          // dedupe
            .mockResolvedValueOnce({ rows: [{ id: 100 }] });                              // insert notif

        await notifyNearbyUsers({ ...deps, newPet: basePet, reporterId: 1 });

        // Notification insertada + socket emit ok
        expect(deps.pool.query).toHaveBeenCalledTimes(3);
        expect(deps.io.to).toHaveBeenCalledWith('user_7');
        // Pero NO se dispara el push (no hay token)
        expect(deps.sendExpoPush).not.toHaveBeenCalled();
    });

    it('procesa múltiples candidatos en la misma corrida', async () => {
        deps.pool.query
            .mockResolvedValueOnce({
                rows: [
                    { id: 7, name: 'Ana', push_token: 'T1' },
                    { id: 8, name: 'Beto', push_token: 'T2' },
                ],
            })
            .mockResolvedValueOnce({ rows: [] })                                        // dedupe u7
            .mockResolvedValueOnce({ rows: [{ id: 100 }] })                             // insert u7
            .mockResolvedValueOnce({ rows: [] })                                        // dedupe u8
            .mockResolvedValueOnce({ rows: [{ id: 101 }] });                            // insert u8

        await notifyNearbyUsers({ ...deps, newPet: basePet, reporterId: 1 });
        expect(deps.sendExpoPush).toHaveBeenCalledTimes(2);
    });
});

describe('notifyNearbyVets', () => {
    let deps;
    beforeEach(() => { deps = makeDeps(); });

    it('sin coords: no hace nada', async () => {
        await notifyNearbyVets({ ...deps, newPet: { ...basePet, lat: null }, reporterId: 1 });
        expect(deps.pool.query).not.toHaveBeenCalled();
    });

    it('status distinto de lost/found: skip', async () => {
        await notifyNearbyVets({ ...deps, newPet: { ...basePet, status: 'resolved' }, reporterId: 1 });
        expect(deps.pool.query).not.toHaveBeenCalled();
    });

    it('sin candidatos: no dispara push', async () => {
        deps.pool.query.mockResolvedValueOnce({ rows: [] });
        await notifyNearbyVets({ ...deps, newPet: basePet, reporterId: 1 });
        expect(deps.pool.query).toHaveBeenCalledTimes(1);
        expect(deps.sendExpoPush).not.toHaveBeenCalled();
    });

    it('lost: filtra por receives_lost + approved + radio propio (haversine)', async () => {
        deps.pool.query.mockResolvedValueOnce({ rows: [] });
        await notifyNearbyVets({ ...deps, newPet: basePet, reporterId: 1 });
        const sql = deps.pool.query.mock.calls[0][0];
        expect(sql).toMatch(/v\.approved = TRUE/);
        expect(sql).toMatch(/v\.receives_lost = TRUE/);
        expect(sql).toMatch(/<= v\.alert_radius_km/);
        expect(sql).toMatch(/6371 \* acos/);
    });

    it('found: filtra por receives_found', async () => {
        deps.pool.query.mockResolvedValueOnce({ rows: [] });
        await notifyNearbyVets({ ...deps, newPet: { ...basePet, status: 'found' }, reporterId: 1 });
        expect(deps.pool.query.mock.calls[0][0]).toMatch(/v\.receives_found = TRUE/);
    });

    it('excluye vet cuyo owner es el reporter', async () => {
        deps.pool.query.mockResolvedValueOnce({ rows: [] });
        await notifyNearbyVets({ ...deps, newPet: basePet, reporterId: 42 });
        const [, params] = deps.pool.query.mock.calls[0];
        expect(params[2]).toBe(42); // reporterId
        expect(deps.pool.query.mock.calls[0][0]).toMatch(/v\.owner_user_id <> \$3/);
    });

    it('happy path: crea notif type=nearby_vet_lost, socket al owner, push si hay token', async () => {
        deps.pool.query
            .mockResolvedValueOnce({
                rows: [{ vet_id: 5, vet_name: 'Vet Amigo', vet_slug: 'vet-amigo', owner_user_id: 10, push_token: 'T-vet' }],
            })
            .mockResolvedValueOnce({ rows: [] }) // dedupe: no existe
            .mockResolvedValueOnce({
                rows: [{ id: 200, user_id: 10, type: 'nearby_vet_lost', data: {}, read_at: null, created_at: '' }],
            });

        await notifyNearbyVets({ ...deps, newPet: basePet, reporterId: 1 });

        expect(deps.pool.query.mock.calls[2][0]).toMatch(/INSERT INTO notifications/);
        expect(deps.pool.query.mock.calls[2][1][0]).toBe(10); // notif user_id = owner
        expect(deps.pool.query.mock.calls[2][1][1]).toBe('nearby_vet_lost');
        expect(deps.io.to).toHaveBeenCalledWith('user_10');
        expect(deps.sendExpoPush).toHaveBeenCalledWith('T-vet', expect.objectContaining({
            data: expect.objectContaining({ type: 'nearby_vet_lost', pet_id: 42, vet_id: 5 }),
        }));
    });

    it('dedupe: si ya existe notif del pet a la vet, no re-inserta ni push', async () => {
        deps.pool.query
            .mockResolvedValueOnce({
                rows: [{ vet_id: 5, vet_name: 'X', vet_slug: 'x', owner_user_id: 10, push_token: 'T' }],
            })
            .mockResolvedValueOnce({ rows: [{ 1: 1 }] }); // dedupe: existe

        await notifyNearbyVets({ ...deps, newPet: basePet, reporterId: 1 });
        expect(deps.pool.query).toHaveBeenCalledTimes(2); // no llegó al INSERT
        expect(deps.sendExpoPush).not.toHaveBeenCalled();
    });

    it('sin push_token: guarda notif pero no manda push (para dashboard/inbox)', async () => {
        deps.pool.query
            .mockResolvedValueOnce({
                rows: [{ vet_id: 5, vet_name: 'X', vet_slug: 'x', owner_user_id: 10, push_token: null }],
            })
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({
                rows: [{ id: 200, user_id: 10, type: 'nearby_vet_lost', data: {}, read_at: null, created_at: '' }],
            });

        await notifyNearbyVets({ ...deps, newPet: basePet, reporterId: 1 });
        expect(deps.sendExpoPush).not.toHaveBeenCalled();
        expect(deps.io.to).toHaveBeenCalledWith('user_10'); // socket sí (útil para web)
    });
});
